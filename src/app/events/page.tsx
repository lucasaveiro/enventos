'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarDays,
  Plus,
  Filter,
  Pencil,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  FileSignature,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { ContractStatusBadge } from '@/components/contracts/ContractStatusBadge'
import { EventModal } from '@/components/forms/EventModal'
import { DeleteEventBlockedModal } from '@/components/events/DeleteEventBlockedModal'
import { getEventsForList, deleteEvent } from '@/app/actions/events'
import { getSpaces } from '@/app/actions/spaces'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  confirming: 'Confirmando',
  reserved: 'Reservado',
  available: 'Disponível',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'warning' | 'success' | 'info'> = {
  confirming: 'warning',
  reserved: 'success',
  available: 'info',
}

const PAYMENT_LABELS: Record<string, string> = {
  paid: 'Pago',
  partial: 'Parcial',
  unpaid: 'Pendente',
}

const PAYMENT_VARIANTS: Record<string, 'success' | 'warning' | 'destructive'> = {
  paid: 'success',
  partial: 'warning',
  unpaid: 'destructive',
}

// "Pendência de assinatura" = contrato enviado à Clicksign e ainda não finalizado.
// 'sent_whatsapp' = aguardando assinaturas; 'signed' = parcialmente assinado (a
// Clicksign emite `sign` por assinatura individual, então com 2 partes o status
// vira 'signed' assim que UMA assina). 'closed' (todos assinaram) e 'cancelled'
// não contam. Derivado do status persistido — barato para uma lista; a verdade
// por signatário (X de Y) fica na página do evento.
const PENDING_SIGNATURE_STATUSES = ['sent_whatsapp', 'signed']

function hasPendingSignature(event: any): boolean {
  const sig = event?.contractSignatures?.[0]
  return !!sig && PENDING_SIGNATURE_STATUSES.includes(sig.status)
}

type StatTone = 'primary' | 'success' | 'warning' | 'destructive' | 'info'

const STAT_TONES: Record<StatTone, { bg: string; text: string; ring: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary', ring: 'ring-primary' },
  success: { bg: 'bg-success/10', text: 'text-success', ring: 'ring-success' },
  warning: { bg: 'bg-warning/10', text: 'text-warning', ring: 'ring-warning' },
  destructive: { bg: 'bg-destructive/10', text: 'text-destructive', ring: 'ring-destructive' },
  info: { bg: 'bg-info/10', text: 'text-info', ring: 'ring-info' },
}

