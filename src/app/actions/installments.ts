'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { recalculateEventPaymentStatus } from './transactions'
import { addMonths, startOfMonth, endOfMonth, addDays } from 'date-fns'

function toNumber(value: { toNumber: () => number }) {
  return value.toNumber()
}

function revalidateAll() {
  revalidatePath('/')
  revalidatePath('/events')
  revalidatePath('/financial')
  revalidatePath('/financeiro/calendario')
  revalidatePath('/dashboard')
}

export async function getInstallmentsByEventId(eventId: number) {
  try {
    const installments = await prisma.paymentInstallment.findMany({
      where: { eventId },
      orderBy: { installmentNumber: 'asc' },
      include: { transaction: true },
    })

    const serialized = installments.map((inst) => ({
      ...inst,
      amount: toNumber(inst.amount),
      paidAmount: inst.paidAmount ? toNumber(inst.paidAmount) : null,
      transaction: inst.transaction
        ? { ...inst.transaction, amount: toNumber(inst.transaction.amount) }
        : null,
    }))

    return { success: true, data: serialized }
  } catch (error) {
    console.error('Error fetching installments:', error)
    return { success: false, error: 'Failed to fetch installments' }
  }
}

export async function createPaymentPlan(data: {
  eventId: number
  totalValue: number
  numberOfInstallments: number
  startDate: Date
  depositAmount?: number
  depositDueDate?: Date
  paymentMethod?: string
}) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      select: { id: true, category: true, totalValue: true },
    })

    if (!event) return { success: false, error: 'Evento nao encontrado' }

    // Check if existing installments are all pending
    const existingInstallments = await prisma.paymentInstallment.findMany({
      where: { eventId: data.eventId },
      select: { status: true },
    })

    const hasPaidInstallments = existingInstallments.some(
      (inst) => inst.status === 'paid'
    )

    if (hasPaidInstallments) {
      return {
        success: false,
        error: 'Existem parcelas pagas. Remova-as manualmente antes de recriar o plano.',
      }
    }

    await prisma.$transaction(async (tx) => {
      // Delete existing pending installments
      await tx.paymentInstallment.deleteMany({
        where: { eventId: data.eventId },
      })

      const installments: {
        installmentNumber: number
        dueDate: Date
        amount: number
        isSinal: boolean
        paymentMethod: string | null
        eventId: number
      }[] = []

      let currentNumber = 1
      const depositAmount = data.depositAmount ?? 0

      // Create deposit installment
      if (depositAmount > 0) {
        installments.push({
          installmentNumber: currentNumber,
          dueDate: data.depositDueDate ?? data.startDate,
          amount: depositAmount,
          isSinal: true,
          paymentMethod: data.paymentMethod ?? null,
          eventId: data.eventId,
        })
        currentNumber++
      }

      // Calculate remaining amount and distribute
      const remaining = data.totalValue - depositAmount
      if (remaining > 0 && data.numberOfInstallments > 0) {
        const installmentAmount = Math.floor((remaining / data.numberOfInstallments) * 100) / 100
        const lastInstallmentAmount = remaining - installmentAmount * (data.numberOfInstallments - 1)

        for (let i = 0; i < data.numberOfInstallments; i++) {
          const dueDate = addMonths(new Date(data.startDate), i)
          const isLast = i === data.numberOfInstallments - 1
          installments.push({
            installmentNumber: currentNumber + i,
            dueDate,
            amount: isLast
              ? Math.round(lastInstallmentAmount * 100) / 100
              : installmentAmount,
            isSinal: false,
            paymentMethod: data.paymentMethod ?? null,
            eventId: data.eventId,
          })
        }
      }

      await tx.paymentInstallment.createMany({ data: installments })
    })

    revalidateAll()
    return { success: true }
  } catch (error) {
    console.error('Error creating payment plan:', error)
    return { success: false, error: 'Failed to create payment plan' }
  }
}

