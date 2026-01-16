'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getEvents(start?: Date, end?: Date) {
  try {
    const where: any = {}
    if (start && end) {
      where.start = {
        gte: start,
        lte: end
      }
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
    const { professionalIds, ...eventData } = data

    const event = await prisma.event.create({
      data: {
        ...eventData,
        professionals: professionalIds ? {
            create: professionalIds.map(id => ({
                professional: { connect: { id } }
            }))
        } : undefined
      }
    })
    revalidatePath('/')
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
        client: true,
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
