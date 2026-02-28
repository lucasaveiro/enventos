'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Checkbox } from '@/components/ui/Checkbox'
import { getSpaces } from '@/app/actions/spaces'
import { getClients, createClient } from '@/app/actions/clients'
import { getProfessionals } from '@/app/actions/professionals'
import { createEvent, updateEvent } from '@/app/actions/events'

type EventCategory = 'event' | 'visit' | 'proposal'

const EVENT_CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: 'event', label: 'Evento' },
  { value: 'visit', label: 'Visita' },
  { value: 'proposal', label: 'Enviar Proposta' },
]

const STATUS_OPTIONS_BY_CATEGORY: Record<EventCategory, { value: string; label: string }[]> = {
  event: [
    { value: 'confirming', label: 'Em Confirmação' },
    { value: 'reserved', label: 'Reservado' },
    { value: 'available', label: 'Disponível' },
  ],
  visit: [
    { value: 'visit_scheduled', label: 'Visita Agendada' },
    { value: 'visit_done', label: 'Visita Realizada' },
    { value: 'visit_cancelled', label: 'Visita Cancelada' },
  ],
  proposal: [
    { value: 'proposal_pending', label: 'Pendente de Envio' },
    { value: 'proposal_sent', label: 'Proposta Enviada' },
    { value: 'proposal_cancelled', label: 'Cancelada' },
  ],
}

function getDefaultStatus(category: EventCategory): string {
  return STATUS_OPTIONS_BY_CATEGORY[category][0]?.value ?? 'confirming'
}

const eventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  category: z.enum(['event', 'visit', 'proposal']),
  spaceId: z.string().min(1, 'Espaço é obrigatório'),
  clientId: z.string().optional(),
  newClientName: z.string().optional(),
  start: z.string().min(1, 'Data de início é obrigatória'),
  end: z.string().min(1, 'Data de fim é obrigatória'),
  totalValue: z.string().optional(),
  deposit: z.string().optional(),
  status: z.string().min(1, 'Status é obrigatório'),
  professionalIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
  createProposalFollowUp: z.boolean().optional(),
  proposalStart: z.string().optional(),
  proposalEnd: z.string().optional(),
  proposalNotes: z.string().optional(),
}).superRefine((data, ctx) => {
  const eventStart = new Date(data.start)
  const eventEnd = new Date(data.end)
  if (!Number.isNaN(eventStart.getTime()) && !Number.isNaN(eventEnd.getTime()) && eventEnd <= eventStart) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['end'],
      message: 'Data de fim deve ser maior que a data de início',
    })
  }

  if (data.category === 'event') {
    const total = Number((data.totalValue || '0').replace(',', '.'))
    if (Number.isNaN(total) || total < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['totalValue'],
        message: 'Valor total não pode ser negativo',
      })
    }

    const deposit = Number((data.deposit || '0').replace(',', '.'))
    if (!Number.isNaN(total) && !Number.isNaN(deposit) && deposit > total) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deposit'],
        message: 'Sinal não pode ser maior que o valor total',
      })
    }
  }

  if (data.createProposalFollowUp) {
    if (data.category !== 'visit') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['createProposalFollowUp'],
        message: 'Apenas visitas podem gerar envio de proposta',
      })
      return
    }

    if (!data.proposalStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proposalStart'],
        message: 'Data de início da proposta é obrigatória',
      })
    }

    if (!data.proposalEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proposalEnd'],
        message: 'Data de fim da proposta é obrigatória',
      })
    }

    if (data.proposalStart && data.proposalEnd) {
      const proposalStart = new Date(data.proposalStart)
      const proposalEnd = new Date(data.proposalEnd)
      if (!Number.isNaN(proposalStart.getTime()) && !Number.isNaN(proposalEnd.getTime()) && proposalEnd <= proposalStart) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['proposalEnd'],
          message: 'Fim deve ser maior que início no envio da proposta',
        })
      }
    }
  }
})

type EventFormValues = z.infer<typeof eventSchema>

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  initialDate?: Date
  initialEvent?: any
  initialCategory?: EventCategory
  onSuccess: () => void
}

