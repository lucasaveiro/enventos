'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar as BigCalendar, dateFnsLocalizer, Views, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { getEvents } from '@/app/actions/events'
import { getServiceTasks } from '@/app/actions/services'
import { getFinancialCalendarItems } from '@/app/actions/transactions'
import { EventModal } from '@/components/forms/EventModal'
import { ServiceTaskModal } from '@/components/forms/ServiceTaskModal'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'

const locales = {
  'pt-BR': ptBR,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface CalendarEvent {
  id: number
  title: string
  start: Date
  end: Date
  type: 'event' | 'task' | 'financial'
  resource?: any
  allDay?: boolean
}

export function DashboardCalendar() {
  const router = useRouter()
  const [view, setView] = useState<View>(Views.MONTH)
  const [date, setDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isCreateTypeDialogOpen, setIsCreateTypeDialogOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)

    const [eventsResult, tasksResult, financialResult] = await Promise.all([
      getEvents(),
      getServiceTasks(),
      getFinancialCalendarItems(),
    ])

    const calendarEvents: CalendarEvent[] = []

    if (eventsResult.success && eventsResult.data) {
        eventsResult.data.forEach((e: any) => {
            calendarEvents.push({
                id: e.id,
                title: `${e.space.name} - ${e.title}`,
                start: new Date(e.start),
                end: new Date(e.end),
                type: 'event',
                resource: e
            })
        })
    }

    if (tasksResult.success && tasksResult.data) {
      tasksResult.data.forEach((t: any) => {
        calendarEvents.push({
          id: t.id,
          title: `[${t.serviceType.name}] ${t.space.name}`,
          start: new Date(t.start),
          end: t.end ? new Date(t.end) : new Date(new Date(t.start).setHours(new Date(t.start).getHours() + 1)),
          type: 'task',
          resource: t
        })
      })
    }

    if (financialResult.success && financialResult.data) {
      financialResult.data.forEach((item: any) => {
        const startDate = new Date(item.date)
        const endDate = new Date(startDate)
        endDate.setHours(endDate.getHours() + 1)

        calendarEvents.push({
          id: item.id + 1_000_000,
          title: `${item.type === 'income' ? 'Receber' : 'Pagar'}: ${item.title.replace(/^Receber: |^Pagar: /, '')}`,
          start: startDate,
          end: endDate,
          type: 'financial',
          resource: item,
        })
      })
    }

    setEvents(calendarEvents)
    setIsLoading(false)

  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#6366f1' // primary indigo

    if (event.type === 'event') {
      const status = event.resource.status
      if (status === 'confirming') backgroundColor = '#f59e0b' // warning amber
      else if (status === 'reserved') backgroundColor = '#10b981' // success emerald
    } else if (event.type === 'task') {
      const serviceName = event.resource.serviceType.name
      if (serviceName === 'Limpeza') backgroundColor = '#3b82f6' // blue-500
      else if (serviceName === 'Jardinagem') backgroundColor = '#22c55e' // green-500
      else if (serviceName === 'Piscina') backgroundColor = '#06b6d4' // cyan-500
      else backgroundColor = '#8b5cf6' // violet-500
    } else {
      backgroundColor = event.resource.type === 'income' ? '#0ea5e9' : '#ef4444'
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontWeight: 500,
        fontSize: '0.75rem',
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
      }
    }
  }

  const handleSelectSlot = (slotInfo: any) => {
      setSelectedDate(slotInfo.start ? new Date(slotInfo.start) : undefined)
      setSelectedTask(undefined)
      setIsCreateTypeDialogOpen(true)
  }

  const handleSelectEvent = (event: CalendarEvent) => {
      if (event.type === 'event') {
          const eventId = event.resource?.id ?? event.id
          if (typeof eventId === 'number' && eventId > 0) {
            router.push(`/events/${eventId}`)
          } else {
            setSelectedDate(undefined)
            setIsModalOpen(true)
          }
      } else if (event.type === 'task') {
        setSelectedTask(event.resource)
        setIsTaskModalOpen(true)
      } else {
        router.push('/financial')
      }
  }

  const handleOpenEventModal = () => {
    setIsCreateTypeDialogOpen(false)
    setIsModalOpen(true)
  }

  const handleOpenTaskModal = () => {
    setIsCreateTypeDialogOpen(false)
    setSelectedTask(undefined)
    setIsTaskModalOpen(true)
  }

  const handleCloseEventModal = () => {
    setIsModalOpen(false)
    setSelectedDate(undefined)
  }

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false)
    setSelectedTask(undefined)
    setSelectedDate(undefined)
  }

  // Count events by type for the legend
  const eventCount = events.filter(e => e.type === 'event').length
  const taskCount = events.filter(e => e.type === 'task').length
  const financialCount = events.filter(e => e.type === 'financial').length

  return (
    <Card className="overflow-hidden">
      {/* Calendar Header with Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4 bg-secondary/30">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-foreground">Agenda</h2>
          <div className="flex items-center gap-2">
            <Badge variant="info">{eventCount} Reservas</Badge>
            <Badge variant="secondary">{taskCount} Tarefas</Badge>
            <Badge variant="warning">{financialCount} Financeiro</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Reservado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Confirmando</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Limpeza</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Jardinagem</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-cyan-500" />
            <span className="text-muted-foreground">Piscina</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-sky-500" />
            <span className="text-muted-foreground">Receber</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Pagar</span>
          </div>
        </div>
      </div>

      {/* Calendar Container */}
      <div className="h-[700px] p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Carregando calendário...</span>
            </div>
          </div>
        ) : (
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            views={['month', 'week', 'day', 'agenda']}
            view={view}
            date={date}
            onView={setView}
            onNavigate={setDate}
            culture='pt-BR'
            messages={{
                next: "Próximo",
                previous: "Anterior",
                today: "Hoje",
                month: "Mês",
                week: "Semana",
                day: "Dia",
                agenda: "Agenda",
                date: "Data",
                time: "Hora",
                event: "Evento",
                noEventsInRange: "Não há eventos neste período."
            }}
            eventPropGetter={eventStyleGetter}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
          />
        )}
      </div>

      <Dialog open={isCreateTypeDialogOpen} onOpenChange={setIsCreateTypeDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>O que você deseja adicionar?</DialogTitle>
            <DialogDescription>
              Escolha o tipo de item para cadastrar no calendário.
              {selectedDate ? ` Data selecionada: ${format(selectedDate, 'dd/MM/yyyy HH:mm', { locale: ptBR })}.` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              size="lg"
              className="h-24 text-lg font-semibold"
              onClick={handleOpenEventModal}
            >
              Evento
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-24 text-lg font-semibold"
              onClick={handleOpenTaskModal}
            >
              Serviço
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EventModal
        isOpen={isModalOpen}
        onClose={handleCloseEventModal}
        initialDate={selectedDate}
        onSuccess={fetchData}
      />

      <ServiceTaskModal
        isOpen={isTaskModalOpen}
        onClose={handleCloseTaskModal}
        initialDate={selectedDate}
        initialTask={selectedTask}
        onSuccess={fetchData}
      />
    </Card>
  )
}
