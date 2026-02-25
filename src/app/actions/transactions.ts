'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { Prisma } from '@prisma/client'
import { addDays, endOfDay, startOfDay } from 'date-fns'

const SERVICE_PENDING_CATEGORIES = new Set([
  'service_cost',
  'professional_payment',
  'cleaning',
])

type TransactionStatus = 'paid' | 'pending'

type FinancialFilters = {
  start?: Date
  end?: Date
  type?: 'income' | 'expense' | 'all'
  category?: string
  status?: TransactionStatus | 'all'
  search?: string
}

function toNumber(value: { toNumber: () => number }) {
  return value.toNumber()
}

function buildBaseTransactionWhere(filters?: FinancialFilters): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {}

  if (filters?.start || filters?.end) {
    where.date = {}
    if (filters.start) where.date.gte = filters.start
    if (filters.end) where.date.lte = filters.end
  }

  if (filters?.type && filters.type !== 'all') {
    where.type = filters.type
  }

  if (filters?.category && filters.category !== 'all') {
    where.category = filters.category
  }

  if (filters?.status && filters.status !== 'all') {
    where.status = filters.status
  }

  if (filters?.search?.trim()) {
    const search = filters.search.trim()
    where.OR = [
      { description: { contains: search } },
      { notes: { contains: search } },
      { category: { contains: search } },
    ]
  }

  return where
}

async function recalculateEventPaymentStatus(eventId: number) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { totalValue: true, deposit: true, category: true },
  })

  if (!event) return
  if (event.category !== 'event') return

  const payments = await prisma.transaction.aggregate({
    where: {
      eventId,
      type: 'income',
      status: 'paid',
    },
    _sum: {
      amount: true,
    },
  })

  const totalValue = toNumber(event.totalValue)
  const deposit = Math.min(toNumber(event.deposit), totalValue)
  const paidFromTransactions = payments._sum.amount ? toNumber(payments._sum.amount) : 0
  const totalPaid = deposit + paidFromTransactions

  let paymentStatus = 'unpaid'
  if (totalPaid >= totalValue) {
    paymentStatus = 'paid'
  } else if (totalPaid > 0) {
    paymentStatus = 'partial'
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { paymentStatus },
  })
}

export async function getTransactions(start?: Date, end?: Date) {
  try {
    const where = buildBaseTransactionWhere({ start, end })
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        event: {
          include: {
            client: true,
            space: true,
          },
        },
        serviceTask: {
          include: {
            serviceType: true,
            space: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    const serializedTransactions = transactions.map((transaction) => ({
      ...transaction,
      amount: toNumber(transaction.amount),
      event: transaction.event
        ? {
            ...transaction.event,
            totalValue: toNumber(transaction.event.totalValue),
            deposit: toNumber(transaction.event.deposit),
          }
        : null,
    }))

    return { success: true, data: serializedTransactions }
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return { success: false, error: 'Failed to fetch transactions' }
  }
}

export async function getFinancialLedger(filters: FinancialFilters = {}) {
  try {
    const where = buildBaseTransactionWhere(filters)
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            space: { select: { name: true } },
          },
        },
        serviceTask: {
          select: {
            id: true,
            serviceType: { select: { name: true } },
            space: { select: { name: true } },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    })

    const entries = transactions.map((transaction) => ({
      ...transaction,
      amount: toNumber(transaction.amount),
      reference:
        transaction.event?.title ||
        transaction.serviceTask?.serviceType?.name ||
        '-',
      spaceName:
        transaction.event?.space?.name ||
        transaction.serviceTask?.space?.name ||
        null,
    }))

    const summary = entries.reduce(
      (acc, item) => {
        const isPaid = item.status === 'paid'
        if (item.type === 'income') {
          if (isPaid) acc.paidIncome += item.amount
          else acc.pendingIncome += item.amount
        } else {
          if (isPaid) acc.paidExpense += item.amount
          else acc.pendingExpense += item.amount
          if (!isPaid && SERVICE_PENDING_CATEGORIES.has(item.category)) {
            acc.servicePendingTotal += item.amount
          }
        }
        return acc
      },
      {
        paidIncome: 0,
        paidExpense: 0,
        pendingIncome: 0,
        pendingExpense: 0,
        servicePendingTotal: 0,
      }
    )

    return { success: true, data: entries, summary }
  } catch (error) {
    console.error('Error fetching financial ledger:', error)
    return { success: false, error: 'Failed to fetch financial ledger' }
  }
}

