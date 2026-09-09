// ── Dados fictícios do protótipo v2 ────────────────────────────────────────
// Nada aqui toca o banco: é um conjunto de dados realistas, gerado a partir da
// data de hoje, só para o protótipo de UI ter conteúdo de verdade para mostrar.
// Quando a v2 for aprovada, cada tela troca este import pelas server actions
// reais — a estrutura dos objetos foi desenhada espelhando o schema atual.

export type SpaceSlug = 'rancho-aveiro' | 'estancia-aveiro'
export type PaymentStatus = 'paid' | 'partial' | 'unpaid'
export type ContractStatus = 'none' | 'draft' | 'sent' | 'partial' | 'signed'
export type Stage = 'interesse' | 'visita' | 'proposta' | 'contrato' | 'confirmado' | 'realizado'
export type AgendaKind = 'evento' | 'visita' | 'interesse' | 'servico'

export const SPACES: Record<SpaceSlug, { name: string; short: string; color: string; soft: string; address: string }> = {
  'rancho-aveiro': {
    name: 'Rancho Aveiro',
    short: 'Rancho',
    color: '#0F7B6C',
    soft: '#E4F4F1',
    address: 'Estrada do Rancho, km 4 — Zona Rural',
  },
  'estancia-aveiro': {
    name: 'Estância Aveiro',
    short: 'Estância',
    color: '#B4530A',
    soft: '#FCEFE3',
    address: 'Rodovia da Estância, km 12 — Zona Rural',
  },
}

export const STAGES: { key: Stage; label: string }[] = [
  { key: 'interesse', label: 'Interesse' },
  { key: 'visita', label: 'Visita' },
  { key: 'proposta', label: 'Proposta' },
  { key: 'contrato', label: 'Contrato' },
  { key: 'confirmado', label: 'Confirmado' },
  { key: 'realizado', label: 'Realizado' },
]

export type Installment = {
  n: number
  total: number
  amount: number
  dueDate: Date
  paidAt: Date | null
  method: string
}

export type V2Event = {
  id: number
  title: string
  type: 'Casamento' | 'Aniversário' | 'Confraternização' | 'Formatura' | 'Batizado'
  space: SpaceSlug
  start: Date
  end: Date
  guests: number
  client: { name: string; phone: string; email: string; city: string }
  value: number
  paid: number
  payment: PaymentStatus
  contract: ContractStatus
  contractSignedBy?: number
  contractTotalSigners?: number
  stage: Stage
  installments: Installment[]
  notes?: string
}

export type AgendaItem = {
  id: string
  kind: AgendaKind
  title: string
  subtitle: string
  space: SpaceSlug
  start: Date
  end: Date
  eventId?: number
}

// ── Helpers de data (tudo relativo a hoje, para o protótipo nunca envelhecer)
const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)

function at(dayOffset: number, hour = 0, minute = 0): Date {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + dayOffset)
  d.setHours(hour, minute, 0, 0)
  return d
}

export function today(): Date {
  return new Date(TODAY)
}

function inst(
  count: number,
  amount: number,
  firstOffset: number,
  paidUntil: number,
  method = 'Pix',
): Installment[] {
  return Array.from({ length: count }, (_, i) => ({
    n: i + 1,
    total: count,
    amount,
    dueDate: at(firstOffset + i * 30),
    paidAt: i < paidUntil ? at(firstOffset + i * 30 - 2) : null,
    method,
  }))
}

