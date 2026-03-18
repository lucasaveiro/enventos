'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import * as clicksign from '@/lib/clicksign'

// ── Formatação de telefone ──────────────────────────────────────────────────

function formatPhoneForClicksign(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  // Remove código do país 55 se presente
  if (digits.startsWith('55') && digits.length >= 12) return digits.slice(2)
  return digits
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
  try {
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

    // Step 1: Upload document
    const { documentKey } = await clicksign.uploadDocument({
      path: `/contratos/${params.contractNumber}.pdf`,
      contentBase64,
      deadlineAt,
    })

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

    // Step 2: Create signer
    const phoneFormatted = formatPhoneForClicksign(params.clientPhone)
    const { signerKey } = await clicksign.createSigner({
      email: params.clientEmail || `${phoneFormatted}@noemail.clicksign.com`,
      phoneNumber: phoneFormatted,
      name: params.clientName,
      documentation: params.clientCPF,
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
    const contractorCPFClean = params.contractorCPF.replace(/\D/g, '')
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
    console.error('Erro ao enviar contrato para Clicksign:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
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

export async function getEventsForContractLinking(spaceDbId?: number) {
  try {
    const events = await prisma.event.findMany({
      where: {
        category: 'event',
        ...(spaceDbId ? { spaceId: spaceDbId } : {}),
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
