'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getSpaces() {
  try {
    const spaces = await prisma.space.findMany({
      orderBy: { name: 'asc' }
    })
    return { success: true, data: spaces }
  } catch (error) {
    console.error('Error fetching spaces:', error)
    return { success: false, error: 'Failed to fetch spaces' }
  }
}

export async function createSpace(data: { name: string; address?: string; active?: boolean }) {
  try {
    const space = await prisma.space.create({
      data: {
        name: data.name,
        address: data.address,
        active: data.active ?? true,
      }
    })
    revalidatePath('/spaces')
    return { success: true, data: space }
  } catch (error) {
    console.error('Error creating space:', error)
    return { success: false, error: 'Failed to create space' }
  }
}

export async function updateSpace(id: number, data: { name?: string; address?: string; active?: boolean }) {
  try {
    const space = await prisma.space.update({
      where: { id },
      data
    })
    revalidatePath('/spaces')
    return { success: true, data: space }
  } catch (error) {
    console.error('Error updating space:', error)
    return { success: false, error: 'Failed to update space' }
  }
}

export async function deleteSpace(id: number) {
  try {
    // Soft delete by setting active to false, or hard delete?
    // Let's hard delete for now, or check if it has relations.
    // If it has relations, Prisma will throw error unless cascade delete.
    // Let's just delete it.
    await prisma.space.delete({
      where: { id }
    })
    revalidatePath('/spaces')
    return { success: true }
  } catch (error) {
    console.error('Error deleting space:', error)
    return { success: false, error: 'Failed to delete space' }
  }
}