export async function getFinancialForecastSummary(start: Date, end: Date) {
  try {
    const where: Prisma.TransactionWhereInput = {
      status: 'pending',
      date: {
        gte: start,
        lte: end,
      },
    }

    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        type: true,
        amount: true,
        category: true,
      },
    })

    const summary = {
      totalForecastIncome: 0,
      totalForecastExpense: 0,
      totalServicePending: 0,
      start,
      end,
    }

    transactions.forEach((transaction) => {
      const amount = toNumber(transaction.amount)
      if (transaction.type === 'income') {
        summary.totalForecastIncome += amount
      } else {
        summary.totalForecastExpense += amount
        if (SERVICE_PENDING_CATEGORIES.has(transaction.category)) {
          summary.totalServicePending += amount
        }
      }
    })

    return { success: true, data: summary }
  } catch (error) {
    console.error('Error fetching forecast summary:', error)
    return { success: false, error: 'Failed to fetch forecast summary' }
  }
}

export async function getFinancialCalendarItems(start?: Date, end?: Date) {
  try {
    const where: Prisma.TransactionWhereInput = {
      status: 'pending',
    }

    if (start || end) {
      where.date = {}
      if (start) where.date.gte = start
      if (end) where.date.lte = end
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            title: true,
          },
        },
        serviceTask: {
          select: {
            id: true,
            serviceType: { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'asc' },
    })

    const items = transactions.map((transaction) => {
      const amount = toNumber(transaction.amount)
      const prefix = transaction.type === 'income' ? 'Receber' : 'Pagar'
      return {
        id: transaction.id,
        title: `${prefix}: ${transaction.description}`,
        amount,
        date: transaction.date,
        type: transaction.type,
        category: transaction.category,
        eventId: transaction.eventId,
        eventTitle: transaction.event?.title ?? null,
        serviceTaskId: transaction.serviceTaskId,
      }
    })

    return { success: true, data: items }
  } catch (error) {
    console.error('Error fetching financial calendar items:', error)
    return { success: false, error: 'Failed to fetch financial calendar items' }
  }
}

