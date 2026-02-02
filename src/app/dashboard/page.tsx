'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Pencil,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  BarChart3,
  Calendar,
  Filter,
  CalendarDays,
  Clock,
  CheckCircle,
  AlertCircle,
  Home,
  ClipboardCheck,
  CalendarClock
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { getAllFinancialData, getFinancialSummary, deleteTransaction, getFinancialForecastSummary } from '@/app/actions/transactions'
import { TransactionModal } from '@/components/forms/TransactionModal'
import { addDays, endOfDay, format, startOfDay, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const categoryLabels: Record<string, string> = {
  event_payment: 'Pagamento de Evento',
  deposit: 'Sinal/Depósito',
  rental: 'Aluguel',
  rental_installment: 'Parcela de Aluguel',
  other_income: 'Outras Receitas',
  service_cost: 'Custo de Serviço',
  maintenance: 'Manutenção',
  supplies: 'Suprimentos',
  utilities: 'Utilidades',
  professional_payment: 'Pagamento Profissional',
  cleaning: 'Limpeza',
  other_expense: 'Outras Despesas',
}

const paymentStatusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  paid: { label: 'Pago', variant: 'success' },
  partial: { label: 'Parcial', variant: 'warning' },
  unpaid: { label: 'Pendente', variant: 'destructive' },
}

const transactionStatusLabels: Record<string, { label: string; variant: 'success' | 'warning' }> = {
  paid: { label: 'Pago', variant: 'success' },
  pending: { label: 'Pendente', variant: 'warning' },
}

type DateFilter = 'month' | 'last3months' | 'year' | 'all'
type ForecastFilter = '7days' | '15days' | '30days' | 'custom'

type PaymentStatusEntry = {
  source: string
  paymentStatus?: string | null
  depositAmount?: number
}

