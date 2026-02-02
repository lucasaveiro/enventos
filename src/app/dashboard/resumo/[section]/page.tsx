import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getAllFinancialData, getFinancialSummary } from '@/app/actions/transactions'
import { buttonVariants } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'

const categoryLabels: Record<string, string> = {
  event_payment: 'Pagamento de Evento',
  deposit: 'Sinal/Deposito',
  rental: 'Aluguel',
  rental_installment: 'Parcela de Aluguel',
  other_income: 'Outras Receitas',
  service_cost: 'Custo de Servico',
  maintenance: 'Manutencao',
  supplies: 'Suprimentos',
  utilities: 'Utilidades',
  professional_payment: 'Pagamento Profissional',
  cleaning: 'Limpeza',
  other_expense: 'Outras Despesas',
}

const paymentStatusLabels: Record<string, string> = {
  paid: 'Pago',
  partial: 'Parcial',
  unpaid: 'Pendente',
}

type DateFilter = 'month' | 'last3months' | 'year' | 'all'

type SummaryPageProps = {
  params: { section: string }
  searchParams?: { period?: string }
}

type FinancialEntry = {
  id: string
  type: 'income' | 'expense'
  category: string
  description: string
  amount: number
  depositAmount?: number
  eventId?: number | null
  date: Date | string
  paymentStatus?: string | null
  source: 'event' | 'manual'
  event?: { id: number } | null
  space?: { name: string } | null
}

type MonthlySummary = { income: number; expense: number; events: number }
type SpaceSummary = { income: number; events: number }
type CategorySummary = { income: number; expense: number }

type FinancialSummary = {
  eventIncome: {
    total: number
    depositsReceived: number
    pendingPayments: number
    paidEvents: number
    partialEvents: number
    unpaidEvents: number
    eventCount: number
  }
  manualIncome: number
  manualExpense: number
  totalIncome: number
  totalExpense: number
  balance: number
  byCategory: Record<string, CategorySummary>
  byMonth: Record<string, MonthlySummary>
  bySpace: Record<string, SpaceSummary>
}

const periodLabels: Record<DateFilter, string> = {
  month: 'Este Mes',
  last3months: 'Ultimos 3 Meses',
  year: 'Este Ano',
  all: 'Todos',
}

const sectionTitles: Record<string, string> = {
  receitas: 'Receitas Recebidas',
  despesas: 'Total de Despesas',
  saldo: 'Saldo',
  pendentes: 'Pagamentos Pendentes',
  eventos: 'Total de Eventos',
  'eventos-pagos': 'Eventos Pagos',
  'eventos-parciais': 'Pagamento Parcial',
  'eventos-valor': 'Valor Total de Eventos',
  mensal: 'Receitas vs Despesas por Mes',
  'por-espaco': 'Receita por Espaco',
  'por-categoria': 'Resumo por Categoria',
  transacoes: 'Movimentacoes Financeiras',
}

const allowedPeriods = new Set<DateFilter>(['month', 'last3months', 'year', 'all'])

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

const formatDate = (date: Date | string) =>
  format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })

const getDateRange = (filter: DateFilter) => {
  const now = new Date()
  switch (filter) {
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'last3months':
      return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) }
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) }
    case 'all':
    default:
      return { start: undefined, end: undefined }
  }
}

