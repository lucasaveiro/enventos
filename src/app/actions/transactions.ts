'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

async function recalculateEventPaymentStatus(eventId: number) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { totalValue: true, deposit: true }
  })

  if (!event) return

  const payments = await prisma.transaction.aggregate({
    where: {
      eventId,
      type: 'income'
    },
    _sum: {
      amount: true
    }
  })

  const totalValue = event.totalValue.toNumber()
  const deposit = Math.min(event.deposit.toNumber(), totalValue)
  const paidFromTransactions = payments._sum.amount ? payments._sum.amount.toNumber() : 0
  const totalPaid = deposit + paidFromTransactions

  let paymentStatus = 'unpaid'
  if (totalPaid >= totalValue) {
    paymentStatus = 'paid'
  } else if (totalPaid > 0) {
    paymentStatus = 'partial'
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { paymentStatus }
  })
}

export async function getTransactions(start?: Date, end?: Date) {
  try {
    const where: Record<string, unknown> = {}
    if (start && end) {
      where.date = {
        gte: start,
        lte: end
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        event: {
          include: {
            client: true,
            space: true
          }
        },
        serviceTask: {
          include: {
            serviceType: true,
            space: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    const serializedTransactions = transactions.map(transaction => ({
      ...transaction,
      amount: transaction.amount.toNumber(),
      event: transaction.event ? {
        ...transaction.event,
        totalValue: transaction.event.totalValue.toNumber(),
        deposit: transaction.event.deposit.toNumber()
      } : null
    }))

    return { success: true, data: serializedTransactions }
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return { success: false, error: 'Failed to fetch transactions' }
  }
}

// Get all financial data including events and manual transactions
export async function getAllFinancialData(start?: Date, end?: Date) {
  try {
    const eventWhere: Record<string, unknown> = {}
    const transactionWhere: Record<string, unknown> = {}

    if (start && end) {
      eventWhere.start = { gte: start, lte: end }
      transactionWhere.date = { gte: start, lte: end }
    }

    // Fetch events with their financial data
    const events = await prisma.event.findMany({
      where: eventWhere,
      include: {
        client: true,
        space: true
      },
      orderBy: { start: 'desc' }
    })

    // Fetch manual transactions
    const transactions = await prisma.transaction.findMany({
      where: transactionWhere,
      include: {
        event: {
          include: {
            client: true,
            space: true
          }
        },
        serviceTask: {
          include: {
            serviceType: true,
            space: true
          }
        }
      },
      orderBy: { date: 'desc' }
    })

    // Transform events to financial entries (income from events)
    const eventEntries = events.map(event => ({
      id: `event-${event.id}`,
      type: 'income' as const,
      category: 'event_payment',
      description: `${event.title}${event.client ? ` - ${event.client.name}` : ''}`,
      amount: event.totalValue.toNumber(),
      depositAmount: event.deposit.toNumber(),
      date: event.start,
      paymentStatus: event.paymentStatus,
      source: 'event' as const,
      sourceId: event.id,
      eventId: event.id,
      event: {
        ...event,
        totalValue: event.totalValue.toNumber(),
        deposit: event.deposit.toNumber()
      },
      space: event.space
    }))

    // Transform manual transactions
    const manualEntries = transactions.map(t => ({
      id: `transaction-${t.id}`,
      type: t.type as 'income' | 'expense',
      category: t.category,
      description: t.description,
      amount: t.amount.toNumber(),
      depositAmount: 0,
      date: t.date,
      paymentStatus: null,
      source: 'manual' as const,
      sourceId: t.id,
      eventId: t.eventId,
      event: t.event ? {
        ...t.event,
        totalValue: t.event.totalValue.toNumber(),
        deposit: t.event.deposit.toNumber()
      } : null,
      space: t.event?.space || t.serviceTask?.space || null,
      serviceTask: t.serviceTask,
      notes: t.notes
    }))

    // Combine and sort by date
    const allEntries = [...eventEntries, ...manualEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    return { success: true, data: allEntries }
  } catch (error) {
    console.error('Error fetching financial data:', error)
    return { success: false, error: 'Failed to fetch financial data' }
  }
}

// Get comprehensive financial summary including events
export async function getFinancialSummary(start?: Date, end?: Date) {
  try {
    const eventWhere: Record<string, unknown> = {}
    const transactionWhere: Record<string, unknown> = {}

    if (start && end) {
      eventWhere.start = { gte: start, lte: end }
      transactionWhere.date = { gte: start, lte: end }
    }

    // Fetch events
    const events = await prisma.event.findMany({
      where: eventWhere,
      select: {
        id: true,
        totalValue: true,
        deposit: true,
        paymentStatus: true,
        start: true,
        space: { select: { name: true } }
      }
    })

    // Fetch manual transactions
    const transactions = await prisma.transaction.findMany({
      where: transactionWhere,
      select: {
        eventId: true,
        type: true,
        category: true,
        amount: true,
        date: true
      }
    })

    const eventIds = events.map(event => event.id)
    const eventPaymentTransactions = eventIds.length
      ? await prisma.transaction.findMany({
          where: {
            eventId: { in: eventIds },
            type: 'income'
          },
          select: {
            eventId: true,
            amount: true
          }
        })
      : []

    const eventPayments = new Map<number, number>()
    eventPaymentTransactions.forEach(transaction => {
      if (!transaction.eventId) return
      const amount = transaction.amount.toNumber()
      eventPayments.set(
        transaction.eventId,
        (eventPayments.get(transaction.eventId) || 0) + amount
      )
    })

    const summary = {
      // Event-based income
      eventIncome: {
        total: 0,
        depositsReceived: 0,
        pendingPayments: 0,
        paidEvents: 0,
        partialEvents: 0,
        unpaidEvents: 0,
        eventCount: events.length
      },
      // Manual transactions
      manualIncome: 0,
      manualExpense: 0,
      // Combined totals
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      // By category
      byCategory: {} as Record<string, { income: number; expense: number }>,
      // By month
      byMonth: {} as Record<string, { income: number; expense: number; events: number }>,
      // By space (from events)
      bySpace: {} as Record<string, { income: number; events: number }>
    }

    // Process events
    events.forEach(event => {
      const totalValue = event.totalValue.toNumber()
      const deposit = Math.min(event.deposit.toNumber(), totalValue)
      const additionalPayments = eventPayments.get(event.id) || 0
      const totalPaid = Math.min(deposit + additionalPayments, totalValue)
      const monthKey = event.start.toISOString().slice(0, 7)
      const spaceName = event.space.name
      const isPaid = totalPaid >= totalValue
      const isPartial = totalPaid > 0 && !isPaid
      const receivedAmount = totalPaid
      const pendingAmount = Math.max(totalValue - totalPaid, 0)

      summary.eventIncome.total += totalValue

      if (isPaid) {
        summary.eventIncome.paidEvents++
      } else if (isPartial) {
        summary.eventIncome.partialEvents++
      } else {
        summary.eventIncome.unpaidEvents++
      }

      summary.eventIncome.depositsReceived += receivedAmount
      summary.eventIncome.pendingPayments += pendingAmount

      // By month
      if (!summary.byMonth[monthKey]) {
        summary.byMonth[monthKey] = { income: 0, expense: 0, events: 0 }
      }
      summary.byMonth[monthKey].events++
      summary.byMonth[monthKey].income += receivedAmount

      // By space
      if (!summary.bySpace[spaceName]) {
        summary.bySpace[spaceName] = { income: 0, events: 0 }
      }
      summary.bySpace[spaceName].events++
      summary.bySpace[spaceName].income += receivedAmount

      // By category
      if (!summary.byCategory['event_payment']) {
        summary.byCategory['event_payment'] = { income: 0, expense: 0 }
      }
      summary.byCategory['event_payment'].income += receivedAmount
    })

    // Process manual transactions
    transactions.forEach(t => {
      const amount = t.amount.toNumber()
      const monthKey = t.date.toISOString().slice(0, 7)

      if (t.eventId && t.type === 'income') {
        return
      }

      if (t.type === 'income') {
        summary.manualIncome += amount
      } else {
        summary.manualExpense += amount
      }

      // By category
      if (!summary.byCategory[t.category]) {
        summary.byCategory[t.category] = { income: 0, expense: 0 }
      }
      if (t.type === 'income') {
        summary.byCategory[t.category].income += amount
      } else {
        summary.byCategory[t.category].expense += amount
      }

      // By month
      if (!summary.byMonth[monthKey]) {
        summary.byMonth[monthKey] = { income: 0, expense: 0, events: 0 }
      }
      if (t.type === 'income') {
        summary.byMonth[monthKey].income += amount
      } else {
        summary.byMonth[monthKey].expense += amount
      }
    })

    // Calculate totals (income = paid events + deposits received + manual income)
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
    const where: Record<string, unknown> = {}
    if (start && end) {
      where.date = {
        gte: start,
        lte: end
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        type: true,
        category: true,
        amount: true,
        date: true
      }
    })

    const summary = {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      byCategory: {} as Record<string, { income: number; expense: number }>,
      byMonth: {} as Record<string, { income: number; expense: number }>
    }

    transactions.forEach(t => {
      const amount = t.amount.toNumber()
      const monthKey = t.date.toISOString().slice(0, 7)

      if (t.type === 'income') {
        summary.totalIncome += amount
      } else {
        summary.totalExpense += amount
      }

      if (!summary.byCategory[t.category]) {
        summary.byCategory[t.category] = { income: 0, expense: 0 }
      }
      if (t.type === 'income') {
        summary.byCategory[t.category].income += amount
      } else {
        summary.byCategory[t.category].expense += amount
      }

      if (!summary.byMonth[monthKey]) {
        summary.byMonth[monthKey] = { income: 0, expense: 0 }
      }
      if (t.type === 'income') {
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
  notes?: string | null
  eventId?: number | null
  serviceTaskId?: number | null
}) {
  try {
    const transaction = await prisma.transaction.create({
      data
    })
    if (transaction.eventId && transaction.type === 'income') {
      await recalculateEventPaymentStatus(transaction.eventId)
      revalidatePath('/')
    }
    revalidatePath('/dashboard')
    return {
      success: true,
      data: {
        ...transaction,
        amount: transaction.amount.toNumber()
      }
    }
  } catch (error) {
    console.error('Error creating transaction:', error)
    return { success: false, error: 'Failed to create transaction' }
  }
}

export async function updateTransaction(id: number, data: Partial<{
  type: string
  category: string
  description: string
  amount: number
  date: Date
  notes?: string | null
  eventId?: number | null
  serviceTaskId?: number | null
}>) {
  try {
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
      select: { eventId: true, type: true }
    })
    const transaction = await prisma.transaction.update({
      where: { id },
      data
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
    return {
      success: true,
      data: {
        ...transaction,
        amount: transaction.amount.toNumber()
      }
    }
  } catch (error) {
    console.error('Error updating transaction:', error)
    return { success: false, error: 'Failed to update transaction' }
  }
}

export async function deleteTransaction(id: number) {
  try {
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
      select: { eventId: true, type: true }
    })
    await prisma.transaction.delete({
      where: { id }
    })
    if (existingTransaction?.eventId && existingTransaction.type === 'income') {
      await recalculateEventPaymentStatus(existingTransaction.eventId)
      revalidatePath('/')
    }
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return { success: false, error: 'Failed to delete transaction' }
  }
}
