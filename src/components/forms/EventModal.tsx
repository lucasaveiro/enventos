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

const eventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  spaceId: z.string().min(1, 'Espaço é obrigatório'),
  clientId: z.string().optional(), // We might handle client creation differently
  newClientName: z.string().optional(),
  start: z.string().min(1, 'Data de início é obrigatória'),
  end: z.string().min(1, 'Data de fim é obrigatória'),
  totalValue: z.string().min(1, 'Valor total é obrigatório'),
  deposit: z.string().optional(),
  status: z.string(),
  professionalIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

type EventFormValues = z.infer<typeof eventSchema>

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  initialDate?: Date
  initialEvent?: any
  onSuccess: () => void
}

export function EventModal({ isOpen, onClose, initialDate, initialEvent, onSuccess }: EventModalProps) {
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
      status: 'confirming',
      totalValue: '0',
      deposit: '0',
      professionalIds: [],
    }
  })

  const selectedProfessionals = watch('professionalIds') || []

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
    if (isOpen) {
      if (initialEvent) {
        // Edit mode
        setValue('title', initialEvent.title)
        setValue('spaceId', String(initialEvent.spaceId))
        setValue('clientId', String(initialEvent.clientId))
        setValue('start', new Date(initialEvent.start).toISOString().slice(0, 16))
        setValue('end', new Date(initialEvent.end).toISOString().slice(0, 16))
        setValue('totalValue', String(initialEvent.totalValue))
        setValue('deposit', String(initialEvent.deposit))
        setValue('status', initialEvent.status)
        setValue('notes', initialEvent.notes || '')
        setValue(
          'professionalIds',
          initialEvent.professionals
            ? initialEvent.professionals.map((p: any) =>
                String(p.professionalId ?? p.professional?.id)
              )
            : []
        )
      } else if (initialDate) {
        // Create mode
        reset()
        const start = new Date(initialDate)
        const end = new Date(initialDate)
        end.setHours(end.getHours() + 4) // Default duration
        
        setValue('start', start.toISOString().slice(0, 16))
        setValue('end', end.toISOString().slice(0, 16))
        setValue('status', 'confirming')
      }
    }
  }, [isOpen, initialDate, initialEvent, setValue, reset])

  const onSubmit = async (data: EventFormValues) => {
    try {
      let clientId = data.clientId ? parseInt(data.clientId) : undefined

      if (isNewClient && data.newClientName) {
        const newClient = await createClient({ name: data.newClientName })
        if (newClient.success && newClient.data) {
          clientId = newClient.data.id
        }
      }

      const payload = {
        title: data.title,
        spaceId: parseInt(data.spaceId),
        clientId,
        start: new Date(data.start),
        end: new Date(data.end),
        totalValue: parseFloat(data.totalValue),
        deposit: data.deposit ? parseFloat(data.deposit) : 0,
        status: data.status,
        paymentStatus: 'unpaid', // Default
        contractStatus: 'not_sent', // Default
        notes: data.notes,
        professionalIds: data.professionalIds
          ? data.professionalIds.map((id) => parseInt(id, 10))
          : []
      }

      if (initialEvent) {
        await updateEvent(initialEvent.id, payload)
      } else {
        await createEvent(payload)
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error(error)
      alert('Erro ao salvar evento')
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-[10000] max-h-[85vh] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-xl bg-[var(--card)] p-6 shadow-xl focus:outline-none border border-[var(--border)]">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-[var(--foreground)]">
              {initialEvent ? 'Editar Evento' : 'Novo Evento'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors rounded-lg p-1 hover:bg-[var(--secondary)]">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="title">Título do Evento</Label>
              <Input id="title" {...register('title')} placeholder="Ex: Aniversário João" />
              {errors.title && <span className="text-sm text-red-500">{errors.title.message}</span>}
            </div>

            <div>
              <Label htmlFor="spaceId">Espaço</Label>
              <select
                id="spaceId"
                {...register('spaceId')}
              >
                <option value="">Selecione...</option>
                {spaces.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.spaceId && <span className="text-sm text-red-500">{errors.spaceId.message}</span>}
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <div className="flex items-center gap-2">
                 <div className="flex-1">
                    {!isNewClient ? (
                        <select
                            {...register('clientId')}
                        >
                            <option value="">Selecione um cliente...</option>
                            {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
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
                            if (checked) {
                              next.add(professionalId)
                            } else {
                              next.delete(professionalId)
                            }
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

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <Label htmlFor="totalValue">Valor Total (R$)</Label>
                  <Input id="totalValue" type="number" step="0.01" {...register('totalValue')} />
               </div>
               <div>
                  <Label htmlFor="deposit">Sinal (R$)</Label>
                  <Input id="deposit" type="number" step="0.01" {...register('deposit')} />
               </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                {...register('status')}
              >
                <option value="confirming">Em Confirmação</option>
                <option value="reserved">Reservado</option>
                <option value="available">Disponível</option>
              </select>
            </div>

            <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea 
                    id="notes"
                    {...register('notes')}
                />
            </div>

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
