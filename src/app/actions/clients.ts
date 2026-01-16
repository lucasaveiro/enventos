'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getClients() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: {
        name: 'asc'
      }
    })
    return { success: true, data: clients }
  } catch (error) {
    console.error('Error fetching clients:', error)
    return { success: false, error: 'Failed to fetch clients' }
  }
}

export async function createClient(data: {
  name: string
  phone?: string | null
  email?: string | null
  notes?: string | null
}) {
  try {
    const client = await prisma.client.create({
      data
    })
    revalidatePath('/clients')
    return { success: true, data: client }
  } catch (error) {
    console.error('Error creating client:', error)
    return { success: false, error: 'Failed to create client' }
  }
}

export async function updateClient(id: number, data: {
  name?: string
  phone?: string | null
  email?: string | null
  notes?: string | null
}) {
  try {
    const client = await prisma.client.update({
      where: { id },
      data
    })
    revalidatePath('/clients')
    return { success: true, data: client }
  } catch (error) {
    console.error('Error updating client:', error)
    return { success: false, error: 'Failed to update client' }
  }
}

export async function deleteClient(id: number) {
  try {
    await prisma.client.delete({
      where: { id }
    })
    revalidatePath('/clients')
    return { success: true }
  } catch (error) {
    console.error('Error deleting client:', error)
    return { success: false, error: 'Failed to delete client' }
  }
}

export async function searchClients(query: string) {
    try {
      const clients = await prisma.client.findMany({
        where: {
            OR: [
                { name: { contains: query } },
                { email: { contains: query } },
                { phone: { contains: query } }
            ]
        },
        take: 10
      })
      return { success: true, data: clients }
    } catch (error) {
      console.error('Error searching clients:', error)
      return { success: false, error: 'Failed to search clients' }
    }
  }