// ── Eventos ────────────────────────────────────────────────────────────────
export const EVENTS: V2Event[] = [
  {
    id: 101,
    title: 'Casamento Marina & Rafael',
    type: 'Casamento',
    space: 'estancia-aveiro',
    start: at(2, 16, 0),
    end: at(3, 3, 0),
    guests: 180,
    client: { name: 'Marina Bertoldo', phone: '(54) 99123-4455', email: 'marina.bertoldo@gmail.com', city: 'Caxias do Sul' },
    value: 28500,
    paid: 28500,
    payment: 'paid',
    contract: 'signed',
    contractSignedBy: 2,
    contractTotalSigners: 2,
    stage: 'confirmado',
    installments: inst(4, 7125, -88, 4),
    notes: 'Cerimônia no deck. Buffet Terra Nova entra às 12h para montagem.',
  },
  {
    id: 102,
    title: '15 anos da Helena',
    type: 'Aniversário',
    space: 'rancho-aveiro',
    start: at(9, 19, 0),
    end: at(10, 4, 0),
    guests: 120,
    client: { name: 'Cristiane Marques', phone: '(54) 99871-2030', email: 'cris.marques@hotmail.com', city: 'Farroupilha' },
    value: 16800,
    paid: 8400,
    payment: 'partial',
    contract: 'partial',
    contractSignedBy: 1,
    contractTotalSigners: 2,
    stage: 'contrato',
    installments: inst(4, 4200, -70, 2),
  },
  {
    id: 103,
    title: 'Confraternização Metalúrgica Pires',
    type: 'Confraternização',
    space: 'rancho-aveiro',
    start: at(-4, 12, 0),
    end: at(-4, 22, 0),
    guests: 95,
    client: { name: 'Anderson Pires', phone: '(54) 99555-1188', email: 'anderson@metalpires.com.br', city: 'Bento Gonçalves' },
    value: 12400,
    paid: 9300,
    payment: 'partial',
    contract: 'signed',
    contractSignedBy: 2,
    contractTotalSigners: 2,
    stage: 'realizado',
    installments: inst(4, 3100, -95, 3),
    notes: 'Vistoria de saída ainda não lançada.',
  },
  {
    id: 104,
    title: 'Casamento Júlia & Otávio',
    type: 'Casamento',
    space: 'estancia-aveiro',
    start: at(24, 17, 0),
    end: at(25, 4, 0),
    guests: 210,
    client: { name: 'Júlia Sanchotene', phone: '(51) 98444-7712', email: 'julia.sancho@gmail.com', city: 'Porto Alegre' },
    value: 34200,
    paid: 8550,
    payment: 'partial',
    contract: 'sent',
    contractSignedBy: 0,
    contractTotalSigners: 2,
    stage: 'contrato',
    installments: inst(4, 8550, -22, 1),
  },
  {
    id: 105,
    title: 'Formatura Odontologia UCS',
    type: 'Formatura',
    space: 'estancia-aveiro',
    start: at(41, 20, 0),
    end: at(42, 5, 0),
    guests: 260,
    client: { name: 'Comissão de Formatura UCS', phone: '(54) 99700-3311', email: 'formatura.odonto@ucs.br', city: 'Caxias do Sul' },
    value: 42000,
    paid: 0,
    payment: 'unpaid',
    contract: 'draft',
    stage: 'proposta',
    installments: inst(6, 7000, 3, 0),
  },
  {
    id: 106,
    title: 'Aniversário 60 anos Sr. Adilson',
    type: 'Aniversário',
    space: 'rancho-aveiro',
    start: at(16, 12, 0),
    end: at(16, 20, 0),
    guests: 70,
    client: { name: 'Adilson Copetti', phone: '(54) 99612-8080', email: 'adilson.copetti@gmail.com', city: 'Flores da Cunha' },
    value: 9800,
    paid: 9800,
    payment: 'paid',
    contract: 'signed',
    contractSignedBy: 2,
    contractTotalSigners: 2,
    stage: 'confirmado',
    installments: inst(2, 4900, -35, 2),
  },
  {
    id: 107,
    title: 'Casamento Bianca & Thiago',
    type: 'Casamento',
    space: 'rancho-aveiro',
    start: at(58, 16, 30),
    end: at(59, 3, 30),
    guests: 150,
    client: { name: 'Bianca Ferrarini', phone: '(54) 99333-2211', email: 'bianca.ferrarini@gmail.com', city: 'Garibaldi' },
    value: 26900,
    paid: 6725,
    payment: 'partial',
    contract: 'signed',
    contractSignedBy: 2,
    contractTotalSigners: 2,
    stage: 'confirmado',
    installments: inst(4, 6725, -3, 1),
  },
  {
    id: 108,
    title: 'Batizado do Bento',
    type: 'Batizado',
    space: 'rancho-aveiro',
    start: at(-18, 11, 0),
    end: at(-18, 17, 0),
    guests: 45,
    client: { name: 'Fernanda Dal Bó', phone: '(54) 99245-6677', email: 'fer.dalbo@gmail.com', city: 'Caxias do Sul' },
    value: 6200,
    paid: 6200,
    payment: 'paid',
    contract: 'signed',
    contractSignedBy: 2,
    contractTotalSigners: 2,
    stage: 'realizado',
    installments: inst(2, 3100, -70, 2),
  },
  {
    id: 109,
    title: 'Confraternização Vinícola Serra Alta',
    type: 'Confraternização',
    space: 'estancia-aveiro',
    start: at(73, 19, 0),
    end: at(74, 2, 0),
    guests: 130,
    client: { name: 'Rodrigo Zanella', phone: '(54) 99188-4400', email: 'rodrigo@serraalta.com.br', city: 'Bento Gonçalves' },
    value: 18700,
    paid: 0,
    payment: 'unpaid',
    contract: 'none',
    stage: 'visita',
    installments: [],
  },
  {
    id: 110,
    title: 'Casamento Letícia & Gustavo',
    type: 'Casamento',
    space: 'estancia-aveiro',
    start: at(96, 17, 0),
    end: at(97, 4, 0),
    guests: 190,
    client: { name: 'Letícia Grazziotin', phone: '(54) 99077-1234', email: 'le.grazziotin@gmail.com', city: 'Veranópolis' },
    value: 31500,
    paid: 0,
    payment: 'unpaid',
    contract: 'none',
    stage: 'interesse',
    installments: [],
  },
]

