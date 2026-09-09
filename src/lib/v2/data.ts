// ── Camada de leitura da v2 ────────────────────────────────────────────────
// FASE A: só leitura. Tudo aqui chama as MESMAS server actions que a v1 usa —
// nenhuma consulta nova, nenhuma regra de negócio nova. O papel deste arquivo
// é traduzir o formato do banco para os tipos de tela em types.ts.
//
// Regra que sustenta a convivência das duas versões: se um número aparece nas
// duas, ele vem da mesma action. Por isso:
//   • status de pagamento  → event.paymentStatus (o valor que o app grava)
//   • parcelas em atraso   → getInstallmentsForCalendar({ status: 'overdue' }),
//                            a mesma fonte do card "Em Atraso" da v1
//   • entrou / falta entrar→ o summary de getFinancialLedger, o mesmo do
//                            /financial da v1
//   • quanto já foi pago   → computeEventPaid(), regra única compartilhada

import { getEvents, getEventById, getEventsForList } from '@/app/actions/events'
import { getSpaces } from '@/app/actions/spaces'
import { getInstallmentsForCalendar } from '@/app/actions/installments'
import { getFinancialLedger, getTransactionsByEventId } from '@/app/actions/transactions'
import { getInterestDatesForCalendar } from '@/app/actions/interestDates'
import { getContractSignature } from '@/app/actions/clicksign'
import { getLatestGeneratedContractForEvent } from '@/app/actions/generatedContracts'
import { getServiceTasks, getPendingServiceTasks } from '@/app/actions/services'
import { computeEventPaid } from '@/lib/eventPaid'
import type {
  V2AgendaItem,
  V2ContractStatus,
  V2Event,
  V2Installment,
  V2Ledger,
  V2MonthPoint,
  V2PaymentStatus,
  V2Space,
  V2Stage,
} from './types'

// ── Espaços ────────────────────────────────────────────────────────────────
// A cor é parte da identidade do espaço em todas as telas. Os dois espaços
// atuais têm cor fixa pelo slug; qualquer espaço novo recebe a próxima cor da
// paleta, então cadastrar um terceiro espaço não quebra nada.
const SLUG_COLORS: Record<string, string> = {
  'rancho-aveiro': '#0F7B6C',
  'estancia-aveiro': '#B4530A',
}
const PALETTE = ['#1B5EDB', '#6740C4', '#B42318', '#96660B', '#0E7A4F', '#A83277']

function toSpace(raw: { id: number; name: string; slug?: string | null; address?: string | null }, index = 0): V2Space {
  const color = (raw.slug && SLUG_COLORS[raw.slug]) || PALETTE[index % PALETTE.length]
  return {
    id: raw.id,
    name: raw.name,
    short: raw.name.split(' ')[0],
    slug: raw.slug ?? null,
    address: raw.address ?? null,
    color,
    // 8 dígitos: a mesma cor com 12% de opacidade, para o fundo das pílulas.
    soft: `${color}1f`,
  }
}

export async function loadSpaces(): Promise<V2Space[]> {
  const res = await getSpaces()
  if (!res.success || !res.data) return []
  return res.data.map((s, i) => toSpace(s, i))
}

// Rótulos das categorias de lançamento. Mesmos textos da v1, mais
// 'installment_payment', que a v1 deixa passar com a chave crua.
const CATEGORY_LABELS: Record<string, string> = {
  event_payment: 'Pagamento de evento',
  installment_payment: 'Parcela de aluguel',
  deposit: 'Sinal/Depósito',
  rental: 'Aluguel',
  rental_installment: 'Parcela de aluguel',
  other_income: 'Outras receitas',
  service_cost: 'Custo de serviço',
  maintenance: 'Manutenção',
  supplies: 'Suprimentos',
  utilities: 'Utilidades',
  professional_payment: 'Pagamento a profissional',
  cleaning: 'Limpeza',
  other_expense: 'Outras despesas',
}

const categoryLabel = (key: string) => CATEGORY_LABELS[key] ?? key

// ── Traduções de estado ────────────────────────────────────────────────────
const EVENT_TYPE_LABELS: Record<string, string> = {
  casamento: 'Casamento',
  aniversario: 'Aniversário',
  confraternizacao: 'Confraternização',
  outros: 'Evento',
}

/**
 * Estado do contrato a partir da última assinatura registrada, caindo para o
 * campo contractStatus do evento quando não há assinatura na Clicksign.
 * 'signed' na Clicksign significa PARCIALMENTE assinado (o evento emite um
 * `sign` por signatário); 'closed' é que todos assinaram.
 */