// Get all financial data including events and transactions
export async function getAllFinancialData(start?: Date, end?: Date) {
  try {
    const eventWhere: Prisma.EventWhereInput = { category: 'event' }
    const transactionWhere: Prisma.TransactionWhereInput = buildBaseTransactionWhere({ start, end })

    if (start && end) {
      eventWhere.start = { gte: start, lte: end }
    }

    const events = await prisma.event.findMany({
      where: eventWhere,
      include: {
        client: true,
        space: true,
      },
      orderBy: { start: 'desc' },
    })

    const transactions = await prisma.transaction.findMany({
      where: transactionWhere,
      include: {
        event: {
          include: {
            client: true,
            space: true,
          },
        },
        serviceTask: {
          include: {
            serviceType: true,
            space: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    const eventEntries = events.map((event) => ({
      id: `event-${event.id}`,
      type: 'income' as const,
      category: 'event_payment',
      description: `${event.title}${event.client ? ` - ${event.client.name}` : ''}`,
      amount: toNumber(event.totalValue),
      depositAmount: toNumber(event.deposit),
      date: event.start,
      paymentStatus: event.paymentStatus,
      source: 'event' as const,
      sourceId: event.id,
      eventId: event.id,
      status: event.paymentStatus === 'paid' ? 'paid' : 'pending',
      paidAt: null,
      event: {
        ...event,
        totalValue: toNumber(event.totalValue),
        deposit: toNumber(event.deposit),
      },
      space: event.space,
    }))

    const manualEntries = transactions.map((transaction) => ({
      id: `transaction-${transaction.id}`,
      type: transaction.type as 'income' | 'expense',
      category: transaction.category,
      description: transaction.description,
      amount: toNumber(transaction.amount),
      depositAmount: 0,
      date: transaction.date,
      paymentStatus: null,
      source: 'manual' as const,
      sourceId: transaction.id,
      eventId: transaction.eventId,
      status: transaction.status,
      paidAt: transaction.paidAt,
      event: transaction.event
        ? {
            ...transaction.event,
            totalValue: toNumber(transaction.event.totalValue),
            deposit: toNumber(transaction.event.deposit),
          }
        : null,
      space: transaction.event?.space || transaction.serviceTask?.space || null,
      serviceTask: transaction.serviceTask,
      notes: transaction.notes,
    }))

    const allEntries = [...eventEntries, ...manualEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    return { success: true, data: allEntries }
  } catch (error) {
    console.error('Error fetching financial data:', error)
    return { success: false, error: 'Failed to fetch financial data' }
  }
}

// Get comprehensive financial summary including event balances + transaction status
export async function getFinancialSummary(start?: Date, end?: Date) {
  try {
    const eventWhere: Prisma.EventWhereInput = { category: 'event' }
    const transactionWhere: Prisma.TransactionWhereInput = {}

    if (start && end) {
      eventWhere.start = { gte: start, lte: end }
      transactionWhere.date = { gte: start, lte: end }
    }

    const events = await prisma.event.findMany({
      where: eventWhere,
      select: {
        id: true,
        totalValue: true,
        deposit: true,
        paymentStatus: true,
        start: true,
        space: { select: { name: true } },
      },
    })

    const transactions = await prisma.transaction.findMany({
      where: transactionWhere,
      select: {
        eventId: true,
        type: true,
        category: true,
        amount: true,
        date: true,
        status: true,
      },
    })

    const eventIds = events.map((event) => event.id)
    const eventPaymentTransactions = eventIds.length
      ? await prisma.transaction.findMany({
          where: {
            eventId: { in: eventIds },
            type: 'income',
            status: 'paid',
          },
          select: {
            eventId: true,
            amount: true,
          },
        })
      : []

    const eventPayments = new Map<number, number>()
    eventPaymentTransactions.forEach((transaction) => {
      if (!transaction.eventId) return
      const amount = toNumber(transaction.amount)
      eventPayments.set(
        transaction.eventId,
        (eventPayments.get(transaction.eventId) || 0) + amount
      )
    })

    const summary = {
      eventIncome: {
        total: 0,
        depositsReceived: 0,
        pendingPayments: 0,
        paidEvents: 0,
        partialEvents: 0,
        unpaidEvents: 0,
        eventCount: events.length,
      },
      manualIncome: 0,
      manualExpense: 0,
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      servicePendingTotal: 0,
      byCategory: {} as Record<string, { income: number; expense: number }>,
      byMonth: {} as Record<string, { income: number; expense: number; events: number }>,
      bySpace: {} as Record<string, { income: number; events: number }>,
      forecast: {
        totalForecastIncome: 0,
        totalForecastExpense: 0,
        start: startOfDay(new Date()),
        end: endOfDay(addDays(new Date(), 30)),
      },
    }

    events.forEach((event) => {
      const totalValue = toNumber(event.totalValue)
      const deposit = Math.min(toNumber(event.deposit), totalValue)
      const additionalPayments = eventPayments.get(event.id) || 0
      const totalPaid = Math.min(deposit + additionalPayments, totalValue)
      const monthKey = event.start.toISOString().slice(0, 7)
      const spaceName = event.space.name
      const isPaid = totalPaid >= totalValue
      const isPartial = totalPaid > 0 && !isPaid
      const receivedAmount = totalPaid
      const pendingAmount = Math.max(totalValue - totalPaid, 0)

      summary.eventIncome.total += totalValue

      if (isPaid) summary.eventIncome.paidEvents++
      else if (isPartial) summary.eventIncome.partialEvents++
      else summary.eventIncome.unpaidEvents++

      summary.eventIncome.depositsReceived += receivedAmount
      summary.eventIncome.pendingPayments += pendingAmount

      if (!summary.byMonth[monthKey]) {
        summary.byMonth[monthKey] = { income: 0, expense: 0, events: 0 }
      }
      summary.byMonth[monthKey].events++
      summary.byMonth[monthKey].income += receivedAmount

      if (!summary.bySpace[spaceName]) {
        summary.bySpace[spaceName] = { income: 0, events: 0 }
      }
      summary.bySpace[spaceName].events++
      summary.bySpace[spaceName].income += receivedAmount

      if (!summary.byCategory.event_payment) {
        summary.byCategory.event_payment = { income: 0, expense: 0 }
      }
      summary.byCategory.event_payment.income += receivedAmount
    })

    transactions.forEach((transaction) => {
      const amount = toNumber(transaction.amount)
      const monthKey = transaction.date.toISOString().slice(0, 7)
      const isPaid = transaction.status === 'paid'

      if (transaction.type === 'expense' && !isPaid && SERVICE_PENDING_CATEGORIES.has(transaction.category)) {
        summary.servicePendingTotal += amount
      }

      if (transaction.status === 'pending') {
        if (transaction.type === 'income') summary.forecast.totalForecastIncome += amount
        else summary.forecast.totalForecastExpense += amount
      }

      if (!isPaid) return
      if (transaction.eventId && transaction.type === 'income') return

      if (transaction.type === 'income') summary.manualIncome += amount
      else summary.manualExpense += amount

      if (!summary.byCategory[transaction.category]) {
        summary.byCategory[transaction.category] = { income: 0, expense: 0 }
      }

      if (transaction.type === 'income') {
        summary.byCategory[transaction.category].income += amount
      } else {
        summary.byCategory[transaction.category].expense += amount
      }

      if (!summary.byMonth[monthKey]) {
        summary.byMonth[monthKey] = { income: 0, expense: 0, events: 0 }
      }

      if (transaction.type === 'income') {
        summary.byMonth[monthKey].income += amount
      } else {
        summary.byMonth[monthKey].expense += amount
      }
    })

    summary.totalIncome = summary.eventIncome.depositsReceived + summary.manualIncome
    summary.totalExpense = summary.manualExpense
    summary.balance = summary.totalIncome - summary.totalExpense

    return { success: true, data: summary }
  } catch (error) {
    console.error('Error fetching financial summary:', error)
    return { success: false, error: 'Failed to fetch summary' }
  }
}

export async function getTransactionsSummary(start?: Date, end?: Date) {
  try {
    const where = buildBaseTransactionWhere({ start, end, status: 'paid' })
    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        type: true,
        category: true,
        amount: true,
        date: true,
      },
    })

    const summary = {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      byCategory: {} as Record<string, { income: number; expense: number }>,
      byMonth: {} as Record<string, { income: number; expense: number }>,
    }

    transactions.forEach((transaction) => {
      const amount = toNumber(transaction.amount)
      const monthKey = transaction.date.toISOString().slice(0, 7)

      if (transaction.type === 'income') summary.totalIncome += amount
      else summary.totalExpense += amount

      if (!summary.byCategory[transaction.category]) {
        summary.byCategory[transaction.category] = { income: 0, expense: 0 }
      }
      if (transaction.type === 'income') {
        summary.byCategory[transaction.category].income += amount
      } else {
        summary.byCategory[transaction.category].expense += amount
      }

      if (!summary.byMonth[monthKey]) {
        summary.byMonth[monthKey] = { income: 0, expense: 0 }
      }
      if (transaction.type === 'income') {
        summary.byMonth[monthKey].income += amount
      } else {
        summary.byMonth[monthKey].expense += amount
      }
    })

    summary.balance = summary.totalIncome - summary.totalExpense
    return { success: true, data: summary }
  } catch (error) {
    console.error('Error fetching transactions summary:', error)
    return { success: false, error: 'Failed to fetch summary' }
  }
}

export async function createTransaction(data: {
  type: string
  category: string
  description: string
  amount: number
  date: Date
  status?: TransactionStatus
  paidAt?: Date | null
  notes?: string | null
  eventId?: number | null
  serviceTaskId?: number | null
}) {
  try {
    const status = data.status ?? 'paid'
    const paidAt = status === 'paid' ? data.paidAt ?? new Date(data.date) : null

    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        status,
        paidAt,
      },
    })

    if (transaction.eventId && transaction.type === 'income') {
      await recalculateEventPaymentStatus(transaction.eventId)
      revalidatePath('/')
    }

    revalidatePath('/dashboard')
    revalidatePath('/financial')
    return {
      success: true,
      data: {
        ...transaction,
        amount: toNumber(transaction.amount),
      },
    }
  } catch (error) {
    console.error('Error creating transaction:', error)
    return { success: false, error: 'Failed to create transaction' }
  }
}

