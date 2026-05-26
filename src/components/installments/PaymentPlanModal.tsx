'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { addMonths } from 'date-fns'
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { createPaymentPlan } from '@/app/actions/installments'
import { parseLocalDate, toDateInputValue } from '@/lib/utils'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const schema = z.object({
  depositAmount: z.number().min(0, 'Valor minimo 0'),
  depositDueDate: z.string().min(1, 'Data do sinal obrigatoria'),
  numberOfInstallments: z.number().int().min(1, 'Minimo 1 parcela').max(48, 'Maximo 48 parcelas'),
  startDate: z.string().min(1, 'Data da primeira parcela obrigatoria'),
  paymentMethod: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface PreviewItem {
  id: string
  date: string
  amount: number
  isSinal: boolean
}

const paymentMethods = [
  { value: '', label: 'Selecione...' },
  { value: 'pix', label: 'PIX' },
  { value: 'credit_card', label: 'Cartao de Credito' },
  { value: 'debit_card', label: 'Cartao de Debito' },
  { value: 'bank_transfer', label: 'Transferencia Bancaria' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'boleto', label: 'Boleto' },
]

interface PaymentPlanModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: number
  totalValue: number
  deposit: number
  hasExistingPlan: boolean
  hasPaidInstallments: boolean
  onSuccess: () => void
}

function computePreview(
  depositAmount: number,
  depositDueDate: string,
  numberOfInstallments: number,
  startDate: string,
  totalValue: number,
): PreviewItem[] {
  const items: PreviewItem[] = []
  if (depositAmount > 0 && depositDueDate) {
    items.push({
      id: 'sinal',
      date: depositDueDate,
      amount: depositAmount,
      isSinal: true,
    })
  }
  const remaining = Math.max(totalValue - (depositAmount || 0), 0)
  if (numberOfInstallments > 0 && startDate && remaining > 0) {
    const baseAmount = Math.floor((remaining / numberOfInstallments) * 100) / 100
    const lastAmount = remaining - baseAmount * (numberOfInstallments - 1)
    for (let i = 0; i < numberOfInstallments; i++) {
      const date = addMonths(parseLocalDate(startDate), i)
      items.push({
        id: `parcela-${i}`,
        date: toDateInputValue(date),
        amount:
          i === numberOfInstallments - 1
            ? Math.round(lastAmount * 100) / 100
            : baseAmount,
        isSinal: false,
      })
    }
  }
  return items
}

export function PaymentPlanModal({
  isOpen,
  onClose,
  eventId,
  totalValue,
  deposit,
  hasExistingPlan,
  hasPaidInstallments,
  onSuccess,
}: PaymentPlanModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [items, setItems] = useState<PreviewItem[]>([])
  const [manuallyEdited, setManuallyEdited] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      depositAmount: deposit,
      depositDueDate: toDateInputValue(new Date()),
      numberOfInstallments: 1,
      startDate: toDateInputValue(addMonths(new Date(), 1)),
      paymentMethod: '',
    },
  })

  const watchDeposit = watch('depositAmount')
  const watchInstallments = watch('numberOfInstallments')
  const watchStartDate = watch('startDate')
  const watchDepositDate = watch('depositDueDate')

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        depositAmount: deposit,
        depositDueDate: toDateInputValue(new Date()),
        numberOfInstallments: 1,
        startDate: toDateInputValue(addMonths(new Date(), 1)),
        paymentMethod: '',
      })
      setManuallyEdited(false)
    }
  }, [isOpen, deposit, reset])

  // Regenerate preview whenever inputs change AND no manual edits have happened
  useEffect(() => {
    if (manuallyEdited) return
    setItems(
      computePreview(
        watchDeposit || 0,
        watchDepositDate,
        watchInstallments || 0,
        watchStartDate,
        totalValue,
      ),
    )
  }, [
    watchDeposit,
    watchDepositDate,
    watchInstallments,
    watchStartDate,
    totalValue,
    manuallyEdited,
  ])

  const updateItem = (id: string, patch: Partial<PreviewItem>) => {
    setManuallyEdited(true)
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeItem = (id: string) => {
    setManuallyEdited(true)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const addInstallmentRow = () => {
    setManuallyEdited(true)
    const lastDate = items.length > 0 ? items[items.length - 1].date : watchStartDate
    setItems((prev) => [
      ...prev,
      {
        id: `extra-${Date.now()}`,
        date: toDateInputValue(addMonths(parseLocalDate(lastDate), 1)),
        amount: 0,
        isSinal: false,
      },
    ])
  }

  const resetAuto = () => {
    setManuallyEdited(false)
    setItems(
      computePreview(
        watchDeposit || 0,
        watchDepositDate,
        watchInstallments || 0,
        watchStartDate,
        totalValue,
      ),
    )
  }

  const itemsSum = items.reduce((s, it) => s + (Number.isFinite(it.amount) ? it.amount : 0), 0)
  const sumMatches = Math.abs(itemsSum - totalValue) < 0.01

  const onSubmit = async (data: FormValues) => {
    if (items.length === 0) {
      alert('Adicione pelo menos uma parcela.')
      return
    }
    if (!sumMatches) {
      const confirmed = confirm(
        `A soma das parcelas (${formatCurrency(itemsSum)}) e diferente do valor total do evento (${formatCurrency(totalValue)}). Deseja continuar mesmo assim?`,
      )
      if (!confirmed) return
    }

    if (hasExistingPlan) {
      const baseMessage =
        'Ao salvar, todas as parcelas existentes serao excluidas e o plano sera recriado do zero.'
      const paidMessage = hasPaidInstallments
        ? '\n\nATENCAO: existem parcelas marcadas como pagas. Elas (e suas transacoes vinculadas) serao removidas — as novas parcelas serao criadas como NAO PAGAS. Voce precisara dar baixa manualmente nos pagamentos ja recebidos.'
        : ''
      const confirmed = confirm(`${baseMessage}${paidMessage}\n\nDeseja prosseguir?`)
      if (!confirmed) return
    }

    setIsSubmitting(true)
    try {
      const customInstallments = items.map((item) => ({
        dueDate: parseLocalDate(item.date),
        amount: item.amount,
        isSinal: item.isSinal,
      }))

      const result = await createPaymentPlan({
        eventId,
        totalValue,
        numberOfInstallments: Math.max(
          customInstallments.filter((it) => !it.isSinal).length,
          1,
        ),
        startDate: parseLocalDate(data.startDate),
        depositAmount: data.depositAmount,
        depositDueDate: parseLocalDate(data.depositDueDate),
        paymentMethod: data.paymentMethod || undefined,
        customInstallments,
      })

      if (result.success) {
        onSuccess()
        onClose()
      } else {
        alert(result.error || 'Erro ao criar plano de pagamento')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Parcelamento</DialogTitle>
          <DialogDescription>
            Valor total do evento: {formatCurrency(totalValue)}
          </DialogDescription>
        </DialogHeader>

        {hasExistingPlan && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              Ja existe um plano configurado. Ao salvar, ele sera substituido pelo novo.
              {hasPaidInstallments && (
                <strong>
                  {' '}Parcelas pagas serao apagadas — voce precisara registrar novamente
                  os pagamentos ja recebidos.
                </strong>
              )}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Deposit Section */}
          <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Sinal / Entrada</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Valor do Sinal (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('depositAmount', { valueAsNumber: true })}
                />
                {errors.depositAmount && (
                  <p className="text-xs text-destructive mt-1">{errors.depositAmount.message}</p>
                )}
              </div>
              <div>
                <Label>Data do Sinal</Label>
                <Input type="date" {...register('depositDueDate')} />
                {errors.depositDueDate && (
                  <p className="text-xs text-destructive mt-1">{errors.depositDueDate.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Installments Section */}
          <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Parcelas</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Numero de Parcelas</Label>
                <Input
                  type="number"
                  min="1"
                  max="48"
                  {...register('numberOfInstallments', { valueAsNumber: true })}
                />
                {errors.numberOfInstallments && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.numberOfInstallments.message}
                  </p>
                )}
              </div>
              <div>
                <Label>Data 1a Parcela</Label>
                <Input type="date" {...register('startDate')} />
                {errors.startDate && (
                  <p className="text-xs text-destructive mt-1">{errors.startDate.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <Label>Metodo de Pagamento Padrao</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-input-bg px-3 py-2 text-sm"
              {...register('paymentMethod')}
            >
              {paymentMethods.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Editable Preview */}
          <div className="rounded-lg border border-border bg-secondary/10 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Parcelas a criar</h3>
              <div className="flex items-center gap-2">
                {manuallyEdited && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={resetAuto}
                    title="Recalcular automaticamente"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Recalcular
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={addInstallmentRow}
                >
                  + Adicionar
                </Button>
              </div>
            </div>

            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                Preencha o sinal e o numero de parcelas para gerar a previa.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[28px_70px_1fr_1fr_28px] sm:grid-cols-[32px_80px_1fr_1fr_32px] items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5"
                  >
                    <span className="text-xs font-medium text-center text-muted-foreground">
                      {idx + 1}
                    </span>
                    <div>
                      {item.isSinal ? (
                        <Badge variant="info" className="text-[10px] px-1.5 py-0">
                          Sinal
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Parcela</span>
                      )}
                    </div>
                    <Input
                      type="date"
                      value={item.date}
                      onChange={(e) => updateItem(item.id, { date: e.target.value })}
                      className="h-8 text-xs"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.amount}
                      onChange={(e) =>
                        updateItem(item.id, { amount: Number(e.target.value) })
                      }
                      className="h-8 text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                      title="Remover parcela"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
              <span className="text-muted-foreground">
                Soma: <span className="font-semibold text-foreground">{formatCurrency(itemsSum)}</span>
              </span>
              <span className="text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{formatCurrency(totalValue)}</span>
              </span>
            </div>
            {!sumMatches && items.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  A soma das parcelas e diferente do valor total do evento (diferenca:{' '}
                  {formatCurrency(Math.abs(itemsSum - totalValue))}).
                </span>
              </div>
            )}

            {items.some((it) => it.isSinal && it.amount > 0) && (
              <p className="text-[11px] text-muted-foreground">
                Dica: edite valores e datas livremente. Use &quot;Recalcular&quot; para voltar
                ao calculo automatico.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : hasExistingPlan ? 'Substituir Plano' : 'Criar Parcelamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
