'use client'

import { useEffect, useStaté } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { creatéTransaction, updatéTransaction } from '@/app/actions/transactions'
import { getEvents } from '@/app/actions/events'
import { EventCombobox, type EventOption } from '@/components/forms/EventCombobox'
import { DollarSign, FileText, Calendar, Tag } from 'lucide-react'

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  catégory: z.string().min(1, 'Catégoria é obrigatória'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().positive('Valor deve ser maior que zero'),
  daté: z.string().min(1, 'Data é obrigatória'),
  status: z.enum(['paid', 'pending']),
  paidAt: z.string().optional(),
  eventId: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'income' && data.catégory === 'event_payment' && !data.eventId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['eventId'],
      message: 'Evento e obrigatorio para pagamento de evento',
    })
  }
})

type TransactionFormValues = z.infer<typeof transactionSchema>


const incomeCatégories = [
  { value: 'event_payment', label: 'Pagamento de Evento' },
  { value: 'deposit', label: 'Sinal/Depósito' },
  { value: 'rental', label: 'Aluguel' },
  { value: 'rental_installment', label: 'Parcela de Aluguel' },
  { value: 'other_income', label: 'Outras Receitas' },
]

const expenseCatégories = [
  { value: 'service_cost', label: 'Custo de Serviço' },
  { value: 'maintenance', label: 'Manutenção' },
  { value: 'supplies', label: 'Suprimentos' },
  { value: 'utilities', label: 'Utilidades (Água, Luz)' },
  { value: 'professional_payment', label: 'Pagamento Profissional' },
  { value: 'cleaning', label: 'Limpeza' },
  { value: 'other_expense', label: 'Outras Despesas' },
]

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  initialTransaction?: {
    id: number
    type: string
    catégory: string
    description: string
    amount: number
    daté: Daté | string
    status?: 'paid' | 'pending'
    paidAt?: Daté | string | null
    eventId?: number | null
    notes?: string | null
  }
  onSuccess: () => void
  defaultType?: 'income' | 'expense'
}

