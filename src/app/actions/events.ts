'use server'

import { prisma } from '@/lib/prisma'
import { del } from '@vercel/blob'
import { revalidatePath } from 'next/cache'
import { startOfDay, endOfDay } from 'date-fns'
import { createEventSchema, updateEventSchema } from '@/lib/validations'

type EventCategory = 'event' | 'visit' | 'proposal'

/**
 * When a confirmed event is created/updated for a client, mark any interest
 * dates of the SAME client on that day as "confirmed" — they should no longer
 * show on the main calendar (the event card itself represents the booking).
 */
async function confirmMatchingInterestDates(args: {
  clientId: number | null | undefined
  category: EventCategory
  start: Date
}) {
  if (!args.clientId) return
  if (args.category !== 'event') return

  const dayStart = startOfDay(args.start)
  const dayEnd = endOfDay(args.start)

  await prisma.clientInterestDate.updateMany({
    where: {
      clientId: args.clientId,
      status: 'interest',
      date: { gte: dayStart, lte: dayEnd },
    },
    data: { status: 'confirmed' },
  })
}

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
    const parsed = createEventSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: 'Dados invalidos' }
    }

    const { professionalIds, category, ...eventData } = parsed.data

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

    await confirmMatchingInterestDates({
      clientId: eventData.clientId ?? null,
      category: (category ?? 'event') as EventCategory,
      start: eventData.start,
    })

    revalidatePath('/')
    revalidatePath('/events')
    revalidatePath('/clients')
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
        const parsed = updateEventSchema.safeParse(data)
        if (!parsed.success) {
            return { success: false, error: 'Dados invalidos' }
        }

        const { professionalIds, ...eventData } = parsed.data
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

        if (eventData.start !== undefined) {
            await confirmMatchingInterestDates({
                clientId:
                    eventData.clientId !== undefined ? eventData.clientId : event.clientId,
                category: (eventData.category ?? event.category) as EventCategory,
                start: eventData.start,
            })
        }

        revalidatePath('/')
        revalidatePath('/events')
        revalidatePath('/clients')
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
        },
        installments: {
          orderBy: { installmentNumber: 'asc' },
          include: { transaction: true }
        },
        manualContracts: {
          orderBy: { createdAt: 'desc' },
        },
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
        deposit: event.deposit.toNumber(),
        installments: event.installments.map(inst => ({
          ...inst,
          amount: inst.amount.toNumber(),
          paidAmount: inst.paidAmount ? inst.paidAmount.toNumber() : null,
          transaction: inst.transaction ? {
            ...inst.transaction,
            amount: inst.transaction.amount.toNumber(),
          } : null,
        })),
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

/**
 * Returns event/interest occupancy of a space within a given month, used by
 * the date pickers to color days (red = booked event, yellow = interest from
 * another client).
 */
export async function getSpaceOccupationByMonth(
  spaceId: number,
  year: number,
  monthZeroIndexed: number,
) {
  try {
    const start = new Date(year, monthZeroIndexed, 1, 0, 0, 0, 0)
    const end = new Date(year, monthZeroIndexed + 1, 0, 23, 59, 59, 999)

    const [events, interests] = await Promise.all([
      prisma.event.findMany({
        where: {
          spaceId,
          category: 'event',
          status: { notIn: ['available', 'visit_cancelled', 'proposal_cancelled'] },
          start: { gte: start, lte: end },
        },
        select: { id: true, start: true, clientId: true, title: true },
      }),
      prisma.clientInterestDate.findMany({
        where: {
          spaceId,
          status: 'interest',
          date: { gte: start, lte: end },
        },
        select: { id: true, date: true, clientId: true },
      }),
    ])

    return {
      success: true,
      data: {
        events: events.map((e) => ({
          id: e.id,
          date: e.start.toISOString(),
          clientId: e.clientId,
          title: e.title,
        })),
        interests: interests.map((i) => ({
          id: i.id,
          date: i.date.toISOString(),
          clientId: i.clientId,
        })),
      },
    }
  } catch (error) {
    console.error('Error fetching space occupation:', error)
    return { success: false, error: 'Failed to fetch space occupation' }
  }
}

export async function deleteEvent(id: number) {
  try {
    // Clean up manual contract blobs before transaction
    const manualContracts = await prisma.manualContract.findMany({
      where: { eventId: id },
      select: { fileUrl: true },
    })
    for (const mc of manualContracts) {
      try { await del(mc.fileUrl) } catch { /* blob may already be gone */ }
    }

    // Delete related records
    await prisma.$transaction(async (tx) => {
      await tx.manualContract.deleteMany({ where: { eventId: id } })
      await tx.paymentInstallment.deleteMany({ where: { eventId: id } })
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
