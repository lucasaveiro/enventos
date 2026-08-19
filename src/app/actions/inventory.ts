'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { SPACES } from '@/lib/contractTemplates'

// Itens do inventário usados no Termo de Vistoria (Anexo I do contrato).
// `package`: 'simples' | 'completo' | null (null = todos os pacotes do espaço).

const packageSchema = z.enum(['simples', 'completo']).nullable()

const itemSchema = z.object({
  spaceSlug: z.string().refine((slug) => Boolean(SPACES[slug]), 'Espaço inválido'),
  name: z.string().trim().min(1, 'Nome é obrigatório').max(200),
  quantity: z.number().int().min(1, 'Quantidade mínima é 1').max(9999),
  package: packageSchema,
})

export interface InventoryItemData {
  id: number
  spaceSlug: string
  name: string
  quantity: number
  package: string | null
}

export async function getInventoryItems(spaceSlug?: string) {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: spaceSlug ? { spaceSlug } : undefined,
      orderBy: [{ spaceSlug: 'asc' }, { package: 'asc' }, { name: 'asc' }],
    })
    return { success: true as const, data: items as InventoryItemData[] }
  } catch (error) {
    console.error('Error fetching inventory items:', error)
    return { success: false as const, error: 'Falha ao carregar itens do inventário' }
  }
}

export async function createInventoryItem(data: {
  spaceSlug: string
  name: string
  quantity: number
  package: string | null
}) {
  try {
    const parsed = itemSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || 'Dados inválidos' }
    }
    const item = await prisma.inventoryItem.create({ data: parsed.data })
    revalidatePath('/inventario')
    return { success: true as const, data: item as InventoryItemData }
  } catch (error) {
    console.error('Error creating inventory item:', error)
    return { success: false as const, error: 'Falha ao criar item' }
  }
}

export async function updateInventoryItem(
  id: number,
  data: { spaceSlug: string; name: string; quantity: number; package: string | null }
) {
  try {
    const parsed = itemSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || 'Dados inválidos' }
    }
    const item = await prisma.inventoryItem.update({ where: { id }, data: parsed.data })
    revalidatePath('/inventario')
    return { success: true as const, data: item as InventoryItemData }
  } catch (error) {
    console.error('Error updating inventory item:', error)
    return { success: false as const, error: 'Falha ao atualizar item' }
  }
}

export async function deleteInventoryItem(id: number) {
  try {
    await prisma.inventoryItem.delete({ where: { id } })
    revalidatePath('/inventario')
    return { success: true as const }
  } catch (error) {
    console.error('Error deleting inventory item:', error)
    return { success: false as const, error: 'Falha ao excluir item' }
  }
}

// Itens padrão da Estância Aveiro, derivados da Cláusula Primeira do contrato.
// Quantidades sem número expresso no contrato (geladeiras, sofás etc.) entram
// com valores iniciais razoáveis — a lista é totalmente editável na página.
const DEFAULT_ESTANCIA_ITEMS: Array<{ name: string; quantity: number; package: string | null }> = [
  { name: 'Mesa de madeira', quantity: 13, package: 'simples' },
  { name: 'Cadeira de madeira', quantity: 50, package: 'simples' },
  { name: 'Guarda-sol', quantity: 1, package: 'simples' },
  { name: 'Cervejeira', quantity: 1, package: 'simples' },
  { name: 'Geladeira (cozinha externa)', quantity: 2, package: 'simples' },
  { name: 'Fogão a gás (com botijão)', quantity: 1, package: 'simples' },
  { name: 'Fogão a lenha', quantity: 1, package: 'simples' },
  { name: 'Forno', quantity: 1, package: 'simples' },
  { name: 'Churrasqueira', quantity: 1, package: 'simples' },
  { name: 'Ilha com pia', quantity: 1, package: 'simples' },
  { name: 'Mesa de sinuca', quantity: 1, package: 'completo' },
  { name: 'Taco de sinuca', quantity: 4, package: 'completo' },
  { name: 'Colchão de casal', quantity: 8, package: 'completo' },
  { name: 'Colchão de solteiro', quantity: 7, package: 'completo' },
  { name: 'Sofá', quantity: 2, package: 'completo' },
  { name: 'Poltrona', quantity: 2, package: 'completo' },
  { name: 'Guarda-roupa', quantity: 3, package: 'completo' },
  { name: 'Criado-mudo', quantity: 2, package: 'completo' },
]

export async function seedDefaultInventory(spaceSlug: string) {
  try {
    if (spaceSlug !== 'estancia-aveiro') {
      return { success: false as const, error: 'Itens padrão disponíveis apenas para a Estância Aveiro' }
    }
    const existing = await prisma.inventoryItem.count({ where: { spaceSlug } })
    if (existing > 0) {
      return { success: false as const, error: 'O espaço já possui itens cadastrados' }
    }
    await prisma.inventoryItem.createMany({
      data: DEFAULT_ESTANCIA_ITEMS.map((item) => ({ ...item, spaceSlug })),
    })
    revalidatePath('/inventario')
    return { success: true as const }
  } catch (error) {
    console.error('Error seeding inventory items:', error)
    return { success: false as const, error: 'Falha ao carregar itens padrão' }
  }
}
