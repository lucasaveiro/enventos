'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { getEventsForList, deleteEvent } from '@/app/actions/events'
import { getSpaces } from '@/app/actions/spaces'

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

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [summary, setSummary] = useState({ totalEvents: 0, paidCount: 0, partialCount: 0, unpaidCount: 0 })
  const [spaces, setSpaces] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any | undefined>(undefined)

  // Filters
  const [spaceFilter, setSpaceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [contractFilter, setContractFilter] = useState('all')
  const [search, setSearch] = useState('')

  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    const filters: any = {}
    if (spaceFilter !== 'all') filters.spaceId = Number(spaceFilter)
    if (statusFilter !== 'all') filters.status = statusFilter
    if (paymentFilter !== 'all') filters.paymentStatus = paymentFilter
    if (contractFilter !== 'all') filters.contractStatus = contractFilter

    const res = await getEventsForList(filters)
    if (res.success && res.data) {
      setEvents(res.data)
      if (res.summary) setSummary(res.summary)
    }
    setIsLoading(false)
  }, [spaceFilter, statusFilter, paymentFilter, contractFilter])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    getSpaces().then((res) => {
      if (res.success && res.data) setSpaces(res.data)
    })
  }, [])

  const filteredEvents = search.trim()
    ? events.filter((e) => {
        const q = search.toLowerCase()
        return (
          e.title.toLowerCase().includes(q) ||
          e.client?.name?.toLowerCase().includes(q) ||
          e.space?.name?.toLowerCase().includes(q)
        )
      })
    : events

  const handleCreate = () => {
    setSelectedEvent(undefined)
    setIsModalOpen(true)
  }

  const handleEdit = (event: any) => {
    setSelectedEvent(event)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este evento e todos os registros vinculados?')) {
      const res = await deleteEvent(id)
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

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalEvents}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.paidCount}</p>
                <p className="text-xs text-muted-foreground">Pagos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.partialCount}</p>
                <p className="text-xs text-muted-foreground">Parciais</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.unpaidCount}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
                title="Nenhum evento encontrado"
                description="Crie um novo evento para comecar"
                action={
                  <Button onClick={handleCreate} className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Evento
                  </Button>
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
                          onClick={() => handleDelete(event.id)}
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
    </div>
  )
}