export function EventModal({
  isOpen,
  onClose,
  initialDate,
  initialEvent,
  initialCategory = 'event',
  onSuccess,
}: EventModalProps) {
  const [spaces, setSpaces] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [professionals, setProfessionals] = useState<any[]>([])
  const [isNewClient, setIsNewClient] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      category: initialCategory,
      status: getDefaultStatus(initialCategory),
      totalValue: '0',
      deposit: '0',
      professionalIds: [],
      createProposalFollowUp: false,
    }
  })

  const selectedProfessionals = watch('professionalIds') || []
  const selectedCategory = watch('category')
  const selectedStatus = watch('status')
  const shouldCreateProposal = watch('createProposalFollowUp')

  useEffect(() => {
    async function loadData() {
      const [spacesRes, clientsRes, professionalsRes] = await Promise.all([
        getSpaces(),
        getClients(),
        getProfessionals()
      ])
      if (spacesRes.success) setSpaces(spacesRes.data || [])
      if (clientsRes.success) setClients(clientsRes.data || [])
      if (professionalsRes.success) setProfessionals(professionalsRes.data || [])
    }
    loadData()
  }, [])

  useEffect(() => {
    if (!isOpen) return

    setIsNewClient(false)

    if (initialEvent) {
      const category = (initialEvent.category || 'event') as EventCategory
      setValue('title', initialEvent.title)
      setValue('category', category)
      setValue('spaceId', String(initialEvent.spaceId))
      setValue('clientId', initialEvent.clientId ? String(initialEvent.clientId) : '')
      setValue('start', new Date(initialEvent.start).toISOString().slice(0, 16))
      setValue('end', new Date(initialEvent.end).toISOString().slice(0, 16))
      setValue('totalValue', String(initialEvent.totalValue ?? 0))
      setValue('deposit', String(initialEvent.deposit ?? 0))
      setValue('status', initialEvent.status || getDefaultStatus(category))
      setValue('notes', initialEvent.notes || '')
      setValue('createProposalFollowUp', false)
      setValue('proposalStart', '')
      setValue('proposalEnd', '')
      setValue('proposalNotes', '')
      setValue(
        'professionalIds',
        initialEvent.professionals
          ? initialEvent.professionals.map((p: any) =>
              String(p.professionalId ?? p.professional?.id)
            )
          : []
      )
      return
    }

    const category = initialCategory
    const baseDate = initialDate ? new Date(initialDate) : new Date()
    const start = new Date(baseDate)
    const end = new Date(baseDate)
    end.setHours(end.getHours() + (category === 'event' ? 4 : 1))

    reset({
      title: category === 'visit' ? 'Visita ao espaço' : category === 'proposal' ? 'Enviar Proposta' : '',
      category,
      spaceId: '',
      clientId: '',
      newClientName: '',
      start: start.toISOString().slice(0, 16),
      end: end.toISOString().slice(0, 16),
      totalValue: '0',
      deposit: '0',
      status: getDefaultStatus(category),
      professionalIds: [],
      notes: '',
      createProposalFollowUp: false,
      proposalStart: '',
      proposalEnd: '',
      proposalNotes: '',
    })
  }, [isOpen, initialDate, initialEvent, initialCategory, setValue, reset])

  useEffect(() => {
    const allowedStatuses = STATUS_OPTIONS_BY_CATEGORY[selectedCategory]
    const hasValidStatus = allowedStatuses.some((option) => option.value === selectedStatus)

    if (!hasValidStatus) {
      setValue('status', getDefaultStatus(selectedCategory))
    }

    if (selectedCategory !== 'visit') {
      setValue('createProposalFollowUp', false)
    }
  }, [selectedCategory, selectedStatus, setValue])

  const onSubmit = async (data: EventFormValues) => {
    try {
      let clientId = data.clientId ? parseInt(data.clientId, 10) : undefined

      if (isNewClient && data.newClientName) {
        const newClient = await createClient({ name: data.newClientName })
        if (newClient.success && newClient.data) {
          clientId = newClient.data.id
        }
      }

      const isFinancialEvent = data.category === 'event'
      const totalValue = isFinancialEvent
        ? Number((data.totalValue || '0').replace(',', '.'))
        : 0
      const deposit = isFinancialEvent
        ? Number((data.deposit || '0').replace(',', '.'))
        : 0

      const payload = {
        title: data.title,
        category: data.category,
        spaceId: parseInt(data.spaceId, 10),
        clientId,
        start: new Date(data.start),
        end: new Date(data.end),
        totalValue: Number.isNaN(totalValue) ? 0 : totalValue,
        deposit: Number.isNaN(deposit) ? 0 : deposit,
        status: data.status,
        paymentStatus: initialEvent?.paymentStatus || 'unpaid',
        contractStatus: initialEvent?.contractStatus || 'not_sent',
        notes: data.notes,
        professionalIds: isFinancialEvent && data.professionalIds
          ? data.professionalIds.map((id) => parseInt(id, 10))
          : [],
      }

      if (initialEvent) {
        await updateEvent(initialEvent.id, payload)
      } else {
        await createEvent(payload)
      }

      if (
        data.category === 'visit' &&
        data.createProposalFollowUp &&
        data.proposalStart &&
        data.proposalEnd
      ) {
        const selectedClient = clientId
          ? clients.find((client) => client.id === clientId)
          : null
        const clientName = selectedClient?.name || data.newClientName || 'Cliente'
        const proposalTitle = `Enviar Proposta - ${clientName}`
        const proposalNotes = data.proposalNotes || `Gerado a partir da visita: ${data.title}`

        await createEvent({
          title: proposalTitle,
          category: 'proposal',
          spaceId: parseInt(data.spaceId, 10),
          clientId,
          start: new Date(data.proposalStart),
          end: new Date(data.proposalEnd),
          totalValue: 0,
          deposit: 0,
          status: 'proposal_pending',
          paymentStatus: 'unpaid',
          contractStatus: 'not_sent',
          notes: proposalNotes,
          professionalIds: [],
        })
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error(error)
      alert('Erro ao salvar marcação')
    }
  }

  const statusOptions = STATUS_OPTIONS_BY_CATEGORY[selectedCategory]
  const showFinancialFields = selectedCategory === 'event'
  const showProfessionals = selectedCategory === 'event'
  const showProposalFlow = selectedCategory === 'visit'

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-[10000] max-h-[85vh] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-xl bg-[var(--card)] p-6 shadow-xl focus:outline-none border border-[var(--border)]">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-[var(--foreground)]">
              {initialEvent ? 'Editar Marcação' : 'Nova Marcação'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors rounded-lg p-1 hover:bg-[var(--secondary)]">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input id="title" {...register('title')} placeholder="Ex: Aniversário João" />
                {errors.title && <span className="text-sm text-red-500">{errors.title.message}</span>}
              </div>

              <div>
                <Label htmlFor="category">Categoria</Label>
                <select id="category" {...register('category')}>
                  {EVENT_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                {errors.category && <span className="text-sm text-red-500">{errors.category.message}</span>}
              </div>
            </div>

            <div>
              <Label htmlFor="spaceId">Espaço</Label>
              <select id="spaceId" {...register('spaceId')}>
                <option value="">Selecione...</option>
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>{space.name}</option>
                ))}
              </select>
              {errors.spaceId && <span className="text-sm text-red-500">{errors.spaceId.message}</span>}
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  {!isNewClient ? (
                    <select {...register('clientId')}>
                      <option value="">Selecione um cliente...</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  ) : (
                    <Input {...register('newClientName')} placeholder="Nome do novo cliente" />
                  )}
                </div>
                <Button type="button" variant="outline" onClick={() => setIsNewClient(!isNewClient)}>
                  {isNewClient ? 'Selecionar' : 'Novo'}
                </Button>
              </div>
            </div>

            {showProfessionals && (
              <div className="space-y-2">
                <Label>Profissionais</Label>
                {professionals.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Nenhum profissional cadastrado</span>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {professionals.map((professional) => {
                      const professionalId = String(professional.id)
                      const isSelected = selectedProfessionals.includes(professionalId)

                      return (
                        <label
                          key={professional.id}
                          className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const next = new Set(selectedProfessionals)
                              if (checked) next.add(professionalId)
                              else next.delete(professionalId)
                              setValue('professionalIds', Array.from(next))
                            }}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{professional.name}</span>
                            <span className="text-xs text-muted-foreground">{professional.type}</span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">Início</Label>
                <Input id="start" type="datetime-local" {...register('start')} />
                {errors.start && <span className="text-sm text-red-500">{errors.start.message}</span>}
              </div>
              <div>
                <Label htmlFor="end">Fim</Label>
                <Input id="end" type="datetime-local" {...register('end')} />
                {errors.end && <span className="text-sm text-red-500">{errors.end.message}</span>}
              </div>
            </div>

            {showFinancialFields ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="totalValue">Valor Total (R$)</Label>
                  <Input id="totalValue" type="number" step="0.01" {...register('totalValue')} />
                  {errors.totalValue && <span className="text-sm text-red-500">{errors.totalValue.message}</span>}
                </div>
                <div>
                  <Label htmlFor="deposit">Sinal (R$)</Label>
                  <Input id="deposit" type="number" step="0.01" {...register('deposit')} />
                  {errors.deposit && <span className="text-sm text-red-500">{errors.deposit.message}</span>}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
                Marcações de visita/proposta não exigem valor financeiro.
              </div>
            )}

            <div>
              <Label htmlFor="status">Status</Label>
              <select id="status" {...register('status')}>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" {...register('notes')} />
            </div>

            {showProposalFlow && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <label className="flex items-center gap-3 text-sm">
                  <Checkbox
                    checked={Boolean(shouldCreateProposal)}
                    onCheckedChange={(checked) => setValue('createProposalFollowUp', Boolean(checked))}
                  />
                  Gerar lembrete de Enviar Proposta para esta visita
                </label>

                {shouldCreateProposal && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="proposalStart">Início (Enviar Proposta)</Label>
                        <Input id="proposalStart" type="datetime-local" {...register('proposalStart')} />
                        {errors.proposalStart && <span className="text-sm text-red-500">{errors.proposalStart.message}</span>}
                      </div>
                      <div>
                        <Label htmlFor="proposalEnd">Fim (Enviar Proposta)</Label>
                        <Input id="proposalEnd" type="datetime-local" {...register('proposalEnd')} />
                        {errors.proposalEnd && <span className="text-sm text-red-500">{errors.proposalEnd.message}</span>}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="proposalNotes">Observação da Proposta</Label>
                      <Textarea id="proposalNotes" {...register('proposalNotes')} placeholder="Ex: enviar proposta com opção completa até 18h." />
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
