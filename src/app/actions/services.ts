'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getServiceTypes() {
  try {
    const types = await prisma.serviceType.findMany()
    return { success: true, data: types }
  } catch (error) {
    console.error('Error fetching service types:', error)
    return { success: false, error: 'Failed to fetch service types' }
  }
}

export async function getServiceTasks(start?: Date, end?: Date) {
  try {
    const where: any = {
      start: { not: null }, // Exclude unscheduled (pending) tasks
    }
    if (start && end) {
      where.start = {
        not: null,
        gte: start,
        lte: end,
      }
    }

    const tasks = await prisma.serviceTask.findMany({
      where,
      include: {
        serviceType: true,
        space: true,
        event: true,
      },
      orderBy: {
        start: 'asc',
      },
    })
    return { success: true, data: tasks }
  } catch (error) {
    console.error('Error fetching service tasks:', error)
    return { success: false, error: 'Failed to fetch service tasks' }
  }
}

export async function getPendingServiceTasks() {
  try {
    const tasks = await prisma.serviceTask.findMany({
      where: {
        start: null, // Only tasks with no scheduled date
      },
      include: {
        serviceType: true,
        space: true,
        event: true,
      },
      orderBy: {
        createdAt: 'asc', // Show oldest pending first
      },
    })
    return { success: true, data: tasks }
  } catch (error) {
    console.error('Error fetching pending service tasks:', error)
    return { success: false, error: 'Failed to fetch pending service tasks' }
  }
}

export async function createServiceTask(data: {
  start?: Date | null
  end?: Date | null
  responsible?: string | null
  status: string
  notes?: string | null
  spaceId: number
  serviceTypeId: number
  eventId?: number | null
}) {
  try {
    const task = await prisma.serviceTask.create({
      data,
    })
    revalidatePath('/')
    revalidatePath('/services')
    return { success: true, data: task }
  } catch (error) {
    console.error('Error creating service task:', error)
    return { success: false, error: 'Failed to create service task' }
  }
}

export async function updateServiceTask(
  id: number,
  data: {
    start?: Date | null
    end?: Date | null
    responsible?: string | null
    status?: string
    notes?: string | null
    spaceId?: number
    serviceTypeId?: number
    eventId?: number | null
  }
) {
  try {
    const task = await prisma.serviceTask.update({
      where: { id },
      data,
    })
    revalidatePath('/')
    revalidatePath('/services')
    return { success: true, data: task }
  } catch (error) {
    console.error('Error updating service task:', error)
    return { success: false, error: 'Failed to update service task' }
  }
}

export async function updateServiceTaskStatus(id: number, status: string) {
  try {
    const task = await prisma.serviceTask.update({
      where: { id },
      data: { status },
    })
    revalidatePath('/')
    revalidatePath('/services')
    return { success: true, data: task }
  } catch (error) {
    console.error('Error updating service task status:', error)
    return { success: false, error: 'Failed to update service task status' }
  }
}