export default function DashboardPage() {
  const [financialData, setFinancialData] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [forecast, setForecast] = useState({
    totalForecastIncome: 0,
    totalForecastExpense: 0,
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<any | undefined>(undefined)
  const [defaultType, setDefaultType] = useState<'income' | 'expense'>('income')
  const [isLoading, setIsLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilter>('month')
  const [forecastFilter, setForecastFilter] = useState<ForecastFilter>('30days')
  const [customForecastStart, setCustomForecastStart] = useState('')
  const [customForecastEnd, setCustomForecastEnd] = useState('')

  const getSummaryHref = (section: string) => `/dashboard/resumo/${section}?period=${dateFilter}`

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

  const getForecastRange = useCallback((filter: ForecastFilter) => {
    const today = startOfDay(new Date())
    switch (filter) {
      case '7days':
        return { start: today, end: endOfDay(addDays(today, 7)) }
      case '15days':
        return { start: today, end: endOfDay(addDays(today, 15)) }
      case '30days':
        return { start: today, end: endOfDay(addDays(today, 30)) }
      case 'custom':
        return {
          start: customForecastStart ? startOfDay(new Date(customForecastStart)) : today,
          end: customForecastEnd ? endOfDay(new Date(customForecastEnd)) : endOfDay(addDays(today, 30))
        }
      default:
        return { start: today, end: endOfDay(addDays(today, 30)) }
    }
  }, [customForecastStart, customForecastEnd])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const { start, end } = getDateRange(dateFilter)

    const [dataRes, summaryRes] = await Promise.all([
      getAllFinancialData(start, end),
      getFinancialSummary(start, end)
    ])

    if (dataRes.success && dataRes.data) {
      setFinancialData(dataRes.data)
    }
    if (summaryRes.success && summaryRes.data) {
      setSummary(summaryRes.data)
    }
    setIsLoading(false)
  }, [dateFilter])

  const fetchForecast = useCallback(async () => {
    const { start, end } = getForecastRange(forecastFilter)
    const res = await getFinancialForecastSummary(start, end)
    if (res.success && res.data) {
      setForecast({
        totalForecastIncome: res.data.totalForecastIncome || 0,
        totalForecastExpense: res.data.totalForecastExpense || 0,
      })
    }
  }, [forecastFilter, getForecastRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchForecast()
  }, [fetchForecast])

  const refreshAll = useCallback(() => {
    fetchData()
    fetchForecast()
  }, [fetchData, fetchForecast])

  const handleCreateIncome = () => {
    setSelectedTransaction(undefined)
    setDefaultType('income')
    setIsModalOpen(true)
  }

  const handleCreateExpense = () => {
    setSelectedTransaction(undefined)
    setDefaultType('expense')
    setIsModalOpen(true)
  }

  const handleEdit = (entry: any) => {
    if (entry.source === 'manual') {
      setSelectedTransaction({
        id: entry.sourceId,
        type: entry.type,
        category: entry.category,
        description: entry.description,
        amount: entry.amount,
        date: entry.date,
        status: entry.status || 'paid',
        paidAt: entry.paidAt || null,
        notes: entry.notes,
        eventId: entry.eventId ?? entry.event?.id ?? null
      })
      setDefaultType(entry.type)
      setIsModalOpen(true)
    }
  }

  const handleDelete = async (entry: any) => {
    if (entry.source === 'manual') {
      if (confirm('Tem certeza que deseja excluir esta transação?')) {
        await deleteTransaction(entry.sourceId)
        refreshAll()
      }
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getComputedPaymentStatus = (entry: PaymentStatusEntry) => {
    if (entry.source !== 'event') return null
    if (entry.paymentStatus === 'paid') return 'paid'
    if (entry.paymentStatus === 'partial' || (entry.depositAmount ?? 0) > 0) return 'partial'
    return 'unpaid'
  }

  // Calculate chart data for visualization
  const chartData = useMemo(() => {
    if (!summary?.byMonth) return []
    const months = Object.entries(summary.byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)

    return months.map(([month, data]: [string, any]) => ({
      month: format(new Date(month + '-01'), 'MMM', { locale: ptBR }),
      income: data.income,
      expense: data.expense,
      events: data.events
    }))
  }, [summary])

  // Find max value for chart scaling
  const maxChartValue = useMemo(() => {
    if (!chartData.length) return 1000
    return Math.max(...chartData.flatMap(d => [d.income, d.expense]), 1000)
  }, [chartData])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Financeiro</h1>
            <p className="text-sm text-muted-foreground">Receitas de eventos e despesas operacionais</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleCreateExpense}>
            <ArrowDownCircle className="h-4 w-4 text-destructive" />
            Nova Despesa
          </Button>
          <Button onClick={handleCreateIncome}>
            <ArrowUpCircle className="h-4 w-4" />
            Nova Receita
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Período:</span>
          <div className="flex gap-2">
            {[
              { value: 'month', label: 'Este Mês' },
              { value: 'last3months', label: 'Últimos 3 Meses' },
              { value: 'year', label: 'Este Ano' },
              { value: 'all', label: 'Todos' },
            ].map((option) => (
              <Button
                key={option.value}
                variant={dateFilter === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter(option.value as DateFilter)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Período de previsão:</span>
          <div className="flex flex-wrap gap-2">
            {[
              { value: '7days', label: 'Próximos 7 dias' },
              { value: '15days', label: 'Próximos 15 dias' },
              { value: '30days', label: 'Próximos 30 dias' },
              { value: 'custom', label: 'Personalizado' },
            ].map((option) => (
              <Button
                key={option.value}
                variant={forecastFilter === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForecastFilter(option.value as ForecastFilter)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          {forecastFilter === 'custom' && (
            <div className="ml-auto flex items-center gap-2">
              <input
                type="date"
                value={customForecastStart}
                onChange={(e) => setCustomForecastStart(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <span className="text-sm text-muted-foreground">até</span>
              <input
                type="date"
                value={customForecastEnd}
                onChange={(e) => setCustomForecastEnd(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Summary Cards - Row 1 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link
          href={getSummaryHref('receitas')}
          className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Abrir planilha de receitas recebidas"
        >
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receitas Recebidas</p>
                <p className="text-2xl font-bold text-success">
                  {formatCurrency(summary?.totalIncome || 0)}
                </p>
              </div>
            </div>
          </Card>
        </Link>
        <Link
          href={getSummaryHref('despesas')}
          className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Abrir planilha de despesas"
        >
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Despesas</p>
                <p className="text-2xl font-bold text-destructive">
                  {formatCurrency(summary?.totalExpense || 0)}
                </p>
              </div>
            </div>
          </Card>
        </Link>
        <Link
          href={getSummaryHref('saldo')}
          className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Abrir planilha de saldo"
        >
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                (summary?.balance || 0) >= 0 ? 'bg-success/10' : 'bg-destructive/10'
              }`}>
                <Wallet className={`h-6 w-6 ${
                  (summary?.balance || 0) >= 0 ? 'text-success' : 'text-destructive'
                }`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className={`text-2xl font-bold ${
                  (summary?.balance || 0) >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {formatCurrency(summary?.balance || 0)}
                </p>
              </div>
            </div>
          </Card>
        </Link>
        <Link
          href={getSummaryHref('pendentes')}
          className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Abrir planilha de pagamentos pendentes"
        >
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pagamentos Pendentes</p>
                <p className="text-2xl font-bold text-warning">
                  {formatCurrency(summary?.eventIncome?.pendingPayments || 0)}
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Event Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link
          href={getSummaryHref('eventos')}
          className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Abrir planilha de eventos"
        >
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <CalendarDays className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Eventos</p>
                <p className="text-2xl font-bold text-foreground">
                  {summary?.eventIncome?.eventCount || 0}
                </p>
              </div>
            </div>
          </Card>
        </Link>
        <Link
          href={getSummaryHref('eventos-pagos')}
          className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Abrir planilha de eventos pagos"
        >
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Eventos Pagos</p>
                <p className="text-2xl font-bold text-success">
                  {summary?.eventIncome?.paidEvents || 0}
                </p>
              </div>
            </div>
          </Card>
        </Link>
        <Link
          href={getSummaryHref('eventos-parciais')}
          className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Abrir planilha de pagamentos parciais"
        >
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <AlertCircle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pagamento Parcial</p>
                <p className="text-2xl font-bold text-warning">
                  {summary?.eventIncome?.partialEvents || 0}
                </p>
              </div>
            </div>
          </Card>
        </Link>
        <Link
          href={getSummaryHref('eventos-valor')}
          className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Abrir planilha do valor total dos eventos"
        >
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info/10">
                <DollarSign className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total Eventos</p>
                <p className="text-2xl font-bold text-info">
                  {formatCurrency(summary?.eventIncome?.total || 0)}
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/financial"
          className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Abrir financeiro com serviços pendentes"
        >
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <ClipboardCheck className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Serviços Pendentes</p>
                <p className="text-2xl font-bold text-warning">
                  {formatCurrency(summary?.servicePendingTotal || 0)}
                </p>
              </div>
            </div>
          </Card>
        </Link>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Previsto de Receita</p>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(forecast.totalForecastIncome || 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
              <TrendingDown className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Previsto de Despesa</p>
              <p className="text-2xl font-bold text-destructive">
                {formatCurrency(forecast.totalForecastExpense || 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar Chart - Monthly Income vs Expenses */}
        <Link
          href={getSummaryHref('mensal')}
          className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Abrir planilha de receitas e despesas por mes"
        >
          <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Receitas vs Despesas por Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="space-y-4">
                {/* Chart Legend */}
                <div className="flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-success" />
                    <span className="text-sm text-muted-foreground">Receitas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-destructive" />
                    <span className="text-sm text-muted-foreground">Despesas</span>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="flex items-end justify-between gap-2 h-48 pt-4">
                  {chartData.map((data, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div className="flex items-end gap-1 h-40 w-full justify-center">
                        {/* Income Bar */}
                        <div
                          className="w-5 bg-success rounded-t transition-all duration-500 cursor-pointer hover:opacity-80"
                          style={{ height: `${(data.income / maxChartValue) * 100}%`, minHeight: data.income > 0 ? '4px' : '0' }}
                          title={`Receita: ${formatCurrency(data.income)}`}
                        />
                        {/* Expense Bar */}
                        <div
                          className="w-5 bg-destructive rounded-t transition-all duration-500 cursor-pointer hover:opacity-80"
                          style={{ height: `${(data.expense / maxChartValue) * 100}%`, minHeight: data.expense > 0 ? '4px' : '0' }}
                          title={`Despesa: ${formatCurrency(data.expense)}`}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">{data.month}</span>
                      {data.events > 0 && (
                        <span className="text-xs text-primary">{data.events} eventos</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                Nenhum dado disponível para o período
              </div>
            )}
          </CardContent>
          </Card>
        </Link>

        {/* Income by Space */}
        <Link
          href={getSummaryHref('por-espaco')}
          className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Abrir planilha de receita por espaco"
        >
          <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" />
              Receita por Espaço
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.bySpace && Object.keys(summary.bySpace).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(summary.bySpace).map(([spaceName, data]: [string, any]) => {
                  const maxIncome = Math.max(...Object.values(summary.bySpace).map((s: any) => s.income), 1)
                  const percentage = (data.income / maxIncome) * 100

                  return (
                    <div key={spaceName} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground font-medium">{spaceName}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground text-xs">{data.events} eventos</span>
                          <span className="text-success font-semibold">{formatCurrency(data.income)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                Nenhum evento cadastrado no período
              </div>
            )}
          </CardContent>
          </Card>
        </Link>
      </div>

      {/* Category Breakdown */}
      <Link
        href={getSummaryHref('por-categoria')}
        className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Abrir planilha de resumo por categoria"
      >
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Resumo por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.byCategory && Object.keys(summary.byCategory).length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(summary.byCategory).map(([category, data]: [string, any]) => {
                  const total = data.income + data.expense
                  const incomePercent = total > 0 ? (data.income / total) * 100 : 0

                  return (
                    <div key={category} className="p-4 rounded-lg bg-secondary/30 border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-foreground font-medium">{categoryLabels[category] || category}</span>
                      </div>
                      <div className="space-y-1">
                        {data.income > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Receita:</span>
                            <span className="text-success font-semibold">{formatCurrency(data.income)}</span>
                          </div>
                        )}
                        {data.expense > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Despesa:</span>
                            <span className="text-destructive font-semibold">{formatCurrency(data.expense)}</span>
                          </div>
                        )}
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-3 flex">
                        <div
                          className="bg-success transition-all duration-500"
                          style={{ width: `${incomePercent}%` }}
                        />
                        <div
                          className="bg-destructive transition-all duration-500"
                          style={{ width: `${100 - incomePercent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                Nenhum dado disponível para o período
              </div>
            )}
          </CardContent>
        </Card>
      </Link>

      {/* Transactions Table */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Movimentações Financeiras</CardTitle>
          <Link
            href={getSummaryHref('transacoes')}
            className="text-sm text-primary hover:underline"
            aria-label="Abrir planilha de movimentacoes financeiras"
          >
            Ver planilha
          </Link>
        </CardHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Carregando dados...</span>
            </div>
          </div>
        ) : financialData.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="Nenhuma movimentação encontrada"
            description="Cadastre eventos no calendário ou registre transações manuais."
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCreateExpense}>
                  <ArrowDownCircle className="h-4 w-4" />
                  Nova Despesa
                </Button>
                <Button onClick={handleCreateIncome}>
                  <ArrowUpCircle className="h-4 w-4" />
                  Nova Receita
                </Button>
              </div>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {financialData.map((entry) => {
                const computedStatus = getComputedPaymentStatus(entry)

                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(entry.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.source === 'event' ? (
                        <Badge variant="info">
                          <CalendarDays className="h-3 w-3 mr-1" /> Evento
                        </Badge>
                      ) : entry.type === 'income' ? (
                        <Badge variant="success">
                          <ArrowUpCircle className="h-3 w-3 mr-1" /> Receita
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <ArrowDownCircle className="h-3 w-3 mr-1" /> Despesa
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium text-foreground">{entry.description}</span>
                        {entry.space && (
                          <span className="block text-xs text-muted-foreground">{entry.space.name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.source === 'event' && computedStatus ? (
                        <Badge variant={paymentStatusLabels[computedStatus]?.variant || 'secondary'}>
                          {paymentStatusLabels[computedStatus]?.label || computedStatus}
                        </Badge>
                      ) : entry.source === 'manual' ? (
                        <Badge variant={transactionStatusLabels[entry.status || 'paid']?.variant || 'warning'}>
                          {transactionStatusLabels[entry.status || 'paid']?.label || 'Pendente'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <span className={`font-bold ${
                          entry.type === 'income' ? 'text-success' : 'text-destructive'
                        }`}>
                          {entry.type === 'income' ? '+' : '-'} {formatCurrency(entry.amount)}
                        </span>
                        {entry.source === 'event' && computedStatus === 'partial' && entry.depositAmount > 0 && (
                          <span className="block text-xs text-muted-foreground">
                            Sinal: {formatCurrency(entry.depositAmount)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.source === 'manual' ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(entry)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(entry)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Via calendário</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialTransaction={selectedTransaction}
        onSuccess={refreshAll}
        defaultType={defaultType}
      />
    </div>
  )
}
