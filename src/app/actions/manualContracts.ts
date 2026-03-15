'use server'

import { prisma } from '@/lib/prisma'
import { del } from '@vercel/blob'
import { revalidatePath } from 'next/cache'

function revalidateAll(eventId?: number) {
  revalidatePath('/')
  revalidatePath('/events')
  if (eventId) revalidatePath(`/events/${eventId}`)
}

export async function getManualContracts(eventId: number) {
  try {
    const contracts = await prisma.manualContract.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, data: contracts }
  } catch (error) {
    console.error('Error fetching manual contracts:', error)
    return { success: false, error: 'Erro ao buscar contratos' }
  }
}

export async function deleteManualContract(id: number) {
  try {
    const contract = await prisma.manualContract.findUnique({
      where: { id },
      select: { id: true, fileUrl: true, eventId: true },
    })

    if (!contract) {
      return { success: false, error: 'Contrato nao encontrado' }
    }

    // Delete from Vercel Blob
    try {
      await del(contract.fileUrl)
    } catch {
      // Blob may already be deleted
    }

    // Delete database record
    await prisma.manualContract.delete({
      where: { id },
    })

    revalidateAll(contract.eventId)

    return { success: true }
  } catch (error) {
    console.error('Error deleting manual contract:', error)
    return { success: false, error: 'Erro ao excluir contrato' }
  }
}