export async function markInstallmentAsPaid(
  installmentId: number,
  data: {
    paidAmount?: number
    paymentMethod?: string
    paidAt?: Date
  }
) {
  try {
    const installment = await prisma.paymentInstallment.findUnique({
      where: { id: installmentId },
      include: { event: { select: { id: true, title: true } } },
    })

    if (!installment) return { success: false, error: 'Parcela nao encontrada' }
    if (installment.status === 'paid')
      return { success: false, error: 'Parcela ja esta paga' }

    const paidAmount = data.paidAmount ?? toNumber(installment.amount)
    const paidAt = data.paidAt ?? new Date()

    await prisma.$transaction(async (tx) => {
      // Create transaction for this payment
      const transaction = await tx.transaction.create({
        data: {
          type: 'income',
          category: 'installment_payment',
          description: `Parcela ${installment.installmentNumber}${installment.isSinal ? ' (Sinal)' : ''} - ${installment.event.title}`,
          amount: paidAmount,
          date: paidAt,
          status: 'paid',
          paidAt,
          eventId: installment.eventId,
        },
      })

      // Update installment
      await tx.paymentInstallment.update({
        where: { id: installmentId },
        data: {
          status: 'paid',
          paidAt,
          paidAmount,
          paymentMethod: data.paymentMethod ?? installment.paymentMethod,
          transactionId: transaction.id,
        },
      })
    })

    await recalculateEventPaymentStatus(installment.eventId)
    revalidateAll()
    revalidatePath(`/events/${installment.eventId}`)
    return { success: true }
  } catch (error) {
    console.error('Error marking installment as paid:', error)
    return { success: false, error: 'Failed to mark installment as paid' }
  }
}

export async function updateInstallment(
  installmentId: number,
  data: Partial<{
    dueDate: Date
    amount: number
    paymentMethod: string
    notes: string
  }>
) {
  try {
    const installment = await prisma.paymentInstallment.findUnique({
      where: { id: installmentId },
      select: { status: true },
    })

    if (!installment) return { success: false, error: 'Parcela nao encontrada' }
    if (installment.status === 'paid')
      return { success: false, error: 'Nao e possivel editar parcela paga' }

    await prisma.paymentInstallment.update({
      where: { id: installmentId },
      data,
    })

    revalidateAll()
    return { success: true }
  } catch (error) {
    console.error('Error updating installment:', error)
    return { success: false, error: 'Failed to update installment' }
  }
}

export async function deleteInstallment(installmentId: number) {
  try {
    const installment = await prisma.paymentInstallment.findUnique({
      where: { id: installmentId },
      select: { status: true, transactionId: true, eventId: true },
    })

    if (!installment) return { success: false, error: 'Parcela nao encontrada' }
    if (installment.status === 'paid')
      return { success: false, error: 'Nao e possivel excluir parcela paga' }

    await prisma.paymentInstallment.delete({
      where: { id: installmentId },
    })

    revalidateAll()
    return { success: true }
  } catch (error) {
    console.error('Error deleting installment:', error)
    return { success: false, error: 'Failed to delete installment' }
  }
}

export async function addInstallment(data: {
  eventId: number
  dueDate: Date
  amount: number
  paymentMethod?: string
  notes?: string
}) {
  try {
    // Get max installment number
    const maxInstallment = await prisma.paymentInstallment.findFirst({
      where: { eventId: data.eventId },
      orderBy: { installmentNumber: 'desc' },
      select: { installmentNumber: true },
    })

    const nextNumber = (maxInstallment?.installmentNumber ?? 0) + 1

    await prisma.paymentInstallment.create({
      data: {
        installmentNumber: nextNumber,
        dueDate: data.dueDate,
        amount: data.amount,
        paymentMethod: data.paymentMethod ?? null,
        notes: data.notes ?? null,
        isSinal: false,
        eventId: data.eventId,
      },
    })

    revalidateAll()
    return { success: true }
  } catch (error) {
    console.error('Error adding installment:', error)
    return { success: false, error: 'Failed to add installment' }
  }
}