// ── Itens extras da agenda (visitas, interesses e serviços) ─────────────────
export const AGENDA_EXTRAS: AgendaItem[] = [
  {
    id: 'v1',
    kind: 'visita',
    title: 'Visita — Rodrigo Zanella',
    subtitle: 'Vinícola Serra Alta · 130 convidados',
    space: 'estancia-aveiro',
    start: at(0, 15, 0),
    end: at(0, 16, 0),
    eventId: 109,
  },
  {
    id: 'v2',
    kind: 'visita',
    title: 'Visita — Letícia & Gustavo',
    subtitle: 'Casamento · data pretendida em 3 meses',
    space: 'estancia-aveiro',
    start: at(4, 10, 0),
    end: at(4, 11, 0),
    eventId: 110,
  },
  {
    id: 'v3',
    kind: 'visita',
    title: 'Visita — Família Bonatto',
    subtitle: 'Aniversário de 80 anos · 60 convidados',
    space: 'rancho-aveiro',
    start: at(11, 14, 0),
    end: at(11, 15, 0),
  },
  {
    id: 'i1',
    kind: 'interesse',
    title: 'Interesse — Camila Rossi',
    subtitle: 'Segurou a data, sem sinal ainda',
    space: 'rancho-aveiro',
    start: at(31, 0, 0),
    end: at(31, 23, 59),
  },
  {
    id: 'i2',
    kind: 'interesse',
    title: 'Interesse — Grupo Sicredi',
    subtitle: 'Confraternização de fim de ano',
    space: 'estancia-aveiro',
    start: at(52, 0, 0),
    end: at(52, 23, 59),
  },
  {
    id: 's1',
    kind: 'servico',
    title: 'Limpeza pós-evento',
    subtitle: 'Equipe Solar · 4 pessoas',
    space: 'estancia-aveiro',
    start: at(3, 8, 0),
    end: at(3, 12, 0),
  },
  {
    id: 's2',
    kind: 'servico',
    title: 'Manutenção da piscina',
    subtitle: 'Mensal · Aqualimp',
    space: 'rancho-aveiro',
    start: at(6, 9, 0),
    end: at(6, 11, 0),
  },
  {
    id: 's3',
    kind: 'servico',
    title: 'Vistoria de saída',
    subtitle: 'Confraternização Metalúrgica Pires',
    space: 'rancho-aveiro',
    start: at(-3, 9, 0),
    end: at(-3, 10, 0),
    eventId: 103,
  },
]