function toContractStatus(
  signatureStatus: string | undefined,
  contractStatus: string | null | undefined,
  hasDocument: boolean,
): V2ContractStatus {
  switch (signatureStatus) {
    case 'closed':
      return 'signed'
    case 'signed':
      return 'partial'
    case 'uploaded':
    case 'signer_added':
    case 'sent_whatsapp':
      return 'sent'
  }
  if (contractStatus === 'signed') return 'signed'
  if (contractStatus === 'sent') return 'sent'
  return hasDocument ? 'draft' : 'none'
}

function toStage(
  event: { start: Date; status: string; category?: string },
  contract: V2ContractStatus,
  now: Date,
): V2Stage {
  if (event.category === 'visit') return 'visita'
  if (event.start < now && (contract === 'signed' || event.status === 'reserved')) return 'realizado'
  if (contract === 'signed') return 'confirmado'
  if (contract === 'sent' || contract === 'partial') return 'contrato'
  if (contract === 'draft' || event.status === 'confirming') return 'proposta'
  return 'interesse'
}

function toPayment(status: string | null | undefined): V2PaymentStatus {
  return status === 'paid' || status === 'partial' ? status : 'unpaid'
}

// ── Eventos ────────────────────────────────────────────────────────────────
/**
 * Lista de eventos para as telas Hoje e Eventos.
 *
 * O valor exato já pago NÃO é calculado aqui de propósito: a regra depende de
 * parcelas + transações avulsas por evento, o que exigiria uma consulta por
 * evento. A lista mostra o total contratado, o status que o app grava e o
 * progresso em número de parcelas; o valor em reais aparece no painel lateral,
 * que carrega o evento inteiro (loadEventDetail).
 */
export async function loadEvents(): Promise<V2Event[]> {
  const [eventsRes, instRes] = await Promise.all([
    getEventsForList(),
    getInstallmentsForCalendar({}),
  ])

  if (!eventsRes.success || !eventsRes.data) return []

  const installments = (instRes.success && instRes.data ? instRes.data : []).filter(
    (i: { isTransaction?: boolean }) => !i.isTransaction,
  )

  const byEvent = new Map<number, { total: number; paid: number }>()
  for (const i of installments as { eventId: number; status: string }[]) {
    const acc = byEvent.get(i.eventId) ?? { total: 0, paid: 0 }
    acc.total += 1
    if (i.status === 'paid') acc.paid += 1
    byEvent.set(i.eventId, acc)
  }

  const now = new Date()
  const spaceIndex = new Map<number, number>()

  return eventsRes.data.map((e, i): V2Event => {
    if (!spaceIndex.has(e.spaceId)) spaceIndex.set(e.spaceId, spaceIndex.size)
    const contract = toContractStatus(
      e.contractSignatures?.[0]?.status,
      e.contractStatus,
      (e._count?.generatedContracts ?? 0) + (e._count?.manualContracts ?? 0) > 0,
    )
    const counts = byEvent.get(e.id) ?? { total: 0, paid: 0 }
    return {
      id: e.id,
      title: e.title,
      type: EVENT_TYPE_LABELS[e.eventType ?? ''] ?? 'Evento',
      space: toSpace(e.space, spaceIndex.get(e.spaceId) ?? i),
      start: new Date(e.start),
      end: new Date(e.end),
      guests: e.guestCount ?? null,
      client: e.client
        ? { id: e.client.id, name: e.client.name, phone: e.client.phone, email: e.client.email, city: e.client.city }
        : null,
      value: e.totalValue,
      payment: toPayment(e.paymentStatus),
      contract,
      stage: toStage({ start: new Date(e.start), status: e.status, category: e.category }, contract, now),
      notes: e.notes ?? null,
      installmentsPaid: counts.paid,
      installmentsTotal: counts.total,
    }
  })
}