export async function getInstallmentsForCalendar(filters?: {
  start?: Date
  end?: Date
  status?: string
  spaceId?: number
}) {
  try {
    const where: any = {}

    if (filters?.start || filters?.end) {
      where.dueDate = {}
      if (filters.start) where.dueDate.gte = filters.start
      if (filters.end) where.dueDate.lte = filters.end
    }

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status
    }

    if (filters?.spaceId) {
      where.event = { spaceId: filters.spaceId }
    }

    const installments = await prisma.paymentInstallment.findMany({
      where,
      include: {
        event: {
          include: {
            client: { select: { id: true, name: true, phone: true } },
            space: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    })

    const items: any[] = installments.map((inst) => ({
      id: inst.id,
      installmentNumber: inst.installmentNumber,
      title: `${inst.isSinal ? 'Sinal' : `Parcela ${inst.installmentNumber}`} - ${inst.event.client?.name || inst.event.title}`,
      amount: toNumber(inst.amount),
      paidAmount: inst.paidAmount ? toNumber(inst.paidAmount) : null,
      dueDate: inst.dueDate,
      status: inst.status,
      paymentMethod: inst.paymentMethod,
      isSinal: inst.isSinal,
      paidAt: inst.paidAt,
      notes: inst.notes,
      eventId: inst.eventId,
      eventTitle: inst.event.title,
      clientName: inst.event.client?.name ?? null,
      clientPhone: inst.event.client?.phone ?? null,
      spaceName: inst.event.space.name,
      spaceId: inst.event.space.id,
      isTransaction: false,
    }))

    // Also fetch pending transactions NOT linked to any installment
    const txWhere: any = {
      status: 'pending',
      installment: { is: null }, // no linked installment (standalone transactions)
    }

    if (filters?.start || filters?.end) {
      txWhere.date = {}
      if (filters.start) txWhere.date.gte = filters.start
      if (filters.end) txWhere.date.lte = filters.end
    }

    // Map status filter: 'paid' transactions won't be pending so skip them
    if (filters?.status === 'paid') {
      // Don't fetch transactions when filtering for paid — they are pending by definition
    } else {
      if (filters?.spaceId) {
        txWhere.event = { spaceId: filters.spaceId }
      }

      const transactions = await prisma.transaction.findMany({
        where: txWhere,
        include: {
          event: {
            include: {
              client: { select: { id: true, name: true, phone: true } },
              space: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { date: 'asc' },
      })

      for (const tx of transactions) {
        // Skip transactions without an event (standalone expense transactions etc.)
        if (!tx.event || !tx.event.space) continue

        const amount = toNumber(tx.amount)
        const prefix = tx.type === 'income' ? 'Receber' : 'Pagar'

        // Determine status: pending transactions past due date are overdue
        let txStatus = 'pending'
        if (tx.date < new Date()) {
          txStatus = 'overdue'
        }

        // Apply status filter for overdue
        if (filters?.status === 'overdue' && txStatus !== 'overdue') continue
        if (filters?.status === 'pending' && txStatus !== 'pending') continue

        items.push({
          id: tx.id + 1_000_000, // offset to avoid id collision with installments
          installmentNumber: 0,
          title: `${prefix}: ${tx.description}`,
          amount,
          paidAmount: null,
          dueDate: tx.date,
          status: txStatus,
          paymentMethod: null,
          isSinal: false,
          paidAt: null,
          notes: tx.notes ?? null,
          eventId: tx.eventId,
          eventTitle: tx.event.title,
          clientName: tx.event.client?.name ?? null,
          clientPhone: tx.event.client?.phone ?? null,
          spaceName: tx.event.space.name,
          spaceId: tx.event.space.id,
          isTransaction: true,
          transactionId: tx.id,
          transactionType: tx.type,
        })
      }
    }

    // Sort all items by dueDate
    items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

    return { success: true, data: items }
  } catch (error) {
    console.error('Error fetching installments for calendar:', error)
    return { success: false, error: 'Failed to fetch installments' }
  }
}

export async function getFinancialCalendarSummary(filters?: {
  start?: Date
  end?: Date
}) {
  try {
    const now = new Date()
    const monthStart = filters?.start ?? startOfMonth(now)
    const monthEnd = filters?.end ?? endOfMonth(now)
    const sevenDaysFromNow = addDays(now, 7)

    // --- Installments ---
    const dueThisMonth = await prisma.paymentInstallment.aggregate({
      where: {
        dueDate: { gte: monthStart, lte: monthEnd },
        status: { in: ['pending', 'overdue'] },
      },
      _sum: { amount: true },
      _count: true,
    })

    const overdue = await prisma.paymentInstallment.aggregate({
      where: { status: 'overdue' },
      _sum: { amount: true },
      _count: true,
    })

    const upcoming = await prisma.paymentInstallment.aggregate({
      where: {
        dueDate: { gte: now, lte: sevenDaysFromNow },
        status: 'pending',
      },
      _sum: { amount: true },
      _count: true,
    })

    const paidThisMonth = await prisma.paymentInstallment.aggregate({
      where: {
        paidAt: { gte: monthStart, lte: monthEnd },
        status: 'paid',
      },
      _sum: { paidAmount: true },
      _count: true,
    })

    // --- Pending transactions NOT linked to installments ---
    const txDueThisMonth = await prisma.transaction.aggregate({
      where: {
        status: 'pending',
        installment: { is: null },
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
      _count: true,
    })

    const txOverdue = await prisma.transaction.aggregate({
      where: {
        status: 'pending',
        installment: { is: null },
        date: { lt: now },
      },
      _sum: { amount: true },
      _count: true,
    })

    const txUpcoming = await prisma.transaction.aggregate({
      where: {
        status: 'pending',
        installment: { is: null },
        date: { gte: now, lte: sevenDaysFromNow },
      },
      _sum: { amount: true },
      _count: true,
    })

    // Paid transactions this month (standalone, not linked to installments)
    const txPaidThisMonth = await prisma.transaction.aggregate({
      where: {
        status: 'paid',
        installment: { is: null },
        paidAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
      _count: true,
    })

    const instDueAmt = dueThisMonth._sum.amount ? toNumber(dueThisMonth._sum.amount) : 0
    const txDueAmt = txDueThisMonth._sum.amount ? toNumber(txDueThisMonth._sum.amount) : 0

    const instOverdueAmt = overdue._sum.amount ? toNumber(overdue._sum.amount) : 0
    const txOverdueAmt = txOverdue._sum.amount ? toNumber(txOverdue._sum.amount) : 0

    const instUpcomingAmt = upcoming._sum.amount ? toNumber(upcoming._sum.amount) : 0
    const txUpcomingAmt = txUpcoming._sum.amount ? toNumber(txUpcoming._sum.amount) : 0

    const instPaidAmt = paidThisMonth._sum.paidAmount ? toNumber(paidThisMonth._sum.paidAmount) : 0
    const txPaidAmt = txPaidThisMonth._sum.amount ? toNumber(txPaidThisMonth._sum.amount) : 0

    return {
      success: true,
      data: {
        dueThisMonth: {
          amount: instDueAmt + txDueAmt,
          count: dueThisMonth._count + txDueThisMonth._count,
        },
        overdue: {
          amount: instOverdueAmt + txOverdueAmt,
          count: overdue._count + txOverdue._count,
        },
        upcoming7Days: {
          amount: instUpcomingAmt + txUpcomingAmt,
          count: upcoming._count + txUpcoming._count,
        },
        paidThisMonth: {
          amount: instPaidAmt + txPaidAmt,
          count: paidThisMonth._count + txPaidThisMonth._count,
        },
      },
    }
  } catch (error) {
    console.error('Error fetching financial calendar summary:', error)
    return { success: false, error: 'Failed to fetch summary' }
  }
}

export async function checkOverdueInstallments() {
  try {
    const now = new Date()
    const result = await prisma.paymentInstallment.updateMany({
      where: {
        status: 'pending',
        dueDate: { lt: now },
      },
      data: { status: 'overdue' },
    })

    if (result.count > 0) {
      revalidateAll()
    }

    return { success: true, updatedCount: result.count }
  } catch (error) {
    console.error('Error checking overdue installments:', error)
    return { success: false, error: 'Failed to check overdue installments' }
  }
}
