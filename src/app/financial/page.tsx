'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Filter,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react'
import { addDays, endOfDay, format, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import {
  deleteTransaction,
  getFinancialLedger,
  updateTransactionStatus,
} from '@/app/actions/transactions'
import { TransactionModal } from '@/components/forms/TransactionModal'

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

type PeriodFilter = '7' | '15' | '30' | 'custom' | 'all'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(date?: Date | string | null) {
  if (!date) return '-'
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })
}

export default function FinancialPage() {
  const [entries, setEntries] = useState<any[]>([])
  const [summary, setSummary] = useState({
    paidIncome: 0,
    paidExpense: 0,
    pendingIncome: 0,
    pendingExpense: 0,
    servicePendingTotal: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<any | undefined>(undefined)
  const [defaultType, setDefaultType] = useState<'income' | 'expense'>('income')

  const getPeriodRange = useCallback(() => {
    const today = startOfDay(new Date())
    switch (periodFilter) {
      case '7':
        return { start: today, end: endOfDay(addDays(today, 7)) }
      case '15':
        return { start: today, end: endOfDay(addDays(today, 15)) }
      case '30':
        return { start: today, end: endOfDay(addDays(today, 30)) }
      case 'custom':
        return {
          start: customStart ? startOfDay(new Date(customStart)) : undefined,
          end: customEnd ? endOfDay(new Date(customEnd)) : undefined,
        }
      case 'all':
      default:
        return { start: undefined, end: undefined }
    }
  }, [periodFilter, customStart, customEnd])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const { start, end } = getPeriodRange()
    const res = await getFinancialLedger({
      start,
      end,
      type: typeFilter,
      category: categoryFilter,
      status: statusFilter,
      search,
    })

    if (res.success && res.data && res.summary) {
      setEntries(res.data)
      setSummary(res.summary)
    }
    setIsLoading(false)
  }, [getPeriodRange, typeFilter, categoryFilter, statusFilter, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const categories = useMemo(() => {
    const fromData = Array.from(new Set(entries.map((entry) => entry.category)))
    const merged = Array.from(new Set([...Object.keys(categoryLabels), ...fromData]))
    return merged.sort((a, b) => a.localeCompare(b))
  }, [entries])

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
    setSelectedTransaction({
      id: entry.id,
      type: entry.type,
      category: entry.category,
      description: entry.description,
      amount: entry.amount,
      date: entry.date,
      status: entry.status,
      paidAt: entry.paidAt,
      eventId: entry.eventId ?? null,
      notes: entry.notes,
    })
    setDefaultType(entry.type)
    setIsModalOpen(true)
  }

  const handleDelete = async (entry: any) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return
    await deleteTransaction(entry.id)
    fetchData()
  }

  const handleToggleStatus = async (entry: any) => {
    await updateTransactionStatus(entry.id, entry.status === 'paid' ? 'pending' : 'paid')
    fetchData()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-primary/10">
            <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Financeiro</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Planilha completa de receitas, despesas e previsões</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleCreateExpense}>
            <ArrowDownCircle className="h-4 w-4 text-destructive" />
            Nova Despesa
          </Button>
          <Button onClick={handleCreateIncome}>
            <Plus className="h-4 w-4" />
            Nova Receita
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Receitas Pagas</p>
          <p className="text-xl font-bold text-success">{formatCurrency(summary.paidIncome)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Despesas Pagas</p>
          <p className="text-xl font-bold text-destructive">{formatCurrency(summary.paidExpense)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Receita Prevista</p>
          <p className="text-xl font-bold text-info">{formatCurrency(summary.pendingIncome)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Despesa Pendente</p>
          <p className="text-xl font-bold text-warning">{formatCurrency(summary.pendingExpense)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Serviços Pendentes</p>
          <p className="text-xl font-bold text-warning">{formatCurrency(summary.servicePendingTotal)}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros:</span>

          <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)} className="h-9 w-auto rounded-lg border border-border bg-background px-3 text-sm">
            <option value="all">Todos os períodos</option>
            <option value="7">Próximos 7 dias</option>
            <option value="15">Próximos 15 dias</option>
            <option value="30">Próximos 30 dias</option>
            <option value="custom">Personalizado</option>
          </select>

          {periodFilter === 'custom' && (
            <>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
              <span className="text-sm text-muted-foreground">até</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
            </>
          )}

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'all' | 'income' | 'expense')} className="h-9 w-auto rounded-lg border border-border bg-background px-3 text-sm">
            <option value="all">Receitas + Despesas</option>
            <option value="income">Apenas Receitas</option>
            <option value="expense">Apenas Despesas</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'pending')} className="h-9 w-auto rounded-lg border border-border bg-background px-3 text-sm">
            <option value="all">Pago + Pendente</option>
            <option value="paid">Apenas Pago</option>
            <option value="pending">Apenas Pendente</option>
          </select>

          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-9 w-auto rounded-lg border border-border bg-background px-3 text-sm">
            <option value="all">Todas Categorias</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category] || category}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar descrição/categoria..."
            className="h-9 min-w-56 rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Planilha Financeira
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : entries.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Wallet}
                title="Nenhum registro encontrado"
                description="Ajuste os filtros ou cadastre receitas/despesas."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Prevista</TableHead>
                  <TableHead>Pago em</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell>{formatDate(entry.paidAt)}</TableCell>
                    <TableCell>
                      {entry.type === 'income' ? (
                        <Badge variant="success"><ArrowUpCircle className="h-3 w-3 mr-1" /> Receita</Badge>
                      ) : (
                        <Badge variant="destructive"><ArrowDownCircle className="h-3 w-3 mr-1" /> Despesa</Badge>
                      )}
                    </TableCell>
                    <TableCell>{categoryLabels[entry.category] || entry.category}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium text-foreground">{entry.description}</span>
                        <span className="block text-xs text-muted-foreground">
                          {entry.reference || '-'} {entry.spaceName ? `• ${entry.spaceName}` : ''}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.status === 'paid' ? (
                        <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" /> Pago</Badge>
                      ) : (
                        <Badge variant="warning"><CircleDashed className="h-3 w-3 mr-1" /> Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={entry.type === 'income' ? 'font-semibold text-success' : 'font-semibold text-destructive'}>
                        {entry.type === 'income' ? '+' : '-'} {formatCurrency(entry.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(entry)} className="h-8 w-8">
                          {entry.status === 'paid' ? <CircleDashed className="h-4 w-4 text-warning" /> : <CheckCircle2 className="h-4 w-4 text-success" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)} className="h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(entry)} className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialTransaction={selectedTransaction}
        onSuccess={fetchData}
        defaultType={defaultType}
      />
    </div>
  )
}