// ── Lançamentos financeiros ────────────────────────────────────────────────
export type Ledger = {
  id: string
  kind: 'income' | 'expense'
  description: string
  category: string
  amount: number
  date: Date
  status: 'paid' | 'pending'
  eventId?: number
  space?: SpaceSlug
}

export const LEDGER: Ledger[] = [
  { id: 'l1', kind: 'income', description: 'Parcela 4/4 — Casamento Marina & Rafael', category: 'Parcela de aluguel', amount: 7125, date: at(-6), status: 'paid', eventId: 101, space: 'estancia-aveiro' },
  { id: 'l2', kind: 'income', description: 'Parcela 2/4 — 15 anos da Helena', category: 'Parcela de aluguel', amount: 4200, date: at(-12), status: 'paid', eventId: 102, space: 'rancho-aveiro' },
  { id: 'l3', kind: 'income', description: 'Parcela 3/4 — Confraternização Metalúrgica', category: 'Parcela de aluguel', amount: 3100, date: at(-5), status: 'paid', eventId: 103, space: 'rancho-aveiro' },
  { id: 'l4', kind: 'income', description: 'Sinal — Casamento Júlia & Otávio', category: 'Sinal/Depósito', amount: 8550, date: at(-22), status: 'paid', eventId: 104, space: 'estancia-aveiro' },
  { id: 'l5', kind: 'expense', description: 'Equipe de limpeza — mensal', category: 'Limpeza', amount: 2400, date: at(-8), status: 'paid', space: 'estancia-aveiro' },
  { id: 'l6', kind: 'expense', description: 'Energia elétrica — Rancho', category: 'Utilidades', amount: 1870, date: at(-3), status: 'paid', space: 'rancho-aveiro' },
  { id: 'l7', kind: 'expense', description: 'Manutenção do gerador', category: 'Manutenção', amount: 3200, date: at(-15), status: 'paid', space: 'estancia-aveiro' },
  { id: 'l8', kind: 'income', description: 'Parcela 4/4 — Confraternização Metalúrgica', category: 'Parcela de aluguel', amount: 3100, date: at(-5), status: 'pending', eventId: 103, space: 'rancho-aveiro' },
  { id: 'l9', kind: 'income', description: 'Parcela 3/4 — 15 anos da Helena', category: 'Parcela de aluguel', amount: 4200, date: at(-10), status: 'pending', eventId: 102, space: 'rancho-aveiro' },
  { id: 'l10', kind: 'income', description: 'Parcela 2/4 — Casamento Júlia & Otávio', category: 'Parcela de aluguel', amount: 8550, date: at(8), status: 'pending', eventId: 104, space: 'estancia-aveiro' },
  { id: 'l11', kind: 'income', description: 'Parcela 2/4 — Casamento Bianca & Thiago', category: 'Parcela de aluguel', amount: 6725, date: at(27), status: 'pending', eventId: 107, space: 'rancho-aveiro' },
  { id: 'l12', kind: 'expense', description: 'Jardinagem e roçada', category: 'Manutenção', amount: 1450, date: at(5), status: 'pending', space: 'rancho-aveiro' },
  { id: 'l13', kind: 'expense', description: 'Pagamento DJ — Casamento Marina & Rafael', category: 'Pagamento profissional', amount: 2800, date: at(4), status: 'pending', eventId: 101, space: 'estancia-aveiro' },
  { id: 'l14', kind: 'income', description: 'Parcela 1/6 — Formatura Odontologia UCS', category: 'Parcela de aluguel', amount: 7000, date: at(3), status: 'pending', eventId: 105, space: 'estancia-aveiro' },
]