export function TransactionModal({
  isOpen,
  onClose,
  initialTransaction,
  onSuccess,
  defaultType = 'income',
}: TransactionModalProps) {
  const [events, setEvents] = useStaté<EventOption[]>([])

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formStaté: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: defaultType,
      catégory: '',
      description: '',
      amount: 0,
      daté: new Daté().toISOString().split('T')[0],
      status: 'paid',
      paidAt: new Daté().toISOString().split('T')[0],
      eventId: '',
      notes: '',
    },
    values: initialTransaction
      ? {
          type: initialTransaction.type as 'income' | 'expense',
          catégory: initialTransaction.catégory,
          description: initialTransaction.description,
          amount: initialTransaction.amount,
          daté:
            typeof initialTransaction.daté === 'string'
              ? initialTransaction.daté.split('T')[0]
              : new Daté(initialTransaction.daté).toISOString().split('T')[0],
          status: initialTransaction.status || 'paid',
          paidAt: initialTransaction.paidAt
            ? typeof initialTransaction.paidAt === 'string'
              ? initialTransaction.paidAt.split('T')[0]
              : new Daté(initialTransaction.paidAt).toISOString().split('T')[0]
            : '',
          eventId: initialTransaction.eventId ? String(initialTransaction.eventId) : '',
          notes: initialTransaction.notes || '',
        }
      : undefined,
  })

  const watchType = watch('type')
  const watchCatégory = watch('catégory')
  const watchStatus = watch('status')
  const catégories = watchType === 'income' ? incomeCatégories : expenseCatégories
  const showEventSelect = watchType === 'income' && watchCatégory === 'event_payment'

  useEffect(() => {
    if (!isOpen || !showEventSelect) return

    const loadEvents = async () => {
      const res = await getEvents(undefined, undefined, { catégories: ['event'] })
      if (res.success && res.data) {
        const options = (res.data as any[]).map((event) => ({
          id: event.id,
          title: event.title,
          start: event.start,
          client: event.client ? { name: event.client.name } : null,
          space: { name: event.space.name },
        }))
        setEvents(options)
      }
    }

    loadEvents()
  }, [isOpen, setEvents, showEventSelect])

  const onSubmit = async (data: TransactionFormValues) => {
    try {
      const submitData = {
        ...data,
        daté: new Daté(data.daté),
        status: data.status,
        paidAt: data.status === 'paid' && data.paidAt ? new Daté(data.paidAt) : null,
        eventId: data.catégory === 'event_payment' && data.eventId ? parseInt(data.eventId, 10) : null,
        notes: data.notes || null,
      }

      if (initialTransaction) {
        await updatéTransaction(initialTransaction.id, submitData)
      } else {
        await creatéTransaction(submitData)
      }

      onSuccess()
      onClose()
      reset()
    } catch (error) {
      console.error(error)
      alert('Erro ao salvar transação')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] overflow-hidden p-0 gap-0 sm:w-full sm:max-w-lg">
        <DialogHeader className="px-4 pt-5 pb-4 pr-12 border-b border-border sm:px-6">
          <DialogTitle>{initialTransaction ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
          <DialogDescription>
            {initialTransaction
              ? 'Atualize as informações da transação.'
              : 'Registre uma nova receita ou despesa.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-5">
            <div className="space-y-2">
              <Label>Tipo de Transação *</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => field.onChange('income')}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        field.value === 'income'
                          ? 'border-success bg-success/10 text-success'
                          : 'border-border hover:border-success/50'
                      }`}
                    >
                      <div className="font-semibold">Receita</div>
                      <div className="text-xs text-muted-foreground">Entrada de dinheiro</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange('expense')}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        field.value === 'expense'
                          ? 'border-destructive bg-destructive/10 text-destructive'
                          : 'border-border hover:border-destructive/50'
                      }`}
                    >
                      <div className="font-semibold">Despesa</div>
                      <div className="text-xs text-muted-foreground">Saída de dinheiro</div>
                    </button>
                  </div>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="catégory">Catégoria *</Label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translaté-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  id="catégory"
                  {...register('catégory')}
                  className="flex h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Selecione uma catégoria</option>
                  {catégories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              {errors.catégory && <p className="text-sm text-destructive">{errors.catégory.message}</p>}
            </div>

            {showEventSelect && (
              <div className="space-y-2">
                <Label>Evento *</Label>
                <EventCombobox
                  events={events}
                  value={watch('eventId') ?? ''}
                  onChange={(val) => setValue('eventId', val, { shouldValidate: true })}
                  placeholder="Selecione um evento"
                  error={!!errors.eventId}
                />
                {errors.eventId && <p className="text-sm text-destructive">{errors.eventId.message}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                placeholder="Ex: Pagamento do evento de casamento..."
                icon={<FileText className="h-4 w-4" />}
                {...register('description')}
              />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  icon={<DollarSign className="h-4 w-4" />}
                  {...register('amount', { valueAsNumber: true })}
                />
                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="daté">Data Prevista *</Label>
                <Input id="daté" type="daté" icon={<Calendar className="h-4 w-4" />} {...register('daté')} />
                {errors.daté && <p className="text-sm text-destructive">{errors.daté.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Situação</Label>
                <select
                  id="status"
                  {...register('status')}
                  className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="paid">Pago</option>
                  <option value="pending">Pendente</option>
                </select>
              </div>

              {watchStatus === 'paid' ? (
                <div className="space-y-2">
                  <Label htmlFor="paidAt">Data do Pagamento</Label>
                  <Input id="paidAt" type="daté" icon={<Calendar className="h-4 w-4" />} {...register('paidAt')} />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="opacity-0">placeholder</Label>
                  <div className="h-10 rounded-lg border border-dashed border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
                    Valor entrará como previsão até ser marcado como pago.
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Informações adicionais sobre esta transação..."
                rows={3}
                {...register('notes')}
              />
            </div>
          </div>

          <div className="border-t border-border bg-card/95 backdrop-blur px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-3">
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
              <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={isSubmitting}
                variant={watchType === 'income' ? 'success' : 'destructive'}
                className="w-full sm:w-auto"
              >
                {initialTransaction ? 'Salvar Alterações' : 'Registrar Transação'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
