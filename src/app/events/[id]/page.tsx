'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, CalendarDays, MapPin, Users } from 'lucide-react'
import { getEventById } from '@/app/actions/events'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { buttonVariants } from '@/components/ui/Button'
import { EventDetailsActions } from '@/components/events/EventDetailsActions'

const statusLabels: Record<string, string> = {
  confirming: 'Confirmando',
  reserved: 'Reservado',
  available: 'Disponivel',
  visit_scheduled: 'Visita Agendada',
  visit_done: 'Visita Realizada',
  visit_cancelled: 'Visita Cancelada',
  proposal_pending: 'Pendente de Envio',
  proposal_sent: 'Proposta Enviada',
  proposal_cancelled: 'Proposta Cancelada',
}

const categoryLabels: Record<string, string> = {
  event: 'Evento',
  visit: 'Visita',
  proposal: 'Enviar Proposta',
}

const paymentLabels: Record<string, string> = {
  paid: 'Pago',
  partial: 'Parcial',
  unpaid: 'Pendente',
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

export default function EventPage() {
  const params = useParams()
  const rawId = Array.isArray(params?.id) ? params?.id?.[0] : params?.id
  const eventId = rawId ? Number.parseInt(String(rawId), 10) : Number.NaN
  const [event, setEvent] = useState<any | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!rawId || Number.isNaN(eventId) || eventId <= 0) {
      setErrorMessage('O identificador do evento e invalido.')
      setIsLoading(false)
      return
    }

    const loadEvent = async () => {
      const eventRes = await getEventById(eventId)
      if (!eventRes.success || !eventRes.data) {
        setErrorMessage('Esse evento nao esta mais disponivel.')
      } else {
        setEvent(eventRes.data)
      }
      setIsLoading(false)
    }

    loadEvent()
  }, [eventId, rawId])

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardContent className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            Carregando evento...
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!event || errorMessage) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardHeader>
            <CardTitle>Evento nao encontrado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{errorMessage || 'Esse evento nao esta mais disponivel.'}</p>
            <p>ID recebido: {rawId ?? 'vazio'}</p>
            <Link href="/" className={buttonVariants({ variant: 'outline' })}>
              <ArrowLeft className="h-4 w-4" />
              Voltar ao calendario
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const professionals = event.professionals || []
  const category = event.category || 'event'
  const isFinancialEvent = category === 'event'

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(event.start), 'dd/MM/yyyy HH:mm', { locale: ptBR })} -{' '}
              {format(new Date(event.end), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EventDetailsActions event={event} />
          <Link href="/" className={buttonVariants({ variant: 'outline' })}>
            <ArrowLeft className="h-4 w-4" />
            Voltar ao calendario
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Evento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{event.space?.name || '-'}</span>
            </div>
            {event.client?.name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{event.client.name}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge variant="info">{categoryLabels[category] || category}</Badge>
            <Badge variant="secondary">{statusLabels[event.status] || event.status}</Badge>
            {isFinancialEvent && (
              <Badge variant="info">{paymentLabels[event.paymentStatus] || event.paymentStatus}</Badge>
            )}
          </div>
          {isFinancialEvent && (
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <div className="text-xs text-muted-foreground">Valor total</div>
                <div className="font-semibold text-foreground">{formatCurrency(event.totalValue)}</div>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <div className="text-xs text-muted-foreground">Sinal</div>
                <div className="font-semibold text-foreground">{formatCurrency(event.deposit)}</div>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="font-semibold text-foreground">
                  {paymentLabels[event.paymentStatus] || event.paymentStatus}
                </div>
              </div>
            </div>
          )}
          {event.notes && (
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
              {event.notes}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profissionais no Evento</CardTitle>
        </CardHeader>
        <CardContent>
          {professionals.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              Nenhum profissional vinculado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Telefone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {professionals.map((item: any) => (
                  <TableRow key={item.professional?.id || item.professionalId}>
                    <TableCell className="font-medium text-foreground">
                      {item.professional?.name || '-'}
                    </TableCell>
                    <TableCell>{item.professional?.type || '-'}</TableCell>
                    <TableCell>{item.professional?.phone || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
