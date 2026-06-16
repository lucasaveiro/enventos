'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import * as clicksign from '@/lib/clicksign'
import { SPACES, resolveContractSpaceSlug } from '@/lib/contractTemplates'

// ── Formatação de telefone ──────────────────────────────────────────────────

function formatPhoneForClicksign(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  // Remove código do país 55 se presente
  if (digits.startsWith('55') && digits.length >= 12) return digits.slice(2)
  return digits
}

// Clicksign valida CPF/CNPJ por dígitos; máscaras (000.000.000-00) são rejeitadas como inválido.
function cleanDocument(doc: string): string {
  return (doc || '').replace(/\D/g, '')
}

// ── Enviar contrato para Clicksign ──────────────────────────────────────────

interface SendContractParams {
  eventId: number
  contractNumber: string
  spaceId: string
  clientName: string
  clientPhone: string
  clientEmail: string
  clientCPF: string
  pdfBase64: string
  deadlineDays?: number
  // Dados do contratado (para assinatura do proprietário/locador)
  contractorName: string
  contractorPhone: string
  contractorEmail: string
  contractorCPF: string
}

export async function sendContractToClicksign(params: SendContractParams) {
  // Verifica se o evento existe
  const event = await prisma.event.findUnique({ where: { id: params.eventId } })
  if (!event) return { success: false, error: 'Evento não encontrado' }

  // Verifica se já existe assinatura ativa
  const existing = await prisma.contractSignature.findFirst({
    where: {
      eventId: params.eventId,
      status: { notIn: ['cancelled'] },
    },
  })
  if (existing) {
    return { success: false, error: 'Já existe um contrato enviado para este evento' }
  }

  // Calcula deadline
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + (params.deadlineDays || 30))
  const deadlineAt = deadline.toISOString()

  // Garante formato correto do base64
  const contentBase64 = params.pdfBase64.startsWith('data:')
    ? params.pdfBase64
    : `data:application/pdf;base64,${params.pdfBase64}`

  // Step 1: Upload document (antes de qualquer registro local — falha aqui não suja o banco)
  let documentKey: string
  try {
    const uploaded = await clicksign.uploadDocument({
      path: `/contratos/${params.contractNumber}.pdf`,
      contentBase64,
      deadlineAt,
    })
    documentKey = uploaded.documentKey
  } catch (error) {
    console.error('Erro ao enviar contrato para Clicksign (upload):', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao fazer upload do documento',
    }
  }

  // Cria registro parcial (para recuperação em caso de falha)
  const signature = await prisma.contractSignature.create({
    data: {
      documentKey,
      contractNumber: params.contractNumber,
      spaceId: params.spaceId,
      clientName: params.clientName,
      clientPhone: params.clientPhone,
      clientEmail: params.clientEmail || undefined,
      clientCPF: params.clientCPF,
      status: 'uploaded',
      eventId: params.eventId,
    },
  })

  // A partir daqui, qualquer falha precisa fazer rollback (cancelar documento e marcar
  // signature como cancelled) para não bloquear novos envios com registros órfãos.
  try {
    // Step 2: Create signer
    const phoneFormatted = formatPhoneForClicksign(params.clientPhone)
    const clientCPFClean = cleanDocument(params.clientCPF)
    const { signerKey } = await clicksign.createSigner({
      email: params.clientEmail || `${phoneFormatted}@noemail.clicksign.com`,
      phoneNumber: phoneFormatted,
      name: params.clientName,
      documentation: clientCPFClean,
    })

    await prisma.contractSignature.update({
      where: { id: signature.id },
      data: { signerKey, status: 'signer_added' },
    })

    // Step 3: Add client signer to document
    const { requestSignatureKey, url } = await clicksign.addSignerToDocument({
      documentKey,
      signerKey,
    })

    await prisma.contractSignature.update({
      where: { id: signature.id },
      data: { requestSignatureKey, signingUrl: url },
    })

    // Step 4: Create contractor signer (contratado/proprietário)
    const contractorPhoneFormatted = formatPhoneForClicksign(params.contractorPhone)
    const contractorCPFClean = cleanDocument(params.contractorCPF)
    const { signerKey: contractorSignerKey } = await clicksign.createSigner({
      email: params.contractorEmail || `${contractorPhoneFormatted}@noemail.clicksign.com`,
      phoneNumber: contractorPhoneFormatted,
      name: params.contractorName,
      documentation: contractorCPFClean,
    })

    // Step 5: Add contractor signer to document
    const { requestSignatureKey: contractorReqKey } = await clicksign.addSignerToDocument({
      documentKey,
      signerKey: contractorSignerKey,
    })

    // Step 6: Send WhatsApp notifications to both signers
    await clicksign.notifyByWhatsapp(requestSignatureKey)
    await clicksign.notifyByWhatsapp(contractorReqKey)

    // Update status
    await prisma.contractSignature.update({
      where: { id: signature.id },
      data: { status: 'sent_whatsapp' },
    })

    // Update event contract status
    await prisma.event.update({
      where: { id: params.eventId },
      data: { contractStatus: 'sent' },
    })

    revalidatePath('/')
    revalidatePath(`/contracts`)
    revalidatePath(`/events`)

    return {
      success: true,
      data: {
        signatureId: signature.id,
        signingUrl: url,
        status: 'sent_whatsapp',
      },
    }
  } catch (error) {
    console.error('Erro ao enviar contrato para Clicksign (rollback):', error)

    // Rollback: tenta cancelar o documento no Clicksign e marca como cancelled localmente,
    // evitando que o evento fique bloqueado com signature órfã em estado parcial.
    try {
      await clicksign.cancelDocument(documentKey)
    } catch (cancelErr) {
      console.error('Erro ao cancelar documento no Clicksign durante rollback:', cancelErr)
    }

    try {
      await prisma.contractSignature.update({
        where: { id: signature.id },
        data: { status: 'cancelled' },
      })
    } catch (dbErr) {
      console.error('Erro ao marcar signature como cancelled durante rollback:', dbErr)
    }

    revalidatePath('/')
    revalidatePath(`/contracts`)
    revalidatePath(`/events`)
    revalidatePath(`/events/${params.eventId}`)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao enviar contrato',
    }
  }
}