/** Evento completo para o painel lateral — inclui o valor exato já pago. */
export async function loadEventDetail(id: number): Promise<V2Event | null> {
  // A assinatura e o contrato gerado entram aqui porque getEventById não os
  // traz — sem eles o painel derivaria o estado do contrato só do campo
  // contractStatus e mostraria algo diferente da lista para o mesmo evento.
  // getContractSignature lê do banco; não chama a Clicksign.
  const [evRes, txRes, sigRes, genRes] = await Promise.all([
    getEventById(id),
    getTransactionsByEventId(id),
    getContractSignature(id),
    getLatestGeneratedContractForEvent(id),
  ])
  if (!evRes.success || !evRes.data) return null

  const e = evRes.data
  const transactions = txRes.success && txRes.data ? txRes.data : []

  const installments: V2Installment[] = e.installments.map((i) => ({
    id: i.id,
    n: i.installmentNumber,
    total: e.installments.length,
    amount: i.amount,
    dueDate: new Date(i.dueDate),
    paidAt: i.paidAt ? new Date(i.paidAt) : null,
    paidAmount: i.paidAmount,
    status: i.status,
    method: i.paymentMethod,
    isSinal: i.isSinal,
  }))

  const paid = computeEventPaid({
    deposit: e.deposit,
    installments: e.installments.map((i) => ({
      id: i.id,
      status: i.status,
      amount: i.amount,
      paidAmount: i.paidAmount,
      transactionId: i.transactionId,
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      status: t.status,
      amount: t.amount,
    })),
  })

  const hasDocument =
    e.manualContracts.length > 0 || !!(genRes.success && 'data' in genRes && genRes.data)
  const contract = toContractStatus(
    sigRes.success && sigRes.data ? sigRes.data.status : undefined,
    e.contractStatus,
    hasDocument,
  )
  const now = new Date()

  return {
    id: e.id,
    title: e.title,
    type: EVENT_TYPE_LABELS[e.eventType ?? ''] ?? 'Evento',
    space: toSpace(e.space),
    start: new Date(e.start),
    end: new Date(e.end),
    guests: e.guestCount ?? null,
    client: e.client
      ? { id: e.client.id, name: e.client.name, phone: e.client.phone, email: e.client.email, city: e.client.city }
      : null,
    value: e.totalValue,
    payment: toPayment(e.paymentStatus),
    contract,
    stage: toStage({ start: new Date(e.start), status: e.status, category: e.category }, contract, now),
    notes: e.notes ?? null,
    installmentsPaid: installments.filter((i) => i.status === 'paid').length,
    installmentsTotal: installments.length,
    paid,
    installments,
  }
}

/** Serviços cadastrados sem data marcada — a mesma lista que a home da v1 mostra. */
export async function loadUnscheduledTasks() {
  const res = await getPendingServiceTasks()
  if (!res.success || !res.data) return []
  return res.data.map((t) => ({
    id: t.id,
    name: t.serviceType.name,
    spaceName: t.space.name,
    responsible: t.responsible,
  }))
}

/** Contador de pendências da navegação — a mesma conta da tela Hoje. */
export async function loadPendingCount(): Promise<number> {
  const [events, overdueRes, tasks] = await Promise.all([
    loadEvents(),
    getInstallmentsForCalendar({ status: 'overdue' }),
    loadUnscheduledTasks(),
  ])
  const now = new Date()
  const awaitingSignature = events.filter((e) => e.contract === 'sent' || e.contract === 'partial').length
  const noContract = events.filter((e) => e.start >= now && (e.contract === 'none' || e.contract === 'draft')).length
  const overdue = overdueRes.success && overdueRes.data ? overdueRes.data.length : 0
  return awaitingSignature + overdue + tasks.length + noContract
}

// ── Agenda ─────────────────────────────────────────────────────────────────
/** Eventos, visitas, datas de interesse e serviços num fluxo só. */
export async function loadAgenda(start: Date, end: Date): Promise<V2AgendaItem[]> {
  const [evRes, interestRes, taskRes, spaces] = await Promise.all([
    getEvents(start, end),
    getInterestDatesForCalendar(),
    getServiceTasks(start, end),
    loadSpaces(),
  ])

  const spaceById = new Map(spaces.map((s) => [s.id, s]))
  const fallback = (raw: { id: number; name: string; slug?: string | null; address?: string | null }) =>
    spaceById.get(raw.id) ?? toSpace(raw)

  const items: V2AgendaItem[] = []

  if (evRes.success && evRes.data) {
    for (const e of evRes.data) {
      const isVisit = e.category === 'visit'
      items.push({
        id: `e${e.id}`,
        kind: isVisit ? 'visita' : 'evento',
        title: e.title,
        subtitle: isVisit
          ? (e.client?.name ?? 'Visita agendada')
          : [e.guestCount ? `${e.guestCount} convidados` : null, e.client?.name].filter(Boolean).join(' · '),
        space: fallback(e.space),
        start: new Date(e.start),
        end: new Date(e.end),
        eventId: e.id,
        value: isVisit ? undefined : e.totalValue,
      })
    }
  }

  if (interestRes.success && interestRes.data) {
    for (const d of interestRes.data) {
      const date = new Date(d.date)
      // Datas de interesse são o dia inteiro; o calendário só usa o dia.
      if (date < start || date > end) continue
      items.push({
        id: `i${d.id}`,
        kind: 'interesse',
        title: `Interesse — ${d.client.name}`,
        subtitle: d.notes ?? (d.numberOfPeople ? `${d.numberOfPeople} pessoas` : 'Data segurada, sem sinal'),
        space: fallback(d.space),
        start: date,
        end: date,
      })
    }
  }

  if (taskRes.success && taskRes.data) {
    for (const t of taskRes.data) {
      if (!t.start) continue
      items.push({
        id: `s${t.id}`,
        kind: 'servico',
        title: t.serviceType.name,
        subtitle: [t.responsible, t.event?.title].filter(Boolean).join(' · ') || 'Serviço agendado',
        space: fallback(t.space),
        start: new Date(t.start),
        end: t.end ? new Date(t.end) : new Date(t.start),
        eventId: t.eventId ?? undefined,
      })
    }
  }

  return items.sort((a, b) => +a.start - +b.start)
}

