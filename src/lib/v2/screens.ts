// ── Leitura da v2, no servidor ─────────────────────────────────────────────
// Uma função por tela. Cada uma faz as consultas em paralelo AQUI (paralelismo
// de verdade) e devolve um payload só, que o Server Component entrega pronto ao
// componente cliente.
//
// Por que isto existe: a versão anterior (data.ts) rodava no navegador e cada
// consulta virava um POST de server action. O Next enfileira server actions
// (app-call-server → actionQueue), então os Promise.all das telas eram
// sequenciais: abrir "Hoje" custava ~14 requisições em fila, cada uma pagando
// round-trip e uma consulta de sessão.
//
// Este módulo só pode ser importado por código de servidor (usa Prisma).
//
// Regra que sustenta a convivência das duas versões: se um número aparece nas
// duas, ele nasce da mesma conta. Por isso `computeEventPaid` continua sendo a
// fonte única de "quanto já foi pago", e "em atraso" continua sendo parcela
// vencida + lançamento avulso pendente com data passada — o mesmo conjunto do
// card "Em Atraso" da v1.

import { cache } from 'react'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { computeEventPaid } from '@/lib/eventPaid'
import { startOfToday, endOfToday } from '@/lib/today'
import {
  categoryLabel,
  eventTypeLabel,
  toContractStatus,
  toPayment,
  toSpace,
  toStage,
} from './adapters'
import type {
  V2AgendaItem,
  V2Event,
  V2Installment,
  V2Ledger,
  V2MonthPoint,
  V2Space,
} from './types'

const num = (v: Prisma.Decimal) => v.toNumber()

const CLIENT_SELECT = { id: true, name: true, phone: true, email: true, city: true }
const SPACE_SELECT = { id: true, name: true, slug: true, address: true }

// Campos que as telas da v2 realmente usam. A action equivalente da v1
// (getEventsForList) traz também profissionais e quatro _count — 492ms contra
// os ~250ms deste select.
const EVENT_SELECT = {
  id: true,
  title: true,
  category: true,
  eventType: true,
  start: true,
  end: true,
  status: true,
  paymentStatus: true,
  contractStatus: true,
  totalValue: true,
  guestCount: true,
  notes: true,
  spaceId: true,
  client: { select: CLIENT_SELECT },
  space: { select: SPACE_SELECT },
  // A lista deriva o estado do contrato da assinatura mais recente, sem filtrar
  // canceladas — mesmo critério de getEventsForList, para os dois baterem.
  contractSignatures: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true } },
  _count: { select: { generatedContracts: true, manualContracts: true } },
} satisfies Prisma.EventSelect

// ── Blocos reutilizáveis ───────────────────────────────────────────────────
// `cache()` memoiza por request: o layout e a página renderizam no mesmo
// request, então loadEvents() roda uma vez só mesmo sendo pedido pelos dois.

export const loadSpaces = cache(async (): Promise<V2Space[]> => {
  const spaces = await prisma.space.findMany({ select: SPACE_SELECT, orderBy: { name: 'asc' } })
  return spaces.map((s, i) => toSpace(s, i))
})

export const loadEvents = cache(async (): Promise<V2Event[]> => {
  const [rows, counts, spaces] = await Promise.all([
    prisma.event.findMany({
      where: { category: 'event' },
      select: EVENT_SELECT,
      orderBy: { start: 'desc' },
    }),
    // Contagem de parcelas por evento. Puxar as 348 parcelas com os includes só
    // para contá-las custava ~660ms; o groupBy custa ~70ms.
    prisma.paymentInstallment.groupBy({ by: ['eventId', 'status'], _count: { _all: true } }),
    loadSpaces(),
  ])

  const byEvent = new Map<number, { total: number; paid: number }>()
  for (const row of counts) {
    const acc = byEvent.get(row.eventId) ?? { total: 0, paid: 0 }
    acc.total += row._count._all
    if (row.status === 'paid') acc.paid += row._count._all
    byEvent.set(row.eventId, acc)
  }

  const spaceById = new Map(spaces.map((s) => [s.id, s]))
  const now = new Date()

  return rows.map((e): V2Event => {
    const contract = toContractStatus(
      e.contractSignatures[0]?.status,
      e.contractStatus,
      e._count.generatedContracts + e._count.manualContracts > 0,
    )
    const counted = byEvent.get(e.id) ?? { total: 0, paid: 0 }
    return {
      id: e.id,
      title: e.title,
      type: eventTypeLabel(e.eventType),
      space: spaceById.get(e.spaceId) ?? toSpace(e.space),
      start: e.start,
      end: e.end,
      guests: e.guestCount ?? null,
      client: e.client,
      value: num(e.totalValue),
      payment: toPayment(e.paymentStatus),
      contract,
      stage: toStage({ start: e.start, status: e.status, category: e.category }, contract, now),
      notes: e.notes ?? null,
      installmentsPaid: counted.paid,
      installmentsTotal: counted.total,
    }
  })
})