// ── Receita mensal (12 meses móveis, para o gráfico) ───────────────────────
export const MONTHLY = [
  { m: -11, income: 21400, expense: 9800 },
  { m: -10, income: 18900, expense: 8600 },
  { m: -9, income: 27300, expense: 11200 },
  { m: -8, income: 24100, expense: 9400 },
  { m: -7, income: 31600, expense: 12800 },
  { m: -6, income: 19800, expense: 8100 },
  { m: -5, income: 22700, expense: 10300 },
  { m: -4, income: 29400, expense: 11900 },
  { m: -3, income: 33800, expense: 13400 },
  { m: -2, income: 26200, expense: 10700 },
  { m: -1, income: 30100, expense: 12200 },
  { m: 0, income: 22975, expense: 7470 },
].map(({ m, income, expense }) => {
  const d = new Date(TODAY)
  d.setDate(1)
  d.setMonth(d.getMonth() + m)
  return { date: d, income, expense }
})

// ── Cadastros ──────────────────────────────────────────────────────────────
export const CLIENTS = EVENTS.map((e) => ({
  ...e.client,
  id: e.id,
  events: 1,
  lastEvent: e.start,
  space: e.space,
}))

export const PROFESSIONALS = [
  { id: 1, name: 'DJ Marcelo Souza', type: 'DJ', phone: '(54) 99811-2233', events: 14 },
  { id: 2, name: 'Buffet Terra Nova', type: 'Buffet', phone: '(54) 3222-1100', events: 22 },
  { id: 3, name: 'Foto & Filme Aveiro', type: 'Fotografia', phone: '(54) 99444-8899', events: 19 },
  { id: 4, name: 'Equipe Solar Limpeza', type: 'Limpeza', phone: '(54) 99266-1717', events: 31 },
  { id: 5, name: 'Decor Bella Flor', type: 'Decoração', phone: '(54) 99502-6633', events: 11 },
]

export const SERVICES = [
  { id: 1, name: 'Limpeza pós-evento', space: 'estancia-aveiro' as SpaceSlug, recurrence: 'A cada evento', cost: 600 },
  { id: 2, name: 'Manutenção da piscina', space: 'rancho-aveiro' as SpaceSlug, recurrence: 'Mensal', cost: 380 },
  { id: 3, name: 'Jardinagem e roçada', space: 'rancho-aveiro' as SpaceSlug, recurrence: 'Quinzenal', cost: 725 },
  { id: 4, name: 'Vistoria de entrada e saída', space: 'estancia-aveiro' as SpaceSlug, recurrence: 'A cada evento', cost: 0 },
]

// ── Pendências ─────────────────────────────────────────────────────────────
// Fonte única do que "precisa de você": a tela Hoje e o contador da navegação
// leem daqui, para nunca mostrarem números diferentes da mesma coisa.
export function pendingSummary(now: Date = today()) {
  const awaitingSignature = EVENTS.filter((e) => e.contract === 'sent' || e.contract === 'partial')

  const overdue = EVENTS.flatMap((e) =>
    e.installments.filter((i) => !i.paidAt && i.dueDate < now).map((i) => ({ event: e, inst: i })),
  )

  const inspections = EVENTS.filter((e) => e.stage === 'realizado' && e.notes?.includes('Vistoria'))

  const proposals = EVENTS.filter(
    (e) => e.stage === 'proposta' || e.stage === 'visita' || e.stage === 'interesse',
  )

  return {
    awaitingSignature,
    overdue,
    overdueTotal: overdue.reduce((s, o) => s + o.inst.amount, 0),
    inspections,
    proposals,
    total: awaitingSignature.length + overdue.length + inspections.length + proposals.length,
  }
}

// ── Formatadores ───────────────────────────────────────────────────────────
export const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

export const brlExact = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