// ── Cancelar contrato no Clicksign ──────────────────────────────────────────

export async function cancelContractSignature(eventId: number) {
  try {
    const signature = await prisma.contractSignature.findFirst({
      where: {
        eventId,
        status: { notIn: ['cancelled'] },
      },
    })

    if (!signature) {
      return { success: false, error: 'Nenhum contrato ativo encontrado para este evento' }
    }

    // Só tenta cancelar no Clicksign se o documento ainda não foi assinado/fechado
    if (!['signed', 'closed'].includes(signature.status)) {
      try {
        await clicksign.cancelDocument(signature.documentKey)
      } catch (err) {
        console.error('Erro ao cancelar no Clicksign (continuando cancelamento local):', err)
      }
    }

    // Atualiza status local
    await prisma.$transaction([
      prisma.contractSignature.update({
        where: { id: signature.id },
        data: { status: 'cancelled' },
      }),
      prisma.event.update({
        where: { id: eventId },
        data: { contractStatus: 'not_sent' },
      }),
    ])

    revalidatePath('/')
    revalidatePath('/events')
    revalidatePath(`/events/${eventId}`)
    revalidatePath('/contracts')

    return { success: true }
  } catch (error) {
    console.error('Erro ao cancelar contrato:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao cancelar contrato',
    }
  }
}

// ── Reenviar link de assinatura (sem cancelar/recriar) ──────────────────────

