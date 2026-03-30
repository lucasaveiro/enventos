'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { put } from '@vercel/blob'
import { revalidatePath } from 'next/cache'

function revalidateAll(eventId?: number) {
  revalidatePath('/')
  revalidatePath('/events')
  revalidatePath('/contracts')
  if (eventId) revalidatePath(`/events/${eventId}`)
}

interface SaveGeneratedContractParams {
  eventId: number
  spaceId: string
  contractNumber: string
  formData: Record<string, unknown>
  clauses: Array<Record<string, unknown>>
  contractorOverrides?: Record<string, unknown>
  pdfBase64: string
  generatedVia: 'download' | 'clicksign'
}

export async function saveGeneratedContract(params: SaveGeneratedContractParams) {
  try {
    const {
      eventId,
      spaceId,
      contractNumber,
      formData,
      clauses,
      contractorOverrides,
      pdfBase64,
      generatedVia,
    } = params

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    })
    if (!event) {
      return { success: false, error: 'Evento não encontrado' }
    }

    // Calculate version
    const existingCount = await prisma.generatedContract.count({
      where: { eventId },
    })
    const version = existingCount + 1

    // Convert base64 to Buffer for Blob upload
    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Upload PDF to Vercel Blob Store
    const fileName = `Contrato-${contractNumber}-v${version}.pdf`
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const blob = await put(`contracts/generated/${eventId}/${version}-${safeName}`, buffer, {
      access: 'public',
      contentType: 'application/pdf',
    })

    // Create database record
    const generatedContract = await prisma.generatedContract.create({
      data: {
        version,
        contractNumber,
        spaceId,
        formData: formData as unknown as Prisma.InputJsonValue,
        clauses: clauses as unknown as Prisma.InputJsonValue,
        contractorOverrides: contractorOverrides ? contractorOverrides as unknown as Prisma.InputJsonValue : undefined,
        pdfUrl: blob.url,
        pdfFileName: fileName,
        generatedVia,
        eventId,
      },
    })

    revalidateAll(eventId)

    return {
      success: true,
      data: {
        id: generatedContract.id,
        version: generatedContract.version,
        pdfUrl: generatedContract.pdfUrl,
      },
    }
  } catch (error) {
    console.error('Error saving generated contract:', error)
    return { success: false, error: 'Erro ao salvar contrato gerado' }
  }
}

export async function getGeneratedContracts(eventId: number) {
  try {
    const contracts = await prisma.generatedContract.findMany({
      where: { eventId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        contractNumber: true,
        spaceId: true,
        pdfUrl: true,
        pdfFileName: true,
        generatedVia: true,
        createdAt: true,
      },
    })

    return { success: true, data: contracts }
  } catch (error) {
    console.error('Error fetching generated contracts:', error)
    return { success: false, error: 'Erro ao buscar contratos gerados' }
  }
}

export async function getEventDataForContract(eventId: number) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        client: true,
        space: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    })

    if (!event) {
      return { success: false, error: 'Evento não encontrado' }
    }

    return { success: true, data: event }
  } catch (error) {
    console.error('Error fetching event data for contract:', error)
    return { success: false, error: 'Erro ao buscar dados do evento' }
  }
}

export async function getGeneratedContractById(id: number) {
  try {
    const contract = await prisma.generatedContract.findUnique({
      where: { id },
    })

    if (!contract) {
      return { success: false, error: 'Contrato não encontrado' }
    }

    return { success: true, data: contract }
  } catch (error) {
    console.error('Error fetching generated contract:', error)
    return { success: false, error: 'Erro ao buscar contrato' }
  }
}
