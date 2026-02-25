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

type EventModalCategory = 'event' | 'visit'

export function DashboardCalendar() {
  const router = useRouter()
  // No mobile usa view Agenda por padrão (mais legível em telas pequenas)
  const [view, setView] = useState<View>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? Views.AGENDA : Views.MONTH
  )
  const [date, setDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isCreateTypeDialogOpen, setIsCreateTypeDialogOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEventCategory, setSelectedEventCategory] = useState<EventModalCategory>('event')
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
            const category = e.category || 'event'
            const prefix = category === 'visit'
              ? 'Visita'
              : category === 'proposal'
                ? 'Enviar Proposta'
                : e.space.name
            calendarEvents.push({
                id: e.id,
                title: `${prefix} - ${e.title}`,
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
    let backgroundColor = '#4a6fa5' // muted steel blue

    if (event.type === 'event') {
      const category = event.resource.category || 'event'
      const status = event.resource.status
      if (category === 'visit') {
        if (status === 'visit_done') backgroundColor = '#1e7a4e' // muted forest green
        else if (status === 'visit_cancelled') backgroundColor = '#a83030' // muted red
        else backgroundColor = '#0d9488' // muted teal
      } else if (category === 'proposal') {
        if (status === 'proposal_sent') backgroundColor = '#1e7a4e' // muted forest green
        else if (status === 'proposal_cancelled') backgroundColor = '#a83030' // muted red
        else backgroundColor = '#2a6aaa' // muted sky blue
      } else if (status === 'confirming') backgroundColor = '#9e6c14' // muted amber
      else if (status === 'reserved') backgroundColor = '#1e7a4e' // muted forest green
    } else if (event.type === 'task') {
      const serviceName = event.resource.serviceType.name
      if (serviceName === 'Limpeza') backgroundColor = '#3a6aac' // muted blue
      else if (serviceName === 'Jardinagem') backgroundColor = '#2a7a42' // muted forest green
      else if (serviceName === 'Piscina') backgroundColor = '#1a7a88' // muted teal
      else backgroundColor = '#5c6c90' // muted slate
    } else {
      backgroundColor = event.resource.type === 'income' ? '#2a6aaa' : '#a83030' // muted sky / muted red
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
    setSelectedEventCategory('event')
    setIsModalOpen(true)
  }

  const handleOpenVisitModal = () => {
    setIsCreateTypeDialogOpen(false)
    setSelectedEventCategory('visit')
    setIsModalOpen(true)
  }

  const handleOpenTaskModal = () => {
    setIsCreateTypeDialogOpen(false)
    setSelectedTask(undefined)
    setIsTaskModalOpen(true)
  }

  const handleCloseEventModal = () => {
    setIsModalOpen(false)
    setSelectedEventCategory('event')
    setSelectedDate(undefined)
  }

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false)
    setSelectedTask(undefined)
    setSelectedDate(undefined)
  }

  // Count events by type for the legend
  const reservationCount = events.filter(
    (e) => e.type === 'event' && (e.resource?.category || 'event') === 'event'
  ).length
  const visitCount = events.filter(
    (e) => e.type === 'event' && e.resource?.category === 'visit'
  ).length
  const proposalCount = events.filter(
    (e) => e.type === 'event' && e.resource?.category === 'proposal'
  ).length
  const taskCount = events.filter(e => e.type === 'task').length
  const financialCount = events.filter(e => e.type === 'financial').length

  return (
    <Card className="overflow-hidden">
      {/* Calendar Header with Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4 bg-secondary/30">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-foreground">Agenda</h2>
          <div className="flex items-center gap-2">
            <Badge variant="info">{reservationCount} Eventos</Badge>
            <Badge variant="secondary">{visitCount} Visitas</Badge>
            <Badge variant="warning">{proposalCount} Enviar Proposta</Badge>
            <Badge variant="secondary">{taskCount} Tarefas</Badge>
            <Badge variant="warning">{financialCount} Financeiro</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#1e7a4e' }} />
            <span className="text-muted-foreground">Reservado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#9e6c14' }} />
            <span className="text-muted-foreground">Confirmando</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#0d9488' }} />
            <span className="text-muted-foreground">Visita</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#2a6aaa' }} />
            <span className="text-muted-foreground">Enviar Proposta</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#3a6aac' }} />
            <span className="text-muted-foreground">Limpeza</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#2a7a42' }} />
            <span className="text-muted-foreground">Jardinagem</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#1a7a88' }} />
            <span className="text-muted-foreground">Piscina</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#2a6aaa' }} />
            <span className="text-muted-foreground">Receber</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#a83030' }} />
            <span className="text-muted-foreground">Pagar</span>
          </div>
        </div>
      </div>

      {/* Calendar Container */}
      <div className="h-[480px] sm:h-[580px] lg:h-[700px] p-2 sm:p-4">
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

          <div className="grid gap-3 sm:grid-cols-3">
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
              onClick={handleOpenVisitModal}
            >
              Visita
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
        initialCategory={selectedEventCategory}
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
