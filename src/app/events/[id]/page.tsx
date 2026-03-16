'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  DollarSign,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Link2,
  Mail,
  MessageSquare,
  Phone,
  PartyPopper,
  CreditCard,
  Upload,
  ExternalLink,
} from 'lucide-react'
import { getEventById, updateEvent } from '@/app/actions/events'
import { getTransactionsByEventId, deleteTransaction } from '@/app/actions/transactions'
import { getContractSignature } from '@/app/actions/clicksign'
import { checkOverdueInstallments, deleteInstallment } from '@/app/actions/installments'
import { deleteManualContract } from '@/app/actions/manualContracts'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Button, buttonVariants } from '@/components/ui/Button'
import { ContractStatusBadge } from '@/components/contracts/ContractStatusBadge'
import { EventDetailsActions } from '@/components/events/EventDetailsActions'
import { AddProfessionalPopover } from '@/components/events/AddProfessionalPopover'
import { LinkTransactionModal } from '@/components/events/LinkTransactionModal'
import { TransactionModal } from '@/components/forms/TransactionModal'
import { FinancialSummaryCard } from '@/components/installments/FinancialSummaryCard'
import { InstallmentTable } from '@/components/installments/InstallmentTable'
import type { Installment } from '@/components/installments/InstallmentTable'
import { PaymentPlanModal } from '@/components/installments/PaymentPlanModal'
import { MarkAsPaidModal } from '@/components/installments/MarkAsPaidModal'
import { EditInstallmentModal } from '@/components/installments/EditInstallmentModal'
import { UploadContractModal } from '@/components/contracts/UploadContractModal'
import { ClientModal } from '@/components/forms/ClientModal'
import { InterestDatesModal } from '@/components/forms/InterestDatesModal'

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

const interestStatusLabels: Record<string, string> = {
  interest: 'Interesse',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
}

const interestStatusClasses: Record<string, string> = {
  interest: 'bg-purple-100 text-purple-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const interestEventTypeLabels: Record<string, string> = {
  casamento: 'Casamento',
  aniversario: 'Aniversario',
  confraternizacao: 'Confraternizacao',
  outros: 'Outros',
}

const interestEventTypeClasses: Record<string, string> = {
  casamento: 'bg-pink-100 text-pink-700',
  aniversario: 'bg-blue-100 text-blue-700',
  confraternizacao: 'bg-amber-100 text-amber-700',
  outros: 'bg-gray-100 text-gray-700',
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

const formatDateOnly = (value: string | Date) =>
  new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })

