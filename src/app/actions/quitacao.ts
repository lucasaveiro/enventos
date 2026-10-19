'use server'

import { createHash } from 'crypto'
import { put, del } from '@vercel/blob'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { SPACES, resolveContractSpaceSlug } from '@/lib/contractTemplates'
import { paymentMethodLabel } from '@/lib/paymentMethods'
import { computeEventPaid } from '@/lib/eventPaid'
import { todasParcelasPagas, type QuitacaoData, type QuitacaoPagamento } from '@/lib/quitacao'

// ── Declaração de Quitação ──────────────────────────────────────────────────
// Monta, no servidor, tudo o que o PDF precisa. A validação é refeita aqui
// (e não só na tela) porque o documento tem efeito jurídico: ele só pode ser
// emitido quando TODAS as parcelas estão pagas e o total recebido cobre o
// valor contratado. Emitir quitação com saldo em aberto seria renunciar à
// cobrança do restante.

const TZ = 'America/Sao_Paulo'

type Resultado = { success: true; data: QuitacaoData } | { success: false; error: string }

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

function dataCurta(date: Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function dataHora(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function dataLonga(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

// Datas gravadas pelo wizard como "aaaa-mm-dd".
function dataIsoCurta(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const [y, m, d] = value.split('-')
  if (!y || !m || !d) return null
  return `${d}/${m}/${y}`
}

function texto(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

// Tipo do evento: o cadastro guarda tanto códigos ("confraternizacao") quanto
// texto livre vindo do wizard do contrato. Capitaliza o que vier.
const TIPOS_EVENTO: Record<string, string> = {
  casamento: 'Casamento',
  aniversario: 'Aniversário',
  confraternizacao: 'Confraternização',
  debutante: 'Festa de debutante',
  outros: '',
}
// "no Rancho Aveiro", "na Estância Aveiro".
const ARTIGO_ESPACO: Record<string, 'o' | 'a'> = {
  'rancho-aveiro': 'o',
  'estancia-aveiro': 'a',
}

function rotuloTipoEvento(value: string): string {
  const key = value.trim().toLowerCase()
  if (key in TIPOS_EVENTO) return TIPOS_EVENTO[key]
  return value.trim()
}

export async function getQuitacaoData(eventId: number): Promise<Resultado> {
  await requireAuth()
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        client: true,
        space: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
        transactions: {
          where: { type: 'income', status: 'paid' },
          orderBy: { paidAt: 'asc' },
        },
        generatedContracts: { orderBy: { version: 'desc' }, take: 1 },
        contractSignatures: {
          where: { status: { notIn: ['cancelled'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!event) return { success: false, error: 'Evento não encontrado' }
    if (event.category !== 'event') {
      return { success: false, error: 'Somente eventos com plano de pagamento podem ter quitação emitida' }
    }

    const installments = event.installments.map((i) => ({
      id: i.id,
      status: i.status,
      amount: i.amount.toNumber(),
      paidAmount: i.paidAmount ? i.paidAmount.toNumber() : null,
      transactionId: i.transactionId,
      installmentNumber: i.installmentNumber,
      isSinal: i.isSinal,
      dueDate: i.dueDate,
      paidAt: i.paidAt,
      paymentMethod: i.paymentMethod,
    }))

    if (!todasParcelasPagas(installments)) {
      return { success: false, error: 'A quitação só pode ser emitida quando todas as parcelas estiverem pagas' }
    }

    const transactions = event.transactions.map((t) => ({
      id: t.id,
      type: t.type,
      status: t.status,
      amount: t.amount.toNumber(),
      description: t.description,
      paidAt: t.paidAt ?? t.date,
    }))

    const valorContratado = event.totalValue.toNumber()
    const totalRecebido = computeEventPaid({ deposit: event.deposit.toNumber(), installments, transactions })

    if (valorContratado <= 0) {
      return { success: false, error: 'O evento não tem valor contratado definido' }
    }
    // Mesma regra de recalculateEventPaymentStatus: pago = recebido ≥ contratado.
    if (totalRecebido + 0.005 < valorContratado) {
      return {
        success: false,
        error:
          `As parcelas estão pagas, mas o total recebido (${formatCurrency(totalRecebido)}) é menor que o valor ` +
          `contratado (${formatCurrency(valorContratado)}). Ajuste o valor do evento ou das parcelas antes de emitir a quitação.`,
      }
    }

    const slug = resolveContractSpaceSlug({
      spaceId: event.spaceId,
      slug: event.space.slug,
      name: event.space.name,
    })
    const space = slug ? SPACES[slug] : null
    if (!space) {
      return { success: false, error: 'Espaço do evento sem modelo de contrato configurado' }
    }

    const generated = event.generatedContracts[0]
    const formData = (generated?.formData ?? {}) as Record<string, unknown>
    const signature = event.contractSignatures[0]

    const numeroContrato = generated?.contractNumber || signature?.contractNumber || null
    const dataContrato = generated
      ? dataIsoCurta(formData.contractDate) ?? dataCurta(generated.createdAt)
      : null

    // Cliente: prioridade ao cadastro; o contrato gerado cobre lacunas (ex.:
    // contrato feito antes do CPF ser preenchido no cadastro).
    const clienteNome = event.client?.name || texto(formData.clientName)
    const clienteDocumento = event.client?.cpf || texto(formData.clientCPF)
    if (!clienteNome) {
      return { success: false, error: 'O evento precisa ter um cliente vinculado para emitir a quitação' }
    }

    // ── Linhas de pagamento ──────────────────────────────────────────────
    const pagamentos: QuitacaoPagamento[] = installments.map((i) => ({
      descricao: i.isSinal ? `Sinal (parcela ${i.installmentNumber})` : `Parcela ${i.installmentNumber}`,
      vencimento: dataCurta(i.dueDate),
      pagamento: dataCurta(i.paidAt),
      forma: paymentMethodLabel(i.paymentMethod) || '—',
      valor: i.paidAmount ?? i.amount,
    }))

    // Receitas pagas sem parcela vinculada entram no total (computeEventPaid)
    // e, por isso, precisam aparecer no documento — senão a soma não fecha.
    const vinculadas = new Set(installments.map((i) => i.transactionId).filter((id): id is number => id != null))
    for (const t of transactions) {
      if (vinculadas.has(t.id)) continue
      pagamentos.push({
        descricao: `Pagamento avulso — ${t.description}`.slice(0, 70),
        vencimento: '—',
        pagamento: dataCurta(t.paidAt),
        forma: '—',
        valor: t.amount,
      })
    }

    const agora = new Date()
    const ultimoPagamento = [...installments]
      .map((i) => i.paidAt?.getTime() ?? 0)
      .reduce((max, t) => Math.max(max, t), 0)

    // Código de verificação: resumo determinístico dos dados que importam.
    // Não é assinatura digital — serve para o próprio negócio conferir, mais
    // tarde, que um PDF apresentado corresponde ao que o sistema registrou.
    const hash = createHash('sha256')
      .update([event.id, numeroContrato ?? '', totalRecebido.toFixed(2), pagamentos.length, ultimoPagamento].join('|'))
      .digest('hex')
      .toUpperCase()
    const codigoVerificacao = `${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}`

    const tipoEvento = rotuloTipoEvento(event.eventType || texto(formData.eventType))

    return {
      success: true,
      data: {
        eventId: event.id,
        espaco: {
          slug: space.id,
          nome: space.displayName,
          artigo: ARTIGO_ESPACO[space.id] ?? 'o',
          endereco: space.spaceFullAddress,
          telefone: space.ownerPhone,
          cidade: space.city,
          estado: space.state,
        },
        credor: {
          nome: space.ownerName,
          cpf: space.ownerCPF,
          cnpj: space.ownerCNPJ,
        },
        cliente: {
          nome: clienteNome,
          documento: clienteDocumento,
          representante: texto(formData.clientRepName),
        },
        contrato: { numero: numeroContrato, data: dataContrato },
        evento: {
          titulo: event.title,
          tipo: tipoEvento,
          data: dataCurta(event.start),
          jaRealizado: event.end.getTime() < agora.getTime(),
        },
        pagamentos,
        valorContratado,
        totalRecebido,
        localEData: `${space.city}, ${dataLonga(agora)}`,
        emitidoEm: dataHora(agora),
        codigoVerificacao,
      },
    }
  } catch (error) {
    console.error('Erro ao montar declaração de quitação:', error)
    return { success: false, error: 'Erro ao montar a declaração de quitação' }
  }
}

// ── Histórico das quitações emitidas ───────────────────────────────────────
// O PDF é montado no navegador; depois de baixado, ele volta em base64 e é
// guardado no Vercel Blob com um registro no banco, como os contratos gerados.
// Assim o negócio consegue provar, mais tarde, exatamente o que entregou ao
// cliente — e conferir um PDF apresentado pelo código de verificação.

export async function saveGeneratedQuitacao(params: {
  eventId: number
  pdfBase64: string
  pdfFileName: string
  contractNumber: string | null
  verificationCode: string
  totalReceived: number
}) {
  await requireAuth()
  try {
    const { eventId, pdfBase64, pdfFileName, contractNumber, verificationCode, totalReceived } = params

    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } })
    if (!event) return { success: false, error: 'Evento não encontrado' }

    const version = (await prisma.generatedQuitacao.count({ where: { eventId } })) + 1

    const buffer = Buffer.from(pdfBase64.replace(/^data:application\/pdf;base64,/, ''), 'base64')
    const safeName = pdfFileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const blob = await put(`quitacoes/${eventId}/${version}-${safeName}`, buffer, {
      access: 'public',
      contentType: 'application/pdf',
    })

    const record = await prisma.generatedQuitacao.create({
      data: { version, contractNumber, verificationCode, totalReceived, pdfUrl: blob.url, pdfFileName, eventId },
      select: { id: true, version: true },
    })

    revalidatePath(`/events/${eventId}`)
    return { success: true, data: record }
  } catch (error) {
    console.error('Erro ao guardar declaração de quitação:', error)
    return { success: false, error: 'O PDF foi baixado, mas não foi possível guardá-lo no histórico' }
  }
}

export async function getGeneratedQuitacoes(eventId: number) {
  await requireAuth()
  try {
    const rows = await prisma.generatedQuitacao.findMany({
      where: { eventId },
      orderBy: { version: 'desc' },
    })
    return {
      success: true,
      data: rows.map((r) => ({ ...r, totalReceived: r.totalReceived.toNumber() })),
    }
  } catch (error) {
    console.error('Erro ao listar quitações emitidas:', error)
    return { success: false, error: 'Erro ao listar quitações emitidas' }
  }
}

export async function deleteGeneratedQuitacao(id: number) {
  await requireAuth()
  try {
    const row = await prisma.generatedQuitacao.findUnique({
      where: { id },
      select: { id: true, eventId: true, pdfUrl: true },
    })
    if (!row) return { success: false, error: 'Quitação não encontrada' }

    // Remover o PDF do Blob não é fatal: se falhar, o registro sai mesmo assim.
    try {
      await del(row.pdfUrl)
    } catch (blobErr) {
      console.error('Erro ao remover blob da quitação (continuando):', blobErr)
    }

    await prisma.generatedQuitacao.delete({ where: { id } })
    revalidatePath(`/events/${row.eventId}`)
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir quitação emitida:', error)
    return { success: false, error: 'Erro ao excluir quitação emitida' }
  }
}
