'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { createTransaction, updateTransaction } from '@/app/actions/transactions'
import { getEvents } from '@/app/actions/events'
import { DollarSign, FileText, Calendar, Tag } from 'lucide-react'

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  category: z.string().min(1, 'Categoria é obrigatória'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().positive('Valor deve ser maior que zero'),
  date: z.string().min(1, 'Data é obrigatória'),
  status: z.enum(['paid', 'pending']),
  paidAt: z.string().optional(),
  eventId: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'income' && data.category === 'event_payment' && !data.eventId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['eventId'],
      message: 'Evento e obrigatorio para pagamento de evento',
    })
  }
})

type TransactionFormValues = z.infer<typeof transactionSchema>

type EventOption = {
  id: number
  title: string
}

const incomeCategories = [
  { value: 'event_payment', label: 'Pagamento de Evento' },
  { value: 'deposit', label: 'Sinal/Depósito' },
  { value: 'rental', label: 'Aluguel' },
  { value: 'rental_installment', label: 'Parcela de Aluguel' },
  { value: 'other_income', label: 'Outras Receitas' },
]

const expenseCategories = [
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
    category: string
    description: string
    amount: number
    date: Date | string
    status?: 'paid' | 'pending'
    paidAt?: Date | string | null
    eventId?: number | null
    notes?: string | null
  }
  onSuccess: () => void
  defaultType?: 'income' | 'expense'
}

export function TransactionModal({ isOpen, onClose, initialTransaction, onSuccess, defaultType = 'income' }: TransactionModalProps) {
  const [events, setEvents] = useState<EventOption[]>([])
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: defaultType,
      category: '',
      description: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      status: 'paid',
      paidAt: new Date().toISOString().split('T')[0],
      eventId: '',
      notes: '',
    },
    values: initialTransaction ? {
      type: initialTransaction.type as 'income' | 'expense',
      category: initialTransaction.category,
      description: initialTransaction.description,
      amount: initialTransaction.amount,
      date: typeof initialTransaction.date === 'string'
        ? initialTransaction.date.split('T')[0]
        : new Date(initialTransaction.date).toISOString().split('T')[0],
      status: initialTransaction.status || 'paid',
      paidAt: initialTransaction.paidAt
        ? (typeof initialTransaction.paidAt === 'string'
            ? initialTransaction.paidAt.split('T')[0]
            : new Date(initialTransaction.paidAt).toISOString().split('T')[0])
        : '',
      eventId: initialTransaction.eventId ? String(initialTransaction.eventId) : '',
      notes: initialTransaction.notes || '',
    } : undefined
  })

  const watchType = watch('type')
  const watchCategory = watch('category')
  const watchStatus = watch('status')
  const categories = watchType === 'income' ? incomeCategories : expenseCategories
  const showEventSelect = watchType === 'income' && watchCategory === 'event_payment'

  useEffect(() => {
    if (!isOpen || !showEventSelect) return

    const loadEvents = async () => {
      const res = await getEvents(undefined, undefined, { categories: ['event'] })
      if (res.success && res.data) {
        const options = (res.data as EventOption[]).map((event) => ({
          id: event.id,
          title: event.title,
        }))
        setEvents(options)
      }
    }

    loadEvents()
  }, [isOpen, showEventSelect])

  const onSubmit = async (data: TransactionFormValues) => {
    try {
      const submitData = {
        ...data,
        date: new Date(data.date),
        status: data.status,
        paidAt: data.status === 'paid' && data.paidAt ? new Date(data.paidAt) : null,
        eventId: data.category === 'event_payment' && data.eventId
          ? parseInt(data.eventId, 10)
          : null,
        notes: data.notes || null,
      }

      if (initialTransaction) {
        await updateTransaction(initialTransaction.id, submitData)
      } else {
        await createTransaction(submitData)
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialTransaction ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
          <DialogDescription>
            {initialTransaction ? 'Atualize as informações da transação.' : 'Registre uma nova receita ou despesa.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Type Selection */}
          <div className="space-y-2">
            <Label>Tipo de Transação *</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => field.onChange('income')}
                    className={`p-4 rounded-lg border-2 transition-all ${
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
                    className={`p-4 rounded-lg border-2 transition-all ${
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

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                id="category"
                {...register('category')}
                className="flex h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          {showEventSelect && (
            <div className="space-y-2">
              <Label htmlFor="eventId">Evento *</Label>
              <select
                id="eventId"
                {...register('eventId')}
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Selecione um evento</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
              {errors.eventId && (
                <p className="text-sm text-destructive">{errors.eventId.message}</p>
              )}
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              placeholder="Ex: Pagamento do evento de casamento..."
              icon={<FileText className="h-4 w-4" />}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Amount and Date */}
          <div className="grid grid-cols-2 gap-4">
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
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data Prevista *</Label>
              <Input
                id="date"
                type="date"
                icon={<Calendar className="h-4 w-4" />}
                {...register('date')}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>
          </div>

          {/* Payment Status */}
          <div className="grid grid-cols-2 gap-4">
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
                <Input
                  id="paidAt"
                  type="date"
                  icon={<Calendar className="h-4 w-4" />}
                  {...register('paidAt')}
                />
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

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Informações adicionais sobre esta transação..."
              rows={3}
              {...register('notes')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              variant={watchType === 'income' ? 'success' : 'destructive'}
            >
              {initialTransaction ? 'Salvar Alterações' : 'Registrar Transação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