export async function resendSignatureLink(eventId: number) {
  try {
    const signature = await prisma.contractSignature.findFirst({
      where: {
        eventId,
        status: { notIn: ['cancelled'] },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!signature) {
      return { success: false, error: 'Nenhum contrato ativo encontrado para este evento' }
    }

    // 'closed' = documento finalizado na Clicksign (todos assinaram). 'signed' NÃO
    // significa totalmente assinado: a Clicksign emite o evento `sign` a cada assinatura
    // individual, então com 2 signatários o status vira 'signed' assim que UM assina,
    // mesmo faltando o outro (ex.: o contratante). Por isso só bloqueamos 'closed' aqui;
    // para 'signed' seguimos e deixamos a checagem real de pendentes (getDocument abaixo,
    // que filtra signatários sem `signature`) decidir se há a quem reenviar.
    if (signature.status === 'closed') {
      return {
        success: false,
        error: 'Este contrato já foi finalizado. Não é necessário reenviar.',
      }
    }

    // Busca o documento atual no Clicksign (status + signatários)
    const doc = await clicksign.getDocument(signature.documentKey)

    if (doc.status === 'closed' || doc.status === 'canceled') {
      return {
        success: false,
        error:
          'O documento foi finalizado ou cancelado no Clicksign e não pode ser reaproveitado. Gere um novo contrato.',
      }
    }

    // Prorroga o prazo para 30 dias a partir de hoje (reativa o link)
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + 30)
    await clicksign.updateDocumentDeadline(signature.documentKey, deadline.toISOString())

    // Reenvia apenas para quem ainda não assinou
    const pending = doc.signers.filter((s) => !s.signature)
    if (pending.length === 0) {
      return { success: false, error: 'Todos os signatários já assinaram. Nada a reenviar.' }
    }

    const results = await Promise.all(
      pending.map(async (signer) => {
        try {
          await clicksign.notifyByWhatsapp(signer.request_signature_key)
          return { name: signer.name, ok: true as const }
        } catch (err) {
          return {
            name: signer.name,
            ok: false as const,
            error: err instanceof Error ? err.message : 'erro desconhecido',
          }
        }
      })
    )

    const delivered = results.filter((r) => r.ok)
    if (delivered.length === 0) {
      const reasons = results.map((r) => (r.ok ? '' : r.error)).filter(Boolean).join('; ')
      return { success: false, error: `Falha ao reenviar notificações: ${reasons}` }
    }

    // Registra o reenvio no log e reativa o status local
    const log: Array<Record<string, unknown>> = signature.webhookLog
      ? JSON.parse(signature.webhookLog)
      : []
    log.push({
      event: 'resend_signature',
      at: new Date().toISOString(),
      recipients: delivered.map((r) => r.name),
      newDeadline: deadline.toISOString(),
    })

    await prisma.contractSignature.update({
      where: { id: signature.id },
      data: { status: 'sent_whatsapp', webhookLog: JSON.stringify(log) },
    })

    await prisma.event.update({
      where: { id: eventId },
      data: { contractStatus: 'sent' },
    })

    revalidatePath('/')
    revalidatePath('/events')
    revalidatePath(`/events/${eventId}`)
    revalidatePath('/contracts')

    return {
      success: true,
      data: {
        recipients: delivered.map((r) => r.name),
        newDeadline: deadline.toISOString(),
      },
    }
  } catch (error) {
    console.error('Erro ao reenviar link de assinatura:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao reenviar link de assinatura',
    }
  }
}

// ── Progresso de assinaturas (estado real por signatário no Clicksign) ───────

// Consulta o documento no Clicksign e devolve quem já assinou e quem está
// pendente. O status local (ContractSignature.status) é movido só por webhook
// (push) e a Clicksign emite o evento `sign` a CADA assinatura individual — então
// "signed" pode significar "1 de 2 assinaram". Aqui buscamos a verdade signatário
// a signatário (campo `signature` presente = assinou) e, de quebra, reconciliamos
// o status local quando ele ficou defasado (ex.: webhook `close` perdido).
export async function getSignatureProgress(eventId: number) {
  try {
    const signature = await prisma.contractSignature.findFirst({
      where: { eventId, status: { notIn: ['cancelled'] } },
      orderBy: { createdAt: 'desc' },
    })

    // Sem contrato ativo, ou ainda em envio incompleto (signatários podem nem ter
    // sido adicionados na Clicksign): nada a exibir. Também evita bater na API da
    // Clicksign à toa em todo carregamento de evento sem contrato enviado.
    if (!signature || !['sent_whatsapp', 'signed', 'closed'].includes(signature.status)) {
      return { success: true as const, data: null }
    }

    const doc = await clicksign.getDocument(signature.documentKey)

    // Documento cancelado na Clicksign: está morto e não há progresso a exibir.
    // Não promovemos o status por causa de uma assinatura avulsa que possa ter
    // ficado registrada — isso inverteria a verdade. O cancelamento explícito
    // (botão / webhook `cancel`) e o fluxo de reenvio cuidam do registro local.
    if (doc.status === 'canceled') {
      return { success: true as const, data: null }
    }

    const signers = doc.signers.map((s) => ({
      name: s.name || s.email || 'Signatário',
      email: s.email || '',
      signAs: s.sign_as || '',
      signed: !!s.signature,
    }))

    const signedCount = signers.filter((s) => s.signed).length
    const totalCount = signers.length
    const allSigned = totalCount > 0 && signedCount === totalCount

    // Reconciliação: a consulta ao documento é a fonte real. Corrige o status local
    // só "para frente" (nunca rebaixa) quando ele estiver atrás da realidade.
    let reconciledStatus = signature.status
    if (doc.status === 'closed') {
      reconciledStatus = 'closed'
    } else if (doc.status === 'running' && signedCount > 0 && signature.status === 'sent_whatsapp') {
      reconciledStatus = 'signed'
    }

    if (reconciledStatus !== signature.status) {
      // As duas escritas vão numa única transação, e o update do evento é
      // condicionado ao registro ainda estar ativo (notIn['cancelled']). Assim, se
      // o usuário cancelar o contrato enquanto este getDocument (lento) estava em
      // andamento, ou o updateMany vira no-op (cancelamento veio antes), ou o lock
      // de linha serializa o cancelamento para depois desta transação (vem depois e
      // vence) — nunca "ressuscitamos" o contrato nem deixamos Event.contractStatus
      // dessincronizado entre as duas gravações.
      const applied = await prisma.$transaction(async (tx) => {
        const updated = await tx.contractSignature.updateMany({
          where: { id: signature.id, status: { notIn: ['cancelled'] } },
          data: { status: reconciledStatus },
        })
        if (updated.count === 0) return false
        await tx.event.update({
          where: { id: eventId },
          data: { contractStatus: 'signed' },
        })
        return true
      })

      if (applied) {
        revalidatePath('/')
        revalidatePath('/events')
        revalidatePath(`/events/${eventId}`)
        revalidatePath('/contracts')
      }
    }

    return {
      success: true as const,
      data: {
        docStatus: doc.status,
        signedCount,
        totalCount,
        allSigned,
        reconciledStatus,
        signers,
      },
    }
  } catch (error) {
    console.error('Erro ao buscar progresso de assinaturas:', error)
    // Falha ao consultar a Clicksign não deve quebrar a página do evento.
    return { success: false as const, error: 'Erro ao buscar progresso de assinaturas' }
  }
}

// ── Buscar assinatura do contrato ───────────────────────────────────────────

export async function getContractSignature(eventId: number) {
  try {
    const signature = await prisma.contractSignature.findFirst({
      where: {
        eventId,
        status: { notIn: ['cancelled'] },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, data: signature }
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error)
    return { success: false, error: 'Erro ao buscar assinatura' }
  }
}

// ── Listar eventos para vincular ao contrato ────────────────────────────────

export async function getEventsForContractLinking(spaceSlug?: string) {
  try {
    // Quando um espaço é informado, restringe a lista APENAS aos eventos daquele
    // espaço. Isso impede vincular, por engano, um contrato de um espaço a um
    // evento de outro (origem da mistura de cláusulas). A resolução casa por
    // slug persistido e, como reforço, pelo nome de exibição configurado.
    let spaceIds: number[] | undefined
    if (spaceSlug) {
      const cfg = SPACES[spaceSlug]
      const spaces = await prisma.space.findMany({
        where: {
          OR: [
            { slug: spaceSlug },
            ...(cfg ? [{ name: cfg.displayName }] : []),
          ],
        },
        select: { id: true },
      })
      // Só aplica o filtro se conseguiu resolver o espaço; caso contrário mantém
      // a lista completa (a tela ainda valida o espaço de cada evento ao gerar).
      if (spaces.length > 0) spaceIds = spaces.map((s) => s.id)
    }

    const events = await prisma.event.findMany({
      where: {
        category: 'event',
        ...(spaceIds ? { spaceId: { in: spaceIds } } : {}),
      },
      include: {
        client: true,
        space: true,
      },
      orderBy: { start: 'desc' },
      take: 50,
    })

    const serialized = events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start.toISOString(),
      clientName: e.client?.name || 'Sem cliente',
      clientPhone: e.client?.phone || '',
      clientEmail: e.client?.email || '',
      spaceName: e.space.name,
      spaceId: e.spaceId,
      spaceSlug: resolveContractSpaceSlug({ spaceId: e.spaceId, slug: e.space.slug, name: e.space.name }),
      contractStatus: e.contractStatus,
      totalValue: e.totalValue.toNumber(),
      deposit: e.deposit.toNumber(),
    }))

    return { success: true, data: serialized }
  } catch (error) {
    console.error('Erro ao buscar eventos:', error)
    return { success: false, error: 'Erro ao buscar eventos' }
  }
}