function StatCard({
  icon: Icon,
  count,
  label,
  tone,
  active,
  onClick,
}: {
  icon: LucideIcon
  count: number
  label: string
  tone: StatTone
  active: boolean
  onClick: () => void
}) {
  const t = STAT_TONES[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`Filtrar: ${label}`}
      className={cn(
        'rounded-xl border bg-[var(--card)] text-left text-[var(--card-foreground)] shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        active
          ? cn('ring-2 ring-offset-1 ring-offset-[var(--background)] border-transparent', t.ring)
          : 'border-[var(--border)] hover:border-[var(--border-hover)]',
      )}
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', t.bg)}>
            <Icon className={cn('h-5 w-5', t.text)} />
          </div>
          <div>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </div>
    </button>
  )
}

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [spaces, setSpaces] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any | undefined>(undefined)
  // Evento cuja exclusão foi bloqueada por ter contrato (abre o modal explicativo)
  const [deleteBlockedEventId, setDeleteBlockedEventId] = useState<number | null>(null)

  // Filters
  const [spaceFilter, setSpaceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [contractFilter, setContractFilter] = useState('all')
  const [signatureFilter, setSignatureFilter] = useState<'all' | 'pending'>('all')
  const [search, setSearch] = useState('')

  // Só o espaço (contexto de escopo) filtra no servidor; os demais filtros e a
  // busca rodam no cliente, para que os indicadores reflitam o total do espaço
  // (e não o subconjunto já filtrado) e a filtragem por clique seja instantânea.
  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    const filters: any = {}
    if (spaceFilter !== 'all') filters.spaceId = Number(spaceFilter)

    const res = await getEventsForList(filters)
    if (res.success && res.data) {
      setEvents(res.data)
    }
    setIsLoading(false)
  }, [spaceFilter])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    getSpaces().then((res) => {
      if (res.success && res.data) setSpaces(res.data)
    })
  }, [])

  const summary = useMemo(
    () => ({
      totalEvents: events.length,
      paidCount: events.filter((e) => e.paymentStatus === 'paid').length,
      partialCount: events.filter((e) => e.paymentStatus === 'partial').length,
      unpaidCount: events.filter((e) => e.paymentStatus === 'unpaid').length,
      pendingSignatureCount: events.filter(hasPendingSignature).length,
    }),
    [events],
  )

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return events.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false
      if (paymentFilter !== 'all' && e.paymentStatus !== paymentFilter) return false
      if (contractFilter !== 'all' && (e.contractStatus || 'not_sent') !== contractFilter) return false
      if (signatureFilter === 'pending' && !hasPendingSignature(e)) return false
      if (q) {
        const match =
          e.title?.toLowerCase().includes(q) ||
          e.client?.name?.toLowerCase().includes(q) ||
          e.space?.name?.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [events, statusFilter, paymentFilter, contractFilter, signatureFilter, search])

  // Indicadores como atalho de filtro: pagamento é mutuamente exclusivo (radio),
  // assinatura é um toggle independente; "Total" zera ambos.
  const togglePayment = (value: string) =>
    setPaymentFilter((prev) => (prev === value ? 'all' : value))
  const toggleSignature = () =>
    setSignatureFilter((prev) => (prev === 'pending' ? 'all' : 'pending'))
  const clearQuickFilters = () => {
    setPaymentFilter('all')
    setSignatureFilter('all')
  }
  const clearAllFilters = () => {
    setStatusFilter('all')
    setPaymentFilter('all')
    setContractFilter('all')
    setSignatureFilter('all')
    setSearch('')
  }

  const handleCreate = () => {
    setSelectedEvent(undefined)
    setIsModalOpen(true)
  }

  const handleEdit = (event: any) => {
    setSelectedEvent(event)
    setIsModalOpen(true)
  }

  const handleDelete = async (event: any) => {
    // Evento com contrato (gerado, manual ou assinatura ativa) não pode ser
    // excluído — o servidor também bloqueia; aqui evitamos o confirm inútil.
    const counts = event._count || {}
    const hasContracts =
      (counts.generatedContracts ?? 0) > 0 ||
      (counts.manualContracts ?? 0) > 0 ||
      (counts.contractSignatures ?? 0) > 0
    if (hasContracts) {
      setDeleteBlockedEventId(event.id)
      return
    }
    if (confirm('Tem certeza que deseja excluir este evento e todos os registros vinculados?')) {
      const res = await deleteEvent(event.id)
      if (!res.success) {
        alert(res.error || 'Erro ao excluir evento')
      }
      fetchEvents()
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const getContractDisplayStatus = (event: any) => {
    if (event.contractSignatures?.length > 0) {
      return event.contractSignatures[0].status
    }
    return event.contractStatus || 'not_sent'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Eventos</h1>
            <p className="text-sm text-muted-foreground">Gerenciamento de eventos e pendencias</p>
          </div>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Evento
        </Button>
      </div>

      {/* Stats Cards — clicáveis: filtram a lista abaixo */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <StatCard
          icon={CalendarDays}
          count={summary.totalEvents}
          label="Total"
          tone="primary"
          active={paymentFilter === 'all' && signatureFilter === 'all'}
          onClick={clearQuickFilters}
        />
        <StatCard
          icon={CheckCircle2}
          count={summary.paidCount}
          label="Pagos"
          tone="success"
          active={paymentFilter === 'paid'}
          onClick={() => togglePayment('paid')}
        />
        <StatCard
          icon={Clock}
          count={summary.partialCount}
          label="Parciais"
          tone="warning"
          active={paymentFilter === 'partial'}
          onClick={() => togglePayment('partial')}
        />
        <StatCard
          icon={AlertCircle}
          count={summary.unpaidCount}
          label="Pendentes"
          tone="destructive"
          active={paymentFilter === 'unpaid'}
          onClick={() => togglePayment('unpaid')}
        />
        <StatCard
          icon={FileSignature}
          count={summary.pendingSignatureCount}
          label="Assinatura pendente"
          tone="info"
          active={signatureFilter === 'pending'}
          onClick={toggleSignature}
        />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground shrink-0">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>
          <select
            value={spaceFilter}
            onChange={(e) => setSpaceFilter(e.target.value)}
            className="!w-auto rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="all">Todos os espaços</option>
            {spaces.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="!w-auto rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="all">Todos status</option>
            <option value="confirming">Confirmando</option>
            <option value="reserved">Reservado</option>
            <option value="available">Disponivel</option>
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="!w-auto rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="all">Pagamento</option>
            <option value="paid">Pago</option>
            <option value="partial">Parcial</option>
            <option value="unpaid">Pendente</option>
          </select>
          <select
            value={contractFilter}
            onChange={(e) => setContractFilter(e.target.value)}
            className="!w-auto rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="all">Contrato</option>
            <option value="not_sent">Nao Enviado</option>
            <option value="sent">Enviado</option>
            <option value="signed">Assinado</option>
          </select>
          <select
            value={signatureFilter}
            onChange={(e) => setSignatureFilter(e.target.value as 'all' | 'pending')}
            className="!w-auto rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="all">Assinatura</option>
            <option value="pending">Pendente</option>
          </select>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por titulo ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Events Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Lista de Eventos</CardTitle>
            <span className="text-sm text-muted-foreground">({filteredEvents.length})</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={CalendarDays}
                title={
                  events.length === 0
                    ? 'Nenhum evento encontrado'
                    : 'Nenhum evento corresponde aos filtros'
                }
                description={
                  events.length === 0
                    ? 'Crie um novo evento para comecar'
                    : 'Ajuste ou limpe os filtros para ver mais eventos.'
                }
                action={
                  events.length === 0 ? (
                    <Button onClick={handleCreate} className="mt-4 gap-2">
                      <Plus className="h-4 w-4" />
                      Novo Evento
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={clearAllFilters} className="mt-4">
                      Limpar filtros
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id} className="group">
                    <TableCell>
                      <div>
                        <Link
                          href={`/events/${event.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {event.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          {event.client && (
                            <span className="text-xs text-muted-foreground">{event.client.name}</span>
                          )}
                          <span className="text-xs text-muted-foreground/60">
                            {event.space?.name}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(event.start), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[event.status] || 'secondary'}>
                        {STATUS_LABELS[event.status] || event.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={PAYMENT_VARIANTS[event.paymentStatus] || 'secondary'}>
                        {PAYMENT_LABELS[event.paymentStatus] || event.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ContractStatusBadge status={getContractDisplayStatus(event)} />
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      {formatCurrency(event.totalValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/events/${event.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(event)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(event)}
                        >
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

      {/* Event Modal */}
      <EventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedEvent(undefined)
        }}
        initialEvent={selectedEvent}
        initialCategory="event"
        onSuccess={fetchEvents}
      />

      {/* Aviso de exclusão bloqueada (evento com contrato) */}
      <DeleteEventBlockedModal
        isOpen={deleteBlockedEventId !== null}
        onClose={() => setDeleteBlockedEventId(null)}
        eventId={deleteBlockedEventId ?? undefined}
      />
    </div>
  )
}