/** Serviços cadastrados sem data marcada — a mesma lista que a home da v1 mostra. */
export const loadUnscheduledTasks = cache(async () => {
  const tasks = await prisma.serviceTask.findMany({
    where: { start: null },
    select: {
      id: true,
      responsible: true,
      serviceType: { select: { name: true } },
      space: { select: { name: true } },
    },
  })
  return tasks.map((t) => ({
    id: t.id,
    name: t.serviceType.name,
    spaceName: t.space.name,
    responsible: t.responsible,
  }))
})

/** Eventos, visitas, datas de interesse e serviços num fluxo só. */
export async function loadAgenda(start: Date, end: Date): Promise<V2AgendaItem[]> {
  const [events, interests, tasks, spaces] = await Promise.all([
    prisma.event.findMany({
      where: { start: { gte: start, lte: end } },
      select: {
        id: true,
        title: true,
        category: true,
        start: true,
        end: true,
        guestCount: true,
        totalValue: true,
        client: { select: { name: true } },
        space: { select: SPACE_SELECT },
      },
      orderBy: { start: 'asc' },
    }),
    // Só 'interest': confirmadas viraram evento e apareceriam duplicadas.
    prisma.clientInterestDate.findMany({
      where: { status: 'interest', date: { gte: start, lte: end } },
      select: {
        id: true,
        date: true,
        notes: true,
        numberOfPeople: true,
        client: { select: { name: true } },
        space: { select: SPACE_SELECT },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.serviceTask.findMany({
      where: { start: { not: null, gte: start, lte: end } },
      select: {
        id: true,
        start: true,
        end: true,
        responsible: true,
        eventId: true,
        serviceType: { select: { name: true } },
        space: { select: SPACE_SELECT },
        event: { select: { title: true } },
      },
      orderBy: { start: 'asc' },
    }),
    loadSpaces(),
  ])

  const spaceById = new Map(spaces.map((s) => [s.id, s]))
  const resolve = (raw: { id: number; name: string; slug: string | null; address: string | null }) =>
    spaceById.get(raw.id) ?? toSpace(raw)

  const items: V2AgendaItem[] = []

  for (const e of events) {
    const isVisit = e.category === 'visit'
    items.push({
      id: `e${e.id}`,
      kind: isVisit ? 'visita' : 'evento',
      title: e.title,
      subtitle: isVisit
        ? (e.client?.name ?? 'Visita agendada')
        : [e.guestCount ? `${e.guestCount} convidados` : null, e.client?.name].filter(Boolean).join(' · '),
      space: resolve(e.space),
      start: e.start,
      end: e.end,
      eventId: e.id,
      value: isVisit ? undefined : num(e.totalValue),
    })
  }

  for (const d of interests) {
    items.push({
      id: `i${d.id}`,
      kind: 'interesse',
      title: `Interesse — ${d.client.name}`,
      subtitle: d.notes ?? (d.numberOfPeople ? `${d.numberOfPeople} pessoas` : 'Data segurada, sem sinal'),
      space: resolve(d.space),
      start: d.date,
      end: d.date,
    })
  }

  for (const t of tasks) {
    if (!t.start) continue
    items.push({
      id: `s${t.id}`,
      kind: 'servico',
      title: t.serviceType.name,
      subtitle: [t.responsible, t.event?.title].filter(Boolean).join(' · ') || 'Serviço agendado',
      space: resolve(t.space),
      start: t.start,
      end: t.end ?? t.start,
      eventId: t.eventId ?? undefined,
    })
  }

  return items.sort((a, b) => +a.start - +b.start)
}

/**
 * Parcelas e lançamentos ainda não pagos — a aba "A vencer" e a origem do
 * "Em atraso". Vencido = parcela já marcada como vencida OU com vencimento
 * anterior a hoje; é a mesma conta que checkOverdueInstallments grava, então a
 * v2 nunca mostra um número defasado esperando a v1 rodar a manutenção.
 */
export const loadUpcoming = cache(async (): Promise<V2Ledger[]> => {
  const todayStart = startOfToday()

  const [installments, transactions] = await Promise.all([
    prisma.paymentInstallment.findMany({
      where: { status: { not: 'paid' } },
      select: {
        id: true,
        installmentNumber: true,
        isSinal: true,
        amount: true,
        dueDate: true,
        status: true,
        eventId: true,
        event: {
          select: { title: true, client: { select: { name: true } }, space: { select: { name: true } } },
        },
      },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.transaction.findMany({
      where: { installment: { is: null }, status: 'pending', eventId: { not: null } },
      select: {
        id: true,
        description: true,
        amount: true,
        date: true,
        type: true,
        eventId: true,
        event: { select: { space: { select: { name: true } } } },
      },
      orderBy: { date: 'asc' },
    }),
  ])

  const rows: V2Ledger[] = installments.map((i) => ({
    id: `u${i.id}`,
    kind: 'income',
    description: `${i.isSinal ? 'Sinal' : `Parcela ${i.installmentNumber}`} - ${i.event.client?.name || i.event.title}`,
    category: 'Parcela de aluguel',
    amount: num(i.amount),
    date: i.dueDate,
    status: i.status === 'overdue' || i.dueDate < todayStart ? 'overdue' : 'pending',
    eventId: i.eventId,
    spaceName: i.event.space.name,
  }))

  for (const t of transactions) {
    rows.push({
      id: `u${t.id + 1_000_000}`,
      kind: t.type === 'expense' ? 'expense' : 'income',
      description: `${t.type === 'income' ? 'Receber' : 'Pagar'}: ${t.description}`,
      category: 'Lançamento do evento',
      amount: num(t.amount),
      date: t.date,
      status: t.date < todayStart ? 'overdue' : 'pending',
      eventId: t.eventId,
      spaceName: t.event?.space.name ?? null,
    })
  }

  return rows.sort((a, b) => +a.date - +b.date)
})

type Range = { start?: Date; end?: Date }

/** Lançamentos do período + o resumo que alimenta "Entrou" e "Despesas". */
async function loadLedgerWithSummary(range: Range) {
  const where: Prisma.TransactionWhereInput = {}
  if (range.start || range.end) {
    where.date = {}
    if (range.start) where.date.gte = range.start
    if (range.end) where.date.lte = range.end
  }

  const rows = await prisma.transaction.findMany({
    where,
    select: {
      id: true,
      type: true,
      category: true,
      description: true,
      amount: true,
      date: true,
      status: true,
      eventId: true,
      event: { select: { space: { select: { name: true } } } },
      serviceTask: { select: { space: { select: { name: true } } } },
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })

  const todayStart = startOfToday()
  let paidIncome = 0
  let paidExpense = 0

  const entries = rows.map((t): V2Ledger => {
    const amount = num(t.amount)
    if (t.status === 'paid') {
      if (t.type === 'income') paidIncome += amount
      else paidExpense += amount
    }
    return {
      id: `t${t.id}`,
      kind: t.type === 'expense' ? 'expense' : 'income',
      description: t.description,
      category: categoryLabel(t.category),
      amount,
      date: t.date,
      status: t.status === 'pending' && t.date < todayStart ? 'overdue' : t.status,
      eventId: t.eventId,
      spaceName: t.event?.space.name ?? t.serviceTask?.space.name ?? null,
    }
  })

  return { entries, paidIncome, paidExpense }
}

/** Receita x despesa por mês, para o gráfico. Só o que já foi pago. */
async function loadMonthly(months = 12): Promise<V2MonthPoint[]> {
  const cursor = new Date()
  cursor.setDate(1)
  cursor.setHours(0, 0, 0, 0)
  cursor.setMonth(cursor.getMonth() - (months - 1))
  const from = new Date(cursor)

  const rows = await prisma.transaction.findMany({
    where: { status: 'paid', date: { gte: from } },
    select: { date: true, amount: true, type: true },
  })

  const points: V2MonthPoint[] = []
  for (let i = 0; i < months; i++) {
    const monthStart = new Date(cursor)
    const monthEnd = new Date(cursor)
    monthEnd.setMonth(monthEnd.getMonth() + 1)

    let income = 0
    let expense = 0
    for (const t of rows) {
      if (t.date < monthStart || t.date >= monthEnd) continue
      if (t.type === 'expense') expense += num(t.amount)
      else income += num(t.amount)
    }

    points.push({ date: monthStart, income, expense })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return points
}

export type V2Totals = {
  received: number
  spent: number
  toReceive: number
  lateTotal: number
  lateCount: number
}

function totalsFrom(
  ledger: { paidIncome: number; paidExpense: number },
  upcoming: V2Ledger[],
): V2Totals {
  // "Falta entrar" vem das PARCELAS a vencer, não do pendingIncome do ledger: o
  // ledger só enxerga Transaction, e uma parcela só vira transação quando é
  // paga — pelo ledger o valor a receber apareceria como zero mesmo com dezenas
  // de milhares contratados.
  const late = upcoming.filter((u) => u.status === 'overdue')
  return {
    received: ledger.paidIncome,
    spent: ledger.paidExpense,
    toReceive: upcoming
      .filter((u) => u.kind === 'income' && u.status !== 'overdue')
      .reduce((s, u) => s + u.amount, 0),
    lateTotal: late.reduce((s, u) => s + u.amount, 0),
    lateCount: late.length,
  }
}

// ── Uma leitura por tela ───────────────────────────────────────────────────

export async function getHojeScreen() {
  await requireAuth()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const [events, todayItems, tasks, ledger, upcoming] = await Promise.all([
    loadEvents(),
    loadAgenda(startOfToday(), endOfToday()),
    loadUnscheduledTasks(),
    loadLedgerWithSummary({ start: monthStart, end: monthEnd }),
    loadUpcoming(),
  ])

  return { events, todayItems, tasks, totals: totalsFrom(ledger, upcoming) }
}

export async function getEventosScreen() {
  await requireAuth()
  const [events, spaces] = await Promise.all([loadEvents(), loadSpaces()])
  return { events, spaces }
}

export async function getAgendaScreen(start: Date, end: Date) {
  await requireAuth()
  const [items, spaces] = await Promise.all([loadAgenda(start, end), loadSpaces()])
  return { items, spaces }
}

export async function getFinanceiroScreen(range: Range) {
  await requireAuth()
  const [ledger, upcoming, monthly] = await Promise.all([
    loadLedgerWithSummary(range),
    loadUpcoming(),
    loadMonthly(12),
  ])
  return {
    ledger: ledger.entries,
    upcoming,
    monthly,
    totals: totalsFrom(ledger, upcoming),
  }
}

export async function getCadastrosScreen() {
  await requireAuth()
  const [clients, professionals, services, events, spaces] = await Promise.all([
    // Os campos além de nome/telefone/cidade/e-mail não aparecem na tabela, mas
    // são o que o ClientModal precisa para abrir preenchido na edição — evita
    // uma segunda consulta a cada clique numa linha.
    prisma.client.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        city: true,
        email: true,
        cpf: true,
        rg: true,
        address: true,
        state: true,
        notes: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.professional.findMany({
      select: { id: true, name: true, type: true, phone: true },
      orderBy: { name: 'asc' },
    }),
    prisma.serviceType.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    }),
    loadEvents(),
    loadSpaces(),
  ])
  return { clients, professionals, services, events, spaces }
}

/** Contador de pendências da navegação — a mesma conta da tela "Hoje". */
export async function getPendingCount(): Promise<number> {
  await requireAuth()
  const [events, upcoming, tasks] = await Promise.all([
    loadEvents(),
    loadUpcoming(),
    loadUnscheduledTasks(),
  ])
  const now = new Date()
  const awaitingSignature = events.filter((e) => e.contract === 'sent' || e.contract === 'partial').length
  const noContract = events.filter(
    (e) => e.start >= now && (e.contract === 'none' || e.contract === 'draft'),
  ).length
  const overdue = upcoming.filter((u) => u.status === 'overdue').length
  return awaitingSignature + overdue + tasks.length + noContract
}

/**
 * Evento completo para o painel lateral, com o valor exato já pago.
 * Substitui as quatro chamadas que o painel fazia do navegador (evento,
 * lançamentos, assinatura e contrato gerado) por uma leitura só.
 */
export async function getEventDetail(id: number): Promise<V2Event | null> {
  await requireAuth()

  const [event, transactions, signature, generated, spaces] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        category: true,
        eventType: true,
        start: true,
        end: true,
        status: true,
        paymentStatus: true,
        contractStatus: true,
        totalValue: true,
        deposit: true,
        guestCount: true,
        notes: true,
        spaceId: true,
        client: { select: CLIENT_SELECT },
        space: { select: SPACE_SELECT },
        installments: {
          orderBy: { installmentNumber: 'asc' },
          select: {
            id: true,
            installmentNumber: true,
            amount: true,
            dueDate: true,
            paidAt: true,
            paidAmount: true,
            status: true,
            paymentMethod: true,
            isSinal: true,
            transactionId: true,
          },
        },
        _count: { select: { manualContracts: true } },
      },
    }),
    // Só lançamentos avulsos: os criados pela baixa de parcela já são
    // representados pela própria parcela (contar os dois dobraria o valor).
    prisma.transaction.findMany({
      where: { eventId: id, installment: { is: null } },
      select: { id: true, type: true, status: true, amount: true },
    }),
    prisma.contractSignature.findFirst({
      where: { eventId: id, status: { notIn: ['cancelled'] } },
      orderBy: { createdAt: 'desc' },
      select: { status: true },
    }),
    prisma.generatedContract.findFirst({
      where: { eventId: id },
      orderBy: { version: 'desc' },
      select: { id: true },
    }),
    loadSpaces(),
  ])

  if (!event) return null

  const installments: V2Installment[] = event.installments.map((i) => ({
    id: i.id,
    n: i.installmentNumber,
    total: event.installments.length,
    amount: num(i.amount),
    dueDate: i.dueDate,
    paidAt: i.paidAt,
    paidAmount: i.paidAmount ? num(i.paidAmount) : null,
    status: i.status,
    method: i.paymentMethod,
    isSinal: i.isSinal,
  }))

  const paid = computeEventPaid({
    deposit: num(event.deposit),
    installments: event.installments.map((i) => ({
      id: i.id,
      status: i.status,
      amount: num(i.amount),
      paidAmount: i.paidAmount ? num(i.paidAmount) : null,
      transactionId: i.transactionId,
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      status: t.status,
      amount: num(t.amount),
    })),
  })

  const contract = toContractStatus(
    signature?.status,
    event.contractStatus,
    event._count.manualContracts > 0 || !!generated,
  )
  const spaceById = new Map(spaces.map((s) => [s.id, s]))
  const now = new Date()

  return {
    id: event.id,
    title: event.title,
    type: eventTypeLabel(event.eventType),
    space: spaceById.get(event.spaceId) ?? toSpace(event.space),
    start: event.start,
    end: event.end,
    guests: event.guestCount ?? null,
    client: event.client,
    value: num(event.totalValue),
    payment: toPayment(event.paymentStatus),
    contract,
    stage: toStage(
      { start: event.start, status: event.status, category: event.category },
      contract,
      now,
    ),
    notes: event.notes ?? null,
    installmentsPaid: installments.filter((i) => i.status === 'paid').length,
    installmentsTotal: installments.length,
    paid,
    installments,
  }
}