export default async function DashboardResumoPage({ params, searchParams }: SummaryPageProps) {
  const rawSection = Array.isArray(params.section) ? params.section[0] : params.section
  const sectionKey = (rawSection || '').split('?')[0].trim().toLowerCase()
  const periodParam = searchParams?.period
  const period = allowedPeriods.has(periodParam as DateFilter) ? (periodParam as DateFilter) : 'month'
  const { start, end } = getDateRange(period)

  const [summaryRes, dataRes] = await Promise.all([
    getFinancialSummary(start, end),
    getAllFinancialData(start, end),
  ])

  const summary: FinancialSummary = summaryRes.success && summaryRes.data ? summaryRes.data : {
    eventIncome: {
      total: 0,
      depositsReceived: 0,
      pendingPayments: 0,
      paidEvents: 0,
      partialEvents: 0,
      unpaidEvents: 0,
      eventCount: 0,
    },
    manualIncome: 0,
    manualExpense: 0,
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    byCategory: {},
    byMonth: {},
    bySpace: {},
  }

  const entries: FinancialEntry[] = dataRes.success && dataRes.data ? dataRes.data : []
  const eventEntries = entries.filter((entry) => entry.source === 'event')
  const paymentsByEventId = new Map<number, number>()

  entries.forEach((entry) => {
    if (entry.source !== 'manual' || entry.type !== 'income' || !entry.eventId) return
    paymentsByEventId.set(
      entry.eventId,
      (paymentsByEventId.get(entry.eventId) || 0) + (entry.amount || 0)
    )
  })

  const getDepositAmount = (entry: FinancialEntry) =>
    Math.min(entry.depositAmount || 0, entry.amount || 0)

  const getEventId = (entry: FinancialEntry) =>
    entry.eventId ?? entry.event?.id ?? null

  const getTotalPaidForEvent = (entry: FinancialEntry) => {
    if (entry.source !== 'event') return entry.amount || 0
    const total = entry.amount || 0
    const deposit = getDepositAmount(entry)
    const eventId = getEventId(entry)
    const payments = eventId ? paymentsByEventId.get(eventId) || 0 : 0
    return Math.min(deposit + payments, total)
  }

  const getComputedStatus = (entry: FinancialEntry) => {
    if (entry.source !== 'event') return null
    const total = entry.amount || 0
    const totalPaid = getTotalPaidForEvent(entry)
    if (total > 0 && totalPaid >= total) return 'paid'
    if (totalPaid > 0) return 'partial'
    return 'unpaid'
  }

  const getReceivedAmount = (entry: FinancialEntry) =>
    entry.source !== 'event' ? entry.amount || 0 : getTotalPaidForEvent(entry)

  const getPendingAmount = (entry: FinancialEntry) => {
    if (entry.source !== 'event') return 0
    const total = entry.amount || 0
    return Math.max(total - getTotalPaidForEvent(entry), 0)
  }

  const sectionTitle = sectionTitles[sectionKey] || 'Resumo'

  const renderEmpty = (message: string) => (
    <div className="flex items-center justify-center h-48 text-muted-foreground">
      {message}
    </div>
  )

  const renderEventTable = (filteredEntries: FinancialEntry[], showFooterTotal = false) => {
    if (!filteredEntries.length) {
      return renderEmpty('Nenhum evento encontrado para o periodo')
    }

    const totalValue = filteredEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0)

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Evento</TableHead>
            <TableHead>Espaco</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Sinal</TableHead>
            <TableHead className="text-right">Recebido</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredEntries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{formatDate(entry.date)}</TableCell>
              <TableCell className="font-medium">{entry.description}</TableCell>
              <TableCell>{entry.space?.name || '-'}</TableCell>
              <TableCell>
                {paymentStatusLabels[getComputedStatus(entry) as string] || '-'}
              </TableCell>
              <TableCell className="text-right">{formatCurrency(entry.amount || 0)}</TableCell>
              <TableCell className="text-right">{formatCurrency(getDepositAmount(entry))}</TableCell>
              <TableCell className="text-right">{formatCurrency(getReceivedAmount(entry))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        {showFooterTotal && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4}>Total</TableCell>
              <TableCell className="text-right">{formatCurrency(totalValue)}</TableCell>
              <TableCell />
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    )
  }

  const renderSection = () => {
    switch (sectionKey) {
      case 'receitas': {
        const incomeEntries = entries.filter((entry) => {
          if (entry.type !== 'income') return false
          if (entry.source === 'event') return getReceivedAmount(entry) > 0
          return !entry.eventId
        })
        if (!incomeEntries.length) {
          return renderEmpty('Nenhuma receita encontrada para o periodo')
        }

        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomeEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell>{entry.source === 'event' ? 'Evento' : 'Manual'}</TableCell>
                  <TableCell className="font-medium">{entry.description}</TableCell>
                  <TableCell>{categoryLabels[entry.category] || entry.category}</TableCell>
                  <TableCell className="text-right">{formatCurrency(getReceivedAmount(entry))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      }
      case 'despesas': {
        const expenseEntries = entries.filter((entry) => entry.type === 'expense')
        if (!expenseEntries.length) {
          return renderEmpty('Nenhuma despesa encontrada para o periodo')
        }

        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenseEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell className="font-medium">{entry.description}</TableCell>
                  <TableCell>{categoryLabels[entry.category] || entry.category}</TableCell>
                  <TableCell className="text-right">{formatCurrency(entry.amount || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      }
      case 'saldo':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Indicador</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Receitas Recebidas</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.totalIncome || 0)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Total Despesas</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.totalExpense || 0)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Saldo</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.balance || 0)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )
      case 'pendentes': {
        const pendingEntries = eventEntries.filter((entry) => getPendingAmount(entry) > 0)
        if (!pendingEntries.length) {
          return renderEmpty('Nenhum pagamento pendente para o periodo')
        }

        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Espaco</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Sinal</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
                <TableHead className="text-right">Pendente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell className="font-medium">{entry.description}</TableCell>
                  <TableCell>{entry.space?.name || '-'}</TableCell>
                  <TableCell className="text-right">{formatCurrency(entry.amount || 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(getDepositAmount(entry))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(getReceivedAmount(entry))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(getPendingAmount(entry))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      }
      case 'eventos':
        return renderEventTable(eventEntries)
      case 'eventos-pagos':
        return renderEventTable(eventEntries.filter((entry) => getComputedStatus(entry) === 'paid'))
      case 'eventos-parciais':
        return renderEventTable(eventEntries.filter((entry) => getComputedStatus(entry) === 'partial'))
      case 'eventos-valor':
        return renderEventTable(eventEntries, true)
      case 'mensal': {
        const months = (Object.entries(summary.byMonth || {}) as [string, MonthlySummary][])
          .sort(([a], [b]) => a.localeCompare(b))

        if (!months.length) {
          return renderEmpty('Nenhum dado mensal encontrado para o periodo')
        }

        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">Receitas</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
                <TableHead className="text-right">Eventos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map(([monthKey, data]) => (
                <TableRow key={monthKey}>
                  <TableCell>
                    {format(new Date(`${monthKey}-01`), 'MMM yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(data.income || 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.expense || 0)}</TableCell>
                  <TableCell className="text-right">{data.events || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      }
      case 'por-espaco': {
        const spaces = Object.entries(summary.bySpace || {}) as [string, SpaceSummary][]
        spaces.sort(([, a], [, b]) => (b.income || 0) - (a.income || 0))

        if (!spaces.length) {
          return renderEmpty('Nenhum espaco com receita no periodo')
        }

        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Espaco</TableHead>
                <TableHead className="text-right">Eventos</TableHead>
                <TableHead className="text-right">Receita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {spaces.map(([spaceName, data]) => (
                <TableRow key={spaceName}>
                  <TableCell className="font-medium">{spaceName}</TableCell>
                  <TableCell className="text-right">{data.events || 0}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.income || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      }
      case 'por-categoria': {
        const categories = Object.entries(summary.byCategory || {}) as [string, CategorySummary][]
        categories.sort(([, a], [, b]) => (b.income + b.expense) - (a.income + a.expense))

        if (!categories.length) {
          return renderEmpty('Nenhuma categoria com movimentacao no periodo')
        }

        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Despesa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map(([category, data]) => (
                <TableRow key={category}>
                  <TableCell className="font-medium">{categoryLabels[category] || category}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.income || 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.expense || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      }
      case 'transacoes': {
        if (!entries.length) {
          return renderEmpty('Nenhuma movimentacao encontrada para o periodo')
        }

        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell>{entry.type === 'income' ? 'Receita' : 'Despesa'}</TableCell>
                  <TableCell>{entry.source === 'event' ? 'Evento' : 'Manual'}</TableCell>
                  <TableCell className="font-medium">{entry.description}</TableCell>
                  <TableCell>{categoryLabels[entry.category] || entry.category}</TableCell>
                  <TableCell className="text-right">{formatCurrency(entry.amount || 0)}</TableCell>
                  <TableCell className="text-right">
                    {entry.type === 'income' ? formatCurrency(getReceivedAmount(entry)) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      }
      default:
        return renderEmpty('Secao nao encontrada')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <ArrowLeft className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{sectionTitle}</h1>
            <p className="text-sm text-muted-foreground">Periodo: {periodLabels[period]}</p>
          </div>
        </div>
        <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Dashboard
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planilha de Resumo</CardTitle>
        </CardHeader>
        <CardContent>{renderSection()}</CardContent>
      </Card>
    </div>
  )
}