export async function updateTransaction(
  id: number,
  data: Partial<{
    type: string
    category: string
    description: string
    amount: number
    date: Date
    status: TransactionStatus
    paidAt?: Date | null
    notes?: string | null
    eventId?: number | null
    serviceTaskId?: number | null
  }>
) {
  try {
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
      select: { eventId: true, type: true },
    })

    const updateData: Prisma.TransactionUpdateInput = { ...data }
    if (data.status === 'paid' && !data.paidAt) {
      updateData.paidAt = new Date()
    }
    if (data.status === 'pending') {
      updateData.paidAt = null
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
    })

    const eventIdsToUpdate = new Set<number>()
    if (existingTransaction?.eventId && existingTransaction.type === 'income') {
      eventIdsToUpdate.add(existingTransaction.eventId)
    }
    if (transaction.eventId && transaction.type === 'income') {
      eventIdsToUpdate.add(transaction.eventId)
    }

    for (const eventId of eventIdsToUpdate) {
      await recalculateEventPaymentStatus(eventId)
    }

    if (eventIdsToUpdate.size > 0) {
      revalidatePath('/')
    }

    revalidatePath('/dashboard')
    revalidatePath('/financial')
    return {
      success: true,
      data: {
        ...transaction,
        amount: toNumber(transaction.amount),
      },
    }
  } catch (error) {
    console.error('Error updating transaction:', error)
    return { success: false, error: 'Failed to update transaction' }
  }
}

export async function updateTransactionStatus(id: number, status: TransactionStatus) {
  try {
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
      select: { eventId: true, type: true },
    })

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        status,
        paidAt: status === 'paid' ? new Date() : null,
      },
    })

    if (existingTransaction?.eventId && existingTransaction.type === 'income') {
      await recalculateEventPaymentStatus(existingTransaction.eventId)
      revalidatePath('/')
    }

    revalidatePath('/dashboard')
    revalidatePath('/financial')
    return {
      success: true,
      data: {
        ...transaction,
        amount: toNumber(transaction.amount),
      },
    }
  } catch (error) {
    console.error('Error updating transaction status:', error)
    return { success: false, error: 'Failed to update transaction status' }
  }
}

export async function deleteTransaction(id: number) {
  try {
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
      select: { eventId: true, type: true },
    })

    await prisma.transaction.delete({
      where: { id },
    })

    if (existingTransaction?.eventId && existingTransaction.type === 'income') {
      await recalculateEventPaymentStatus(existingTransaction.eventId)
      revalidatePath('/')
    }

    revalidatePath('/dashboard')
    revalidatePath('/financial')
    return { success: true }
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return { success: false, error: 'Failed to delete transaction' }
  }
}
