'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { addMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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
  onSuccess: () => void
}

export function PaymentPlanModal({
  isOpen,
  onClose,
  eventId,
  totalValue,
  deposit,
  onSuccess,
}: PaymentPlanModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
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

  const remaining = Math.max(totalValue - (watchDeposit || 0), 0)
  const installmentAmount =
    watchInstallments > 0 ? remaining / watchInstallments : 0

  // Generate preview
  const previewItems: { number: number; date: string; amount: number; isSinal: boolean }[] = []
  if (watchDeposit > 0 && watchDepositDate) {
    previewItems.push({
      number: 1,
      date: watchDepositDate,
      amount: watchDeposit,
      isSinal: true,
    })
  }
  if (watchInstallments > 0 && watchStartDate && remaining > 0) {
    const baseAmount = Math.floor((remaining / watchInstallments) * 100) / 100
    const lastAmount = remaining - baseAmount * (watchInstallments - 1)
    for (let i = 0; i < watchInstallments; i++) {
      const date = addMonths(parseLocalDate(watchStartDate), i)
      previewItems.push({
        number: (watchDeposit > 0 ? 2 : 1) + i,
        date: toDateInputValue(date),
        amount: i === watchInstallments - 1
          ? Math.round(lastAmount * 100) / 100
          : baseAmount,
        isSinal: false,
      })
    }
  }

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)
    try {
      const result = await createPaymentPlan({
        eventId,
        totalValue,
        numberOfInstallments: data.numberOfInstallments,
        startDate: parseLocalDate(data.startDate),
        depositAmount: data.depositAmount,
        depositDueDate: parseLocalDate(data.depositDueDate),
        paymentMethod: data.paymentMethod || undefined,
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Parcelamento</DialogTitle>
          <DialogDescription>
            Valor total do evento: {formatCurrency(totalValue)}
          </DialogDescription>
        </DialogHeader>

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
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Valor restante: {formatCurrency(remaining)}</span>
              <span>Valor por parcela: {formatCurrency(installmentAmount)}</span>
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

          {/* Preview Toggle */}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Ocultar Preview' : 'Visualizar Parcelas'}
            </Button>
          </div>

          {showPreview && previewItems.length > 0 && (
            <div className="rounded-lg border border-border bg-secondary/10 p-3 max-h-48 overflow-y-auto">
              <div className="space-y-1.5">
                {previewItems.map((item) => (
                  <div
                    key={item.number}
                    className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium w-6 text-center">{item.number}</span>
                      {item.isSinal && (
                        <Badge variant="info" className="text-[10px] px-1.5 py-0">
                          Sinal
                        </Badge>
                      )}
                      <span className="text-muted-foreground">
                        {format(parseLocalDate(item.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Parcelamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
