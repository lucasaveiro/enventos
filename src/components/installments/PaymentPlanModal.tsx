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
import { PAYMENT_METHODS } from '@/lib/paymentMethods'
import {
  ENTRADA_MIN_PERCENT,
  entradaPorPercentual,
  parsePercent,
  percentualDaEntrada,
  validarPercentualEntrada,
  validarPlanoParcelado,
} from '@/lib/paymentRules'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const schema = z.object({
  depositDueDate: z.string().min(1, 'Data do sinal obrigatoria'),
  numberOfInstallments: z.number().int().min(1, 'Minimo 1 parcela').max(48, 'Maximo 48 parcelas'),
  startDate: z.string().min(1, 'Data da primeira parcela obrigatoria'),
  paymentMethod: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// Parcelado: sinal de no minimo 20% do total (percentual digitado) e saldo nas parcelas.
// A vista: um unico pagamento do valor total, na data do sinal.
type PlanMode = 'parcelado' | 'a_vista'

const PLAN_MODES: { value: PlanMode; label: string; description: string }[] = [
  { value: 'parcelado', label: 'Parcelado', description: `Entrada a partir de ${ENTRADA_MIN_PERCENT}% e saldo em parcelas` },
  { value: 'a_vista', label: 'A vista', description: 'Valor total em um unico pagamento' },
]

interface PreviewItem {
  id: string
  date: string
  amount: number
  isSinal: boolean
}

const paymentMethods = [{ value: '', label: 'Selecione...' }, ...PAYMENT_METHODS]

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
  const [mode, setMode] = useState<PlanMode>('parcelado')
  const [percentInput, setPercentInput] = useState(String(ENTRADA_MIN_PERCENT))
  const isAVista = mode === 'a_vista'
  // O valor da entrada sai do percentual digitado (minimo 20%); a vista e o total.
  // Percentual invalido fica sinalizado e segura o envio; o preview usa o minimo.
  const percent = parsePercent(percentInput)
  const percentError = isAVista ? null : validarPercentualEntrada(percent)
  const entrada = isAVista
    ? totalValue
    : entradaPorPercentual(totalValue, percentError ? ENTRADA_MIN_PERCENT : percent)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      depositDueDate: toDateInputValue(new Date()),
      numberOfInstallments: 1,
      startDate: toDateInputValue(addMonths(new Date(), 1)),
      paymentMethod: '',
    },
  })

  const watchInstallments = watch('numberOfInstallments')
  const watchStartDate = watch('startDate')
  const watchDepositDate = watch('depositDueDate')

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        depositDueDate: toDateInputValue(new Date()),
        numberOfInstallments: 1,
        startDate: toDateInputValue(addMonths(new Date(), 1)),
        paymentMethod: '',
      })
      setManuallyEdited(false)
      setMode(totalValue > 0 && deposit >= totalValue ? 'a_vista' : 'parcelado')
      // Parte do percentual da entrada atual do evento, se ele for aceito.
      const atual = percentualDaEntrada(totalValue, deposit)
      setPercentInput(String(atual !== null && !validarPercentualEntrada(atual) ? atual : ENTRADA_MIN_PERCENT))
    }
  }, [isOpen, deposit, totalValue, reset])

  // Regenerate preview whenever inputs change AND no manual edits have happened
  useEffect(() => {
    if (manuallyEdited) return
    setItems(
      computePreview(
        entrada,
        watchDepositDate,
        isAVista ? 0 : watchInstallments || 0,
        watchStartDate,
        totalValue,
      ),
    )
  }, [
    entrada,
    isAVista,
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
        entrada,
        watchDepositDate,
        isAVista ? 0 : watchInstallments || 0,
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
    if (percentError) {
      alert(percentError)
      return
    }
    const planError = validarPlanoParcelado(totalValue, items)
    if (planError) {
      alert(planError)
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
        depositAmount: entrada,
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
          {/* Mode */}
          <div className="grid gap-2 sm:grid-cols-2">
            {PLAN_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => {
                  setMode(m.value)
                  setManuallyEdited(false)
                }}
                className={`text-left rounded-lg border-2 p-3 transition-all ${
                  mode === m.value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <p className="text-sm font-medium text-foreground">{m.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
              </button>
            ))}
          </div>

          {/* Deposit Section */}
          <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              {isAVista ? 'Pagamento a vista' : 'Sinal / Entrada'}
            </h3>
            <div className={`grid gap-3 ${isAVista ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
              {!isAVista && (
                <div>
                  <Label>Percentual (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={ENTRADA_MIN_PERCENT}
                    max="99.99"
                    value={percentInput}
                    onChange={(e) => {
                      setPercentInput(e.target.value)
                      setManuallyEdited(false)
                    }}
                  />
                  {percentError ? (
                    <p className="text-xs text-destructive mt-1">{percentError}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-1">Minimo {ENTRADA_MIN_PERCENT}%</p>
                  )}
                </div>
              )}
              <div>
                <Label>{isAVista ? 'Valor (R$)' : 'Valor do Sinal (R$)'}</Label>
                <div className="flex h-10 items-center rounded-md border border-input bg-secondary/40 px-3 text-sm font-medium">
                  {formatCurrency(entrada)}
                </div>
              </div>
              <div>
                <Label>{isAVista ? 'Data do Pagamento' : 'Data do Sinal'}</Label>
                <Input type="date" {...register('depositDueDate')} />
                {errors.depositDueDate && (
                  <p className="text-xs text-destructive mt-1">{errors.depositDueDate.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Installments Section */}
          {!isAVista && (
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
          )}

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
                {!isAVista && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={addInstallmentRow}
                  >
                    + Adicionar
                  </Button>
                )}
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
                      readOnly={item.isSinal}
                      title={item.isSinal ? 'Valor da entrada: altere pelo percentual acima' : undefined}
                      className={`h-8 text-xs${item.isSinal ? ' bg-secondary/40 cursor-default' : ''}`}
                    />
                    {item.isSinal ? (
                      <span />
                    ) : (
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
                    )}
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
                Dica: edite datas e valores das parcelas; a entrada sai do percentual (minimo {ENTRADA_MIN_PERCENT}%).
                Use &quot;Recalcular&quot; para voltar ao calculo automatico.
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
