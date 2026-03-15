'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

type EventCategory = 'event' | 'visit' | 'proposal'

export async function getEvents(
  start?: Date,
  end?: Date,
  options?: { categories?: EventCategory[] }
) {
  try {
    const where: any = {}
    if (start && end) {
      where.start = {
        gte: start,
        lte: end
      }
    }

    if (options?.categories?.length) {
      where.category = { in: options.categories }
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        client: true,
        space: true,
        professionals: {
            include: {
                professional: true
            }
        }
      },
      orderBy: {
        start: 'asc'
      }
    })
    
    // Transform Decimal to number for serialization
    const serializedEvents = events.map(event => ({
        ...event,
        totalValue: event.totalValue.toNumber(),
        deposit: event.deposit.toNumber(),
    }))

    return { success: true, data: serializedEvents }
  } catch (error) {
    console.error('Error fetching events:', error)
    return { success: false, error: 'Failed to fetch events' }
  }
}

export async function createEvent(data: {
  title: string
  start: Date
  end: Date
  category?: EventCategory
  status: string
  paymentStatus: string
  contractStatus: string
  totalValue: number
  deposit: number
  notes?: string | null
  spaceId: number
  clientId?: number | null
  professionalIds?: number[]
}) {
  try {
    const { professionalIds, category, ...eventData } = data

    const event = await prisma.event.create({
      data: {
        category: category ?? 'event',
        ...eventData,
        professionals: professionalIds ? {
            create: professionalIds.map(id => ({
                professional: { connect: { id } }
            }))
        } : undefined
      }
    })
    revalidatePath('/')
    revalidatePath('/events')
    return {
      success: true,
      data: {
        ...event,
        totalValue: event.totalValue.toNumber(),
        deposit: event.deposit.toNumber(),
      }
    }
  } catch (error) {
    console.error('Error creating event:', error)
    return { success: false, error: 'Failed to create event' }
  }
}

export async function updateEvent(id: number, data: Partial<{
    title: string
    start: Date
    end: Date
    category: EventCategory
    status: string
    paymentStatus: string
    contractStatus: string
    totalValue: number
    deposit: number
    notes?: string | null
    spaceId: number
    clientId?: number | null
    professionalIds?: number[]
}>) {
    try {
        const { professionalIds, ...eventData } = data
        const updateData: typeof eventData & {
            professionals?: {
                deleteMany: Record<string, never>
                create: { professional: { connect: { id: number } } }[]
            }
        } = { ...eventData }

        if (professionalIds !== undefined) {
            updateData.professionals = {
                deleteMany: {},
                create: professionalIds.map(professionalId => ({
                    professional: { connect: { id: professionalId } }
                }))
            }
        }

        const event = await prisma.event.update({
            where: { id },
            data: updateData
        })
        revalidatePath('/')
        revalidatePath('/events')
        revalidatePath(`/events/${event.id}`)
        return {
            success: true,
            data: {
                ...event,
                totalValue: event.totalValue.toNumber(),
                deposit: event.deposit.toNumber(),
            }
        }
    } catch (error) {
        console.error('Error updating event:', error)
        return { success: false, error: 'Failed to update event' }
    }
}

export async function getEventById(id: number) {
  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            interestDates: {
              where: { status: { not: 'cancelled' } },
              include: { space: true },
              orderBy: { date: 'asc' },
            },
          },
        },
        space: true,
        professionals: {
          include: {
            professional: true
          }
        }
      }
    })

    if (!event) {
      return { success: false, error: 'Event not found' }
    }

    return {
      success: true,
      data: {
        ...event,
        totalValue: event.totalValue.toNumber(),
        deposit: event.deposit.toNumber()
      }
    }
  } catch (error) {
    console.error('Error fetching event:', error)
    return { success: false, error: 'Failed to fetch event' }
  }
}

// ── Events List (for /events page) ───────────────────────────────────────────

export async function getEventsForList(filters?: {
  spaceId?: number
  status?: string
  paymentStatus?: string
  contractStatus?: string
  startDate?: Date
  endDate?: Date
}) {
  try {
    const where: any = { category: 'event' }

    if (filters?.spaceId) where.spaceId = filters.spaceId
    if (filters?.status) where.status = filters.status
    if (filters?.paymentStatus) where.paymentStatus = filters.paymentStatus
    if (filters?.contractStatus) where.contractStatus = filters.contractStatus
    if (filters?.startDate || filters?.endDate) {
      where.start = {}
      if (filters.startDate) where.start.gte = filters.startDate
      if (filters.endDate) where.start.lte = filters.endDate
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        client: true,
        space: true,
        professionals: { include: { professional: true } },
        contractSignatures: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true, signingUrl: true },
        },
        _count: { select: { transactions: true } },
      },
      orderBy: { start: 'desc' },
    })

    const serialized = events.map((e) => ({
      ...e,
      totalValue: e.totalValue.toNumber(),
      deposit: e.deposit.toNumber(),
    }))

    const summary = {
      totalEvents: serialized.length,
      paidCount: serialized.filter((e) => e.paymentStatus === 'paid').length,
      partialCount: serialized.filter((e) => e.paymentStatus === 'partial').length,
      unpaidCount: serialized.filter((e) => e.paymentStatus === 'unpaid').length,
    }

    return { success: true, data: serialized, summary }
  } catch (error) {
    console.error('Error fetching events for list:', error)
    return { success: false, error: 'Failed to fetch events' }
  }
}

// ── Delete Event ─────────────────────────────────────────────────────────────

export async function deleteEvent(id: number) {
  try {
    // Delete related records first
    await prisma.$transaction(async (tx) => {
      await tx.contractSignature.deleteMany({ where: { eventId: id } })
      await tx.transaction.deleteMany({ where: { eventId: id } })
      await tx.serviceTask.deleteMany({ where: { eventId: id } })
      await tx.eventProfessional.deleteMany({ where: { eventId: id } })
      await tx.event.delete({ where: { id } })
    })

    revalidatePath('/')
    revalidatePath('/events')
    revalidatePath('/financial')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error deleting event:', error)
    return {
      success: false,
      error: 'Erro ao excluir evento. Tente novamente.',
    }
  }
}
