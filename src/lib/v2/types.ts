// ── Tipos de visualização da v2 ────────────────────────────────────────────
// Formas prontas para a tela, não para o banco. Os adaptadores em data.ts
// convertem o que as server actions devolvem para cá — assim as telas não
// conhecem Prisma, Decimal nem nomes de coluna, e o dia em que o schema mudar
// só os adaptadores mudam.
//
// O espaço vem DESNORMALIZADO dentro de cada item (e não como um id para
// consultar num mapa) porque toda tela precisa da cor e do nome curto junto
// com o dado, e passar um mapa por toda a árvore só criaria cerimônia.

export type V2PaymentStatus = 'paid' | 'partial' | 'unpaid'
export type V2ContractStatus = 'none' | 'draft' | 'sent' | 'partial' | 'signed'
export type V2Stage = 'interesse' | 'visita' | 'proposta' | 'contrato' | 'confirmado' | 'realizado'
export type V2AgendaKind = 'evento' | 'visita' | 'interesse' | 'servico'

export type V2Space = {
  id: number
  name: string
  /** Nome curto para caber em pílulas e células de calendário. */
  short: string
  slug: string | null
  address: string | null
  color: string
  soft: string
}

export type V2Installment = {
  id: number
  n: number
  total: number
  amount: number
  dueDate: Date
  paidAt: Date | null
  paidAmount: number | null
  /** pending | paid | overdue, como gravado no banco. */
  status: string
  method: string | null
  isSinal: boolean
}

export type V2Client = {
  id: number | null
  name: string
  phone: string | null
  email: string | null
  city: string | null
}

export type V2Event = {
  id: number
  title: string
  /** Rótulo already legível: "Casamento", "Aniversário"... */
  type: string
  space: V2Space
  start: Date
  end: Date
  guests: number | null
  client: V2Client | null
  value: number
  payment: V2PaymentStatus
  contract: V2ContractStatus
  stage: V2Stage
  notes: string | null
  /** Contagem de parcelas — o valor exato pago só é carregado no painel. */
  installmentsPaid: number
  installmentsTotal: number
  /** Preenchido só por loadEventDetail(), no painel lateral. */
  paid?: number
  installments?: V2Installment[]
}

export type V2AgendaItem = {
  id: string
  kind: V2AgendaKind
  title: string
  subtitle: string
  space: V2Space
  start: Date
  end: Date
  eventId?: number
  /** Valor contratado, presente só nos itens do tipo evento. */
  value?: number
}

export type V2Ledger = {
  id: string
  kind: 'income' | 'expense'
  description: string
  category: string
  amount: number
  date: Date
  /** paid | pending | overdue */
  status: string
  eventId?: number | null
  spaceName?: string | null
}

/** `month` é "yyyy-MM" (ver monthKeyOf em format.ts): um Date atravessando servidor → navegador mudava de mês. */
export type V2MonthPoint = { month: string; income: number; expense: number }
