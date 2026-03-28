'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createInterestDateSchema, updateInterestDateSchema } from '@/lib/validations'

export async function getInterestDates(filters?: {
  clientId?: number
  spaceId?: number
  status?: string
  startDate?: Date
  endDate?: Date
}) {
  try {
    const where: any = {}
    if (filters?.clientId) where.clientId = filters.clientId
    if (filters?.spaceId) where.spaceId = filters.spaceId
    if (filters?.status) where.status = filters.status
    if (filters?.startDate || filters?.endDate) {
      where.date = {}
      if (filters?.startDate) where.date.gte = filters.startDate
      if (filters?.endDate) where.date.lte = filters.endDate
    }

    const interestDates = await prisma.clientInterestDate.findMany({
      where,
      include: { client: true, space: true },
      orderBy: { date: 'asc' },
    })
    return { success: true, data: interestDates }
  } catch (error) {
    console.error('Error fetching interest dates:', error)
    return { success: false, error: 'Failed to fetch interest dates' }
  }
}

export async function getInterestDatesByClient(clientId: number) {
  try {
    const interestDates = await prisma.clientInterestDate.findMany({
      where: { clientId },
      include: { space: true },
      orderBy: { date: 'asc' },
    })
    return { success: true, data: interestDates }
  } catch (error) {
    console.error('Error fetching client interest dates:', error)
    return { success: false, error: 'Failed to fetch client interest dates' }
  }
}

export async function getInterestDatesForCalendar() {
  try {
    const interestDates = await prisma.clientInterestDate.findMany({
      where: { status: { not: 'cancelled' } },
      include: { client: true, space: true },
      orderBy: { date: 'asc' },
    })
    return { success: true, data: interestDates }
  } catch (error) {
    console.error('Error fetching calendar interest dates:', error)
    return { success: false, error: 'Failed to fetch calendar interest dates' }
  }
}

export async function createInterestDate(data: {
  clientId: number
  spaceId: number
  date: Date
  status?: string
  notes?: string
  numberOfPeople?: number
  eventType?: string
}) {
  try {
    const parsed = createInterestDateSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: 'Dados invalidos' }
    }

    const interestDate = await prisma.clientInterestDate.create({
      data: {
        clientId: parsed.data.clientId,
        spaceId: parsed.data.spaceId,
        date: parsed.data.date,
        status: parsed.data.status || 'interest',
        notes: parsed.data.notes,
        numberOfPeople: parsed.data.numberOfPeople,
        eventType: parsed.data.eventType,
      },
    })
    revalidatePath('/')
    revalidatePath('/clients')
    return { success: true, data: interestDate }
  } catch (error) {
    console.error('Error creating interest date:', error)
    return { success: false, error: 'Failed to create interest date' }
  }
}

export async function createManyInterestDates(dates: Array<{
  clientId: number
  spaceId: number
  date: Date
  notes?: string
}>) {
  try {
    const results = await prisma.$transaction(
      dates.map((d) =>
        prisma.clientInterestDate.create({
          data: {
            clientId: d.clientId,
            spaceId: d.spaceId,
            date: d.date,
            status: 'interest',
            notes: d.notes,
          },
        })
      )
    )
    revalidatePath('/')
    revalidatePath('/clients')
    return { success: true, data: results }
  } catch (error) {
    console.error('Error creating interest dates:', error)
    return { success: false, error: 'Failed to create interest dates' }
  }
}

export async function updateInterestDate(id: number, data: {
  status?: string
  notes?: string
  date?: Date
  spaceId?: number
  numberOfPeople?: number
  eventType?: string
}) {
  try {
    const parsed = updateInterestDateSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: 'Dados invalidos' }
    }

    const interestDate = await prisma.clientInterestDate.update({
      where: { id },
      data: parsed.data,
    })
    revalidatePath('/')
    revalidatePath('/clients')
    return { success: true, data: interestDate }
  } catch (error) {
    console.error('Error updating interest date:', error)
    return { success: false, error: 'Failed to update interest date' }
  }
}

export async function deleteInterestDate(id: number) {
  try {
    await prisma.clientInterestDate.delete({
      where: { id },
    })
    revalidatePath('/')
    revalidatePath('/clients')
    return { success: true }
  } catch (error) {
    console.error('Error deleting interest date:', error)
    return { success: false, error: 'Failed to delete interest date' }
  }
}
