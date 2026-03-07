import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature, type ClicksignWebhookPayload } from '@/lib/clicksign'

// Mapeamento: evento Clicksign → status no banco
const EVENT_STATUS_MAP: Record<string, { signatureStatus: string; contractStatus?: string }> = {
  sign: { signatureStatus: 'signed', contractStatus: 'signed' },
  close: { signatureStatus: 'closed', contractStatus: 'signed' },
  auto_close: { signatureStatus: 'closed', contractStatus: 'signed' },
  cancel: { signatureStatus: 'cancelled', contractStatus: 'not_sent' },
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    // Validação HMAC (se configurado)
    const hmacKey = process.env.CLICKSIGN_WEBHOOK_HMAC_KEY
    if (hmacKey) {
      const signature =
        request.headers.get('content-hmac') ||
        request.headers.get('x-clicksign-signature') ||
        ''

      // O header vem como "sha256=<hex>" — extrai só o hex
      const hexSignature = signature.replace(/^sha256=/, '')

      const isValid = await verifyWebhookSignature(rawBody, hexSignature, hmacKey)
      if (!isValid) {
        console.error('Webhook Clicksign: assinatura HMAC inválida')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload: ClicksignWebhookPayload = JSON.parse(rawBody)
    const eventName = payload.event?.name
    const documentKey = payload.document?.key

    if (!eventName || !documentKey) {
      return NextResponse.json({ error: 'Missing event or document data' }, { status: 400 })
    }

    // Busca a assinatura pelo documentKey
    const signature = await prisma.contractSignature.findFirst({
      where: { documentKey },
    })

    if (!signature) {
      console.warn(`Webhook Clicksign: documentKey ${documentKey} não encontrado`)
      return NextResponse.json({ ok: true, message: 'Document not tracked' })
    }

    // Atualiza webhook log
    const existingLog: Array<{ event: string; at: string }> = signature.webhookLog
      ? JSON.parse(signature.webhookLog)
      : []
    existingLog.push({
      event: eventName,
      at: payload.event.occurred_at || new Date().toISOString(),
    })

    const statusMapping = EVENT_STATUS_MAP[eventName]

    if (statusMapping) {
      // Atualiza ContractSignature
      await prisma.contractSignature.update({
        where: { id: signature.id },
        data: {
          status: statusMapping.signatureStatus,
          webhookLog: JSON.stringify(existingLog),
        },
      })

      // Atualiza Event.contractStatus se necessário
      if (statusMapping.contractStatus) {
        await prisma.event.update({
          where: { id: signature.eventId },
          data: { contractStatus: statusMapping.contractStatus },
        })
      }
    } else {
      // Evento desconhecido: salva só no log
      await prisma.contractSignature.update({
        where: { id: signature.id },
        data: { webhookLog: JSON.stringify(existingLog) },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook Clicksign error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
