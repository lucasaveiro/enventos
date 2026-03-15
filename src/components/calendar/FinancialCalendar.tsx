'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar as BigCalendar, dateFnsLocalizer, Views, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addDays, isBefore } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import {
  getInstallmentsForCalendar,
  getFinancialCalendarSummary,
  checkOverdueInstallments,
} from '@/app/actions/installments'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { MarkAsPaidModal } from '@/components/installments/MarkAsPaidModal'
import {
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  CalendarDays,
  ExternalLink,
} from 'lucide-react'

const locales = { 'pt-BR': ptBR }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

interface CalendarInstallment {
  id: number
  title: string
  start: Date
  end: Date
  status: string
  amount: number
  paidAmount: number | null
  installmentNumber: number
  paymentMethod: string | null
  isSinal: boolean
  eventId: number
  eventTitle: string
  clientName: string | null
  clientPhone: string | null
  spaceName: string
  spaceId: number
  dueDate: Date
  paidAt: Date | string | null
  notes: string | null
}

interface SummaryData {
  dueThisMonth: { amount: number; count: number }
  overdue: { amount: number; count: number }
  upcoming7Days: { amount: number; count: number }
  paidThisMonth: { amount: number; count: number }
}

interface FinancialCalendarProps {
  initialSpaceId?: number
  spaces?: { id: number; name: string }[]
}

export function FinancialCalendar({ spaces }: FinancialCalendarProps) {
  const router = useRouter()
  const [view, setView] = useState<View>(Views.MONTH)
  const [date, setDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarInstallment[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [spaceFilter, setSpaceFilter] = useState<number | undefined>(undefined)
  const [selectedItem, setSelectedItem] = useState<CalendarInstallment | null>(null)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false)

  useEffect(() => {
    if (window.innerWidth < 768) setView(Views.AGENDA)
  }, [])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    await checkOverdueInstallments()

    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)

    const [itemsRes, summaryRes] = await Promise.all([
      getInstallmentsForCalendar({
        start: monthStart,
        end: monthEnd,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        spaceId: spaceFilter,
      }),
      getFinancialCalendarSummary({ start: monthStart, end: monthEnd }),
    ])

    if (itemsRes.success && itemsRes.data) {
      const calEvents: CalendarInstallment[] = itemsRes.data.map((item) => ({
        ...item,
        start: new Date(item.dueDate),
        end: new Date(item.dueDate),
        dueDate: new Date(item.dueDate),
      }))
      setEvents(calEvents)
    }

    if (summaryRes.success && summaryRes.data) {
      setSummary(summaryRes.data)
    }

    setIsLoading(false)
  }, [date, statusFilter, spaceFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const eventStyleGetter = (event: CalendarInstallment) => {
    const now = new Date()
    const sevenDaysFromNow = addDays(now, 7)
    let backgroundColor = '#2a6aaa' // default blue for pending

    if (event.status === 'paid') {
      backgroundColor = '#1e7a4e' // green
    } else if (event.status === 'overdue') {
      backgroundColor = '#a83030' // red
    } else if (isBefore(new Date(event.dueDate), sevenDaysFromNow)) {
      backgroundColor = '#9e6c14' // amber - upcoming
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: event.status === 'paid' ? 0.7 : 1,
        color: 'white',
        border: 'none',
        padding: '2px 6px',
        fontSize: '12px',
      },
    }
  }

  const handleSelectEvent = (event: CalendarInstallment) => {
    setSelectedItem(event)
    setIsQuickViewOpen(true)
  }

  const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
    paid: { label: 'Pago', variant: 'success' },
    pending: { label: 'Pendente', variant: 'warning' },
    overdue: { label: 'Vencido', variant: 'destructive' },
  }

  const messages = {
    today: 'Hoje',
    previous: 'Anterior',
    next: 'Proximo',
    month: 'Mes',
    week: 'Semana',
    day: 'Dia',
    agenda: 'Agenda',
    noEventsInRange: 'Nenhum vencimento neste periodo.',
    showMore: (total: number) => `+${total} mais`,
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <CalendarDays className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vencendo Este Mes</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(summary.dueThisMonth.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{summary.dueThisMonth.count} parcela(s)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Em Atraso</p>
                  <p className="text-lg font-bold text-destructive">
                    {formatCurrency(summary.overdue.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{summary.overdue.count} parcela(s)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Proximos 7 Dias</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(summary.upcoming7Days.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{summary.upcoming7Days.count} parcela(s)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pago Este Mes</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(summary.paidThisMonth.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{summary.paidThisMonth.count} parcela(s)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Status:</label>
              <select
                className="h-9 rounded-md border border-input bg-input-bg px-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="pending">Pendente</option>
                <option value="overdue">Vencido</option>
                <option value="paid">Pago</option>
              </select>
            </div>
            {spaces && spaces.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Espaco:</label>
                <select
                  className="h-9 rounded-md border border-input bg-input-bg px-3 text-sm"
                  value={spaceFilter ?? ''}
                  onChange={(e) =>
                    setSpaceFilter(e.target.value ? Number(e.target.value) : undefined)
                  }
                >
                  <option value="">Todos</option>
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {/* Legend */}
            <div className="ml-auto flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded" style={{ backgroundColor: '#1e7a4e' }} />
                <span>Pago</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded" style={{ backgroundColor: '#2a6aaa' }} />
                <span>Pendente</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded" style={{ backgroundColor: '#9e6c14' }} />
                <span>Proximo</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded" style={{ backgroundColor: '#a83030' }} />
                <span>Vencido</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardContent className="p-2 sm:p-4">
          <div style={{ height: 600 }}>
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleSelectEvent}
              messages={messages}
              culture="pt-BR"
              popup
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick View Dialog */}
      <Dialog
        open={isQuickViewOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsQuickViewOpen(false)
            setSelectedItem(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedItem?.isSinal ? 'Sinal' : `Parcela ${selectedItem?.installmentNumber}`}
            </DialogTitle>
            <DialogDescription>{selectedItem?.eventTitle}</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid gap-3 grid-cols-2 text-sm">
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="text-xs text-muted-foreground">Valor</div>
                  <div className="font-semibold">{formatCurrency(selectedItem.amount)}</div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="text-xs text-muted-foreground">Vencimento</div>
                  <div className="font-semibold">
                    {format(new Date(selectedItem.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="text-xs text-muted-foreground">Cliente</div>
                  <div className="font-semibold">{selectedItem.clientName || '-'}</div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="text-xs text-muted-foreground">Espaco</div>
                  <div className="font-semibold">{selectedItem.spaceName}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={statusConfig[selectedItem.status]?.variant ?? 'warning'}>
                  {statusConfig[selectedItem.status]?.label ?? selectedItem.status}
                </Badge>
              </div>

              <div className="flex gap-2">
                {selectedItem.status !== 'paid' && (
                  <Button
                    className="flex-1 gap-1"
                    onClick={() => {
                      setIsQuickViewOpen(false)
                      setIsMarkPaidOpen(true)
                    }}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Marcar como Pago
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="gap-1"
                  onClick={() => router.push(`/events/${selectedItem.eventId}`)}
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver Evento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Modal */}
      <MarkAsPaidModal
        isOpen={isMarkPaidOpen}
        onClose={() => {
          setIsMarkPaidOpen(false)
          setSelectedItem(null)
        }}
        installment={selectedItem}
        onSuccess={fetchData}
      />
    </div>
  )
}