// ── Financeiro ─────────────────────────────────────────────────────────────
/** Lançamentos (o mesmo conjunto que a aba "Lançamentos" da v1 mostra). */
export async function loadLedger(range?: { start?: Date; end?: Date }): Promise<V2Ledger[]> {
  const res = await getFinancialLedger({ start: range?.start, end: range?.end })
  if (!res.success || !res.data) return []
  const now = new Date()
  return res.data.map((t): V2Ledger => {
    const date = new Date(t.date)
    return {
      id: `t${t.id}`,
      kind: t.type === 'expense' ? 'expense' : 'income',
      description: t.description,
      category: categoryLabel(t.category),
      amount: t.amount,
      date,
      status: t.status === 'pending' && date < now ? 'overdue' : t.status,
      eventId: t.eventId,
      spaceName: t.spaceName,
    }
  })
}

/** Parcelas a vencer e vencidas — a aba "Vencimentos" da v1. */
export async function loadUpcoming(): Promise<V2Ledger[]> {
  const res = await getInstallmentsForCalendar({})
  if (!res.success || !res.data) return []
  const now = new Date()
  return (res.data as {
    id: number
    title: string
    amount: number
    dueDate: Date
    status: string
    eventId: number | null
    spaceName: string
    isTransaction?: boolean
    transactionType?: string
  }[])
    .filter((i) => i.status !== 'paid')
    .map((i) => {
      const date = new Date(i.dueDate)
      return {
        id: `u${i.id}`,
        kind: i.isTransaction && i.transactionType === 'expense' ? ('expense' as const) : ('income' as const),
        description: i.title,
        category: i.isTransaction ? 'Lançamento do evento' : 'Parcela de aluguel',
        amount: i.amount,
        date,
        status: i.status === 'pending' && date < now ? 'overdue' : i.status,
        eventId: i.eventId,
        spaceName: i.spaceName,
      }
    })
}

/**
 * Os três números do topo do Financeiro.
 * "Em atraso" vem de getInstallmentsForCalendar({status:'overdue'}) — a mesma
 * chamada do card "Em Atraso" da v1, para os dois baterem sempre.
 */
export async function loadFinanceTotals(range: { start?: Date; end?: Date }) {
  const [ledgerRes, overdueRes, upcoming] = await Promise.all([
    getFinancialLedger({ start: range.start, end: range.end }),
    getInstallmentsForCalendar({ status: 'overdue' }),
    loadUpcoming(),
  ])

  const summary =
    ledgerRes.success && 'summary' in ledgerRes && ledgerRes.summary
      ? ledgerRes.summary
      : { paidIncome: 0, paidExpense: 0, pendingIncome: 0, pendingExpense: 0, servicePendingTotal: 0 }

  const overdue = (overdueRes.success && overdueRes.data ? overdueRes.data : []) as { amount: number }[]

  // "Falta entrar" vem das PARCELAS a vencer, não do pendingIncome do ledger.
  // O ledger só enxerga Transaction, e uma parcela só vira transação quando é
  // paga — então pelo ledger o valor a receber apareceria como zero mesmo com
  // dezenas de milhares em parcelas contratadas. Esta é a mesma fonte da aba
  // "A vencer" logo abaixo do número, então os dois sempre batem.
  const toReceive = upcoming
    .filter((u) => u.kind === 'income' && u.status !== 'overdue')
    .reduce((s, u) => s + u.amount, 0)

  return {
    received: summary.paidIncome,
    spent: summary.paidExpense,
    toReceive,
    lateTotal: overdue.reduce((s, i) => s + i.amount, 0),
    lateCount: overdue.length,
  }
}

/** Receita x despesa por mês, para o gráfico. Só o que já foi pago. */
export async function loadMonthly(months = 12): Promise<V2MonthPoint[]> {
  const res = await getFinancialLedger({})
  const entries = res.success && res.data ? res.data : []

  const points: V2MonthPoint[] = []
  const cursor = new Date()
  cursor.setDate(1)
  cursor.setHours(0, 0, 0, 0)
  cursor.setMonth(cursor.getMonth() - (months - 1))

  for (let i = 0; i < months; i++) {
    const monthStart = new Date(cursor)
    const monthEnd = new Date(cursor)
    monthEnd.setMonth(monthEnd.getMonth() + 1)

    let income = 0
    let expense = 0
    for (const t of entries) {
      if (t.status !== 'paid') continue
      const d = new Date(t.date)
      if (d < monthStart || d >= monthEnd) continue
      if (t.type === 'expense') expense += t.amount
      else income += t.amount
    }

    points.push({ date: monthStart, income, expense })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return points
}