export default function EventPage() {
  const params = useParams()
  const rawId = Array.isArray(params?.id) ? params?.id?.[0] : params?.id
  const eventId = rawId ? Number.parseInt(String(rawId), 10) : Number.NaN
  const [event, setEvent] = useState<any | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [contractSignature, setContractSignature] = useState<any | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [isLinkTransactionModalOpen, setIsLinkTransactionModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<any | undefined>(undefined)
  const [isPaymentPlanModalOpen, setIsPaymentPlanModalOpen] = useState(false)
  const [isMarkPaidModalOpen, setIsMarkPaidModalOpen] = useState(false)
  const [isEditInstallmentModalOpen, setIsEditInstallmentModalOpen] = useState(false)
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null)
  const [isUploadContractModalOpen, setIsUploadContractModalOpen] = useState(false)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [isInterestDatesModalOpen, setIsInterestDatesModalOpen] = useState(false)

  const fetchEvent = useCallback(async () => {
    if (!eventId || Number.isNaN(eventId)) return
    const res = await getEventById(eventId)
    if (res.success && res.data) setEvent(res.data)
  }, [eventId])

  const fetchTransactions = useCallback(async () => {
    if (!eventId || Number.isNaN(eventId)) return
    const res = await getTransactionsByEventId(eventId)
    if (res.success && res.data) setTransactions(res.data)
  }, [eventId])

  useEffect(() => {
    if (!rawId || Number.isNaN(eventId) || eventId <= 0) {
      setErrorMessage('O identificador do evento e invalido.')
      setIsLoading(false)
      return
    }

    const loadEvent = async () => {
      await checkOverdueInstallments()
      const [eventRes, txRes, contractRes] = await Promise.all([
        getEventById(eventId),
        getTransactionsByEventId(eventId),
        getContractSignature(eventId),
      ])
      if (!eventRes.success || !eventRes.data) {
        setErrorMessage('Esse evento nao esta mais disponivel.')
      } else {
        setEvent(eventRes.data)
      }
      if (txRes.success && txRes.data) setTransactions(txRes.data)
      if (contractRes.success && contractRes.data) setContractSignature(contractRes.data)
      setIsLoading(false)
    }

    loadEvent()
  }, [eventId, rawId])

  const handleRefreshAfterTransaction = useCallback(async () => {
    await fetchTransactions()
    await fetchEvent()
  }, [fetchTransactions, fetchEvent])

  const handleRemoveProfessional = useCallback(
    async (professionalId: number) => {
      if (!event || !confirm('Remover este profissional do evento?')) return
      const currentIds = (event.professionals || []).map(
        (item: any) => item.professional?.id || item.professionalId,
      )
      const newIds = currentIds.filter((id: number) => id !== professionalId)
      const res = await updateEvent(eventId, { professionalIds: newIds })
      if (res.success) {
        await fetchEvent()
      }
    },
    [event, eventId, fetchEvent],
  )

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
            <Link href="/events" className={buttonVariants({ variant: 'outline' })}>
              <ArrowLeft className="h-4 w-4" />
              Voltar aos eventos
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const professionals = event.professionals || []
  const currentProfessionalIds = professionals.map(
    (item: any) => item.professional?.id || item.professionalId,
  )
  const category = event.category || 'event'
  const isFinancialEvent = category === 'event'
  const isVisit = category === 'visit'
  const client = event.client
  const interestDates = client?.interestDates || []

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
          <Link href="/events" className={buttonVariants({ variant: 'outline' })}>
            <ArrowLeft className="h-4 w-4" />
            Voltar aos eventos
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
            {client?.name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{client.name}</span>
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
          {/* Financial details moved to dedicated FinancialSummaryCard below */}
          {event.notes && (
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
              {event.notes}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Cliente Vinculado</CardTitle>
            </div>
            {client && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setIsClientModalOpen(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Editar Cliente
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setIsInterestDatesModalOpen(true)}
                >
                  <CalendarDays className="h-4 w-4" />
                  Datas de Interesse
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {!client ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Nenhum cliente vinculado a este evento.
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="text-xs text-muted-foreground">Cliente</div>
                  <div className="font-semibold text-foreground">{client.name}</div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>Telefone</span>
                  </div>
                  <div className="font-medium text-foreground">{client.phone || '-'}</div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span>E-mail</span>
                  </div>
                  <div className="font-medium text-foreground break-words">{client.email || '-'}</div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="text-xs text-muted-foreground">Datas de interesse</div>
                  <div className="font-semibold text-foreground">{interestDates.length}</div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-secondary/20 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Observacoes do cliente
                </div>
                <p className="text-sm text-muted-foreground">
                  {client.notes || 'Nenhuma observacao cadastrada para este cliente.'}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <PartyPopper className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">Datas de Interesse</h2>
                </div>
                {interestDates.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Nenhuma data de interesse cadastrada para este cliente.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {interestDates.map((interestDate: any) => (
                      <div
                        key={interestDate.id}
                        className="rounded-lg border border-border bg-background p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{formatDateOnly(interestDate.date)}</Badge>
                          <Badge
                            className={
                              interestStatusClasses[interestDate.status] ||
                              interestStatusClasses.interest
                            }
                          >
                            {interestStatusLabels[interestDate.status] || interestDate.status}
                          </Badge>
                          {interestDate.eventType && (
                            <Badge
                              className={
                                interestEventTypeClasses[interestDate.eventType] ||
                                interestEventTypeClasses.outros
                              }
                            >
                              {interestEventTypeLabels[interestDate.eventType] ||
                                interestDate.eventType}
                            </Badge>
                          )}
                          {interestDate.numberOfPeople && (
                            <Badge variant="outline">{interestDate.numberOfPeople} pessoas</Badge>
                          )}
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{interestDate.space?.name || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            <span>{formatDateOnly(interestDate.date)}</span>
                          </div>
                        </div>
                        {interestDate.notes && (
                          <p className="mt-3 text-sm text-muted-foreground">{interestDate.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!isVisit && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Profissionais no Evento</CardTitle>
              </div>
              <AddProfessionalPopover
                eventId={eventId}
                currentProfessionalIds={currentProfessionalIds}
                onSuccess={fetchEvent}
              />
            </div>
          </CardHeader>
          <CardContent>
            {professionals.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                Nenhum profissional vinculado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {professionals.map((item: any) => {
                    const profId = item.professional?.id || item.professionalId
                    return (
                      <TableRow key={profId}>
                        <TableCell className="font-medium text-foreground">
                          {item.professional?.name || '-'}
                        </TableCell>
                        <TableCell>{item.professional?.type || '-'}</TableCell>
                        <TableCell>{item.professional?.phone || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveProfessional(profId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Financial Summary */}
      {isFinancialEvent && (
        <FinancialSummaryCard
          totalValue={event.totalValue}
          deposit={event.deposit}
          installments={event.installments || []}
          paymentStatus={event.paymentStatus}
        />
      )}

      {/* Payment Plan Section */}
      {isFinancialEvent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Plano de Pagamento</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setIsPaymentPlanModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  {(event.installments?.length ?? 0) > 0 ? 'Reconfigurar' : 'Configurar Parcelamento'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <InstallmentTable
              installments={event.installments || []}
              onMarkPaid={(inst) => {
                setSelectedInstallment(inst)
                setIsMarkPaidModalOpen(true)
              }}
              onEdit={(inst) => {
                setSelectedInstallment(inst)
                setIsEditInstallmentModalOpen(true)
              }}
              onDelete={async (inst) => {
                if (confirm('Excluir esta parcela?')) {
                  await deleteInstallment(inst.id)
                  await fetchEvent()
                }
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Transactions Section */}
      {isFinancialEvent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Outras Transacoes</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setIsLinkTransactionModalOpen(true)}
                >
                  <Link2 className="h-4 w-4" />
                  Vincular Existente
                </Button>
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    setSelectedTransaction(undefined)
                    setIsTransactionModalOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Criar Nova
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Nenhuma transacao vinculada a este evento
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descricao</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(tx.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.type === 'income' ? 'success' : 'destructive'}>
                          {tx.type === 'income' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{tx.description}</TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 'paid' ? 'success' : 'warning'}>
                          {tx.status === 'paid' ? 'Pago' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedTransaction(tx)
                              setIsTransactionModalOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={async () => {
                              if (confirm('Excluir esta transacao?')) {
                                await deleteTransaction(tx.id)
                                await handleRefreshAfterTransaction()
                              }
                            }}
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
      )}

      {/* Contract Section */}
      {isFinancialEvent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Contrato</CardTitle>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => setIsUploadContractModalOpen(true)}
              >
                <Upload className="h-4 w-4" />
                Upload PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Clicksign contract info */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">Status:</span>
              <ContractStatusBadge
                status={
                  event.manualContracts?.length > 0 && !contractSignature
                    ? 'manual_uploaded'
                    : contractSignature?.status || event.contractStatus || 'not_sent'
                }
              />
              {contractSignature?.contractNumber && (
                <Badge variant="outline">N. {contractSignature.contractNumber}</Badge>
              )}
            </div>
            {contractSignature?.signingUrl && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Link de assinatura:</span>
                <a
                  href={contractSignature.signingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Abrir link
                </a>
              </div>
            )}
            {(!contractSignature || contractSignature.status === 'cancelled') &&
              (!event.manualContracts || event.manualContracts.length === 0) && (
              <p className="text-sm text-muted-foreground">
                Use a pagina de{' '}
                <Link href="/contracts" className="text-blue-600 hover:underline">
                  Contratos
                </Link>{' '}
                para gerar e enviar o contrato, ou faca upload de um PDF manualmente.
              </p>
            )}

            {/* Manual contracts list */}
            {event.manualContracts && event.manualContracts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Contratos Manuais</h4>
                <div className="space-y-2">
                  {event.manualContracts.map((mc: any) => (
                    <div
                      key={mc.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-secondary/20 p-3"
                    >
                      <FileText className="h-5 w-5 flex-shrink-0 text-red-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {mc.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(mc.createdAt), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                          {mc.notes && ` — ${mc.notes}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={mc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                          title="Visualizar"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Excluir"
                          onClick={async () => {
                            if (confirm('Excluir este contrato?')) {
                              await deleteManualContract(mc.id)
                              await fetchEvent()
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => {
          setIsTransactionModalOpen(false)
          setSelectedTransaction(undefined)
        }}
        initialTransaction={selectedTransaction}
        defaultEventId={selectedTransaction ? undefined : eventId}
        onSuccess={handleRefreshAfterTransaction}
      />

      {/* Link Transaction Modal */}
      <LinkTransactionModal
        isOpen={isLinkTransactionModalOpen}
        onClose={() => setIsLinkTransactionModalOpen(false)}
        eventId={eventId}
        onSuccess={handleRefreshAfterTransaction}
      />

      {/* Payment Plan Modal */}
      <PaymentPlanModal
        isOpen={isPaymentPlanModalOpen}
        onClose={() => setIsPaymentPlanModalOpen(false)}
        eventId={eventId}
        totalValue={event?.totalValue ?? 0}
        deposit={event?.deposit ?? 0}
        onSuccess={async () => {
          await fetchEvent()
          await fetchTransactions()
        }}
      />

      {/* Mark as Paid Modal */}
      <MarkAsPaidModal
        isOpen={isMarkPaidModalOpen}
        onClose={() => {
          setIsMarkPaidModalOpen(false)
          setSelectedInstallment(null)
        }}
        installment={selectedInstallment}
        onSuccess={async () => {
          await fetchEvent()
          await fetchTransactions()
        }}
      />

      {/* Edit Installment Modal */}
      <EditInstallmentModal
        isOpen={isEditInstallmentModalOpen}
        onClose={() => {
          setIsEditInstallmentModalOpen(false)
          setSelectedInstallment(null)
        }}
        installment={selectedInstallment}
        onSuccess={fetchEvent}
      />

      {/* Upload Contract Modal */}
      <UploadContractModal
        isOpen={isUploadContractModalOpen}
        onClose={() => setIsUploadContractModalOpen(false)}
        eventId={eventId}
        onSuccess={fetchEvent}
      />

      {/* Client Edit Modal */}
      {client && (
        <ClientModal
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          initialClient={client}
          onSuccess={fetchEvent}
        />
      )}

      {/* Interest Dates Modal */}
      {client && (
        <InterestDatesModal
          isOpen={isInterestDatesModalOpen}
          onClose={() => {
            setIsInterestDatesModalOpen(false)
            fetchEvent()
          }}
          client={{ id: client.id, name: client.name }}
        />
      )}
    </div>
  )
}
