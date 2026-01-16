'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getProfessionals() {
  try {
    const professionals = await prisma.professional.findMany({
      orderBy: {
        name: 'asc'
      }
    })
    return { success: true, data: professionals }
  } catch (error) {
    console.error('Error fetching professionals:', error)
    return { success: false, error: 'Failed to fetch professionals' }
  }
}

export async function createProfessional(data: {
  name: string
  type: string
  phone?: string | null
  notes?: string | null
}) {
  try {
    const professional = await prisma.professional.create({
      data
    })
    revalidatePath('/professionals')
    return { success: true, data: professional }
  } catch (error) {
    console.error('Error creating professional:', error)
    return { success: false, error: 'Failed to create professional' }
  }
}

export async function updateProfessional(id: number, data: {
  name?: string
  type?: string
  phone?: string | null
  notes?: string | null
}) {
  try {
    const professional = await prisma.professional.update({
      where: { id },
      data
    })
    revalidatePath('/professionals')
    return { success: true, data: professional }
  } catch (error) {
    console.error('Error updating professional:', error)
    return { success: false, error: 'Failed to update professional' }
  }
}

export async function deleteProfessional(id: number) {
  try {
    await prisma.professional.delete({
      where: { id }
    })
    revalidatePath('/professionals')
    return { success: true }
  } catch (error) {
    console.error('Error deleting professional:', error)
    return { success: false, error: 'Failed to delete professional' }
  }
}
