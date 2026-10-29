'use client'

import { useMemo, useState } from 'react'
import { addMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DollarSign, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Checkbox } from '@/components/ui/Checkbox'
import { PAYMENT_METHODS, paymentMethodLabel } from '@/lib/paymentMethods'
import {
  ENTRADA_MIN_PERCENT,
  entradaPorPercentual,
  mensagemDiferencaPlano,
  parsePercent,
  percentualAproximado,
  validarPercentualEntrada,
  validarValorEntrada,
} from '@/lib/paymentRules'

export type PaymentType = 'parcelado' | 'a_vista'

export interface PaymentData {
  // Parcelado: entrada de no mínimo 20% do total, digitada em % (depositPercent)
  // ou em R$ (depositAmount) — um recalcula o outro — e saldo nas parcelas.
  // À vista: a "entrada" é o valor total, sem parcelas.
  paymentType: PaymentType
  totalValue: string
  depositPercent: string
  depositAmount: string
  depositDueDate: string
  depositPaid: boolean
  depositPaidAt: string
  depositPaymentMethod: string
  numberOfInstallments: string
  firstInstallmentDate: string
  // Vencimentos editados à mão, por índice da parcela (yyyy-MM-dd). Posição
  // vazia segue o padrão mensal a partir da 1ª parcela; a 1ª é
  // firstInstallmentDate.
  installmentDates: string[]
  // Valores editados à mão, por índice da parcela (R$). Posição vazia divide
  // por igual o que sobra do saldo depois das editadas.
  installmentAmounts: string[]
  paymentMethod: string
  cautionValue: string
}

interface Props {
  data: PaymentData
  onChange: (data: PaymentData) => void
  errors: Record<string, string>
}

const selectClass = "flex h-11 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] px-4 py-2 text-sm shadow-sm transition-all duration-200 focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export interface ScheduledInstallment {
  number: number
  date: string // yyyy-MM-dd
  amount: number
  edited: boolean // data editada
  amountEdited: boolean
}

/**
 * Parcelas do saldo: vencimentos mensais a partir da 1ª parcela e valores
 * divididos por igual (centavos na última), salvo os editados à mão — as
 * parcelas não editadas dividem o que sobra do saldo depois das editadas.
 * Usado no passo de pagamento, na revisão, na prévia do contrato e no envio.
 */
export function buildInstallmentSchedule(data: PaymentData): ScheduledInstallment[] {
  const total = parseFloat((data.totalValue || '0').replace(',', '.')) || 0
  const deposit = parseFloat((data.depositAmount || '0').replace(',', '.')) || 0
  const remaining = Math.max(0, total - deposit)
  const n = parseInt(data.numberOfInstallments || '1') || 1
  if (data.paymentType === 'a_vista' || remaining <= 0 || n <= 0 || !data.firstInstallmentDate) return []

  const amountOverrides = Array.from({ length: n }, (_, i) => {
    const v = parseFloat((data.installmentAmounts?.[i] ?? '').replace(',', '.'))
    return Number.isFinite(v) && v >= 0 ? v : null
  })
  const freeIndexes = amountOverrides.flatMap((v, i) => (v === null ? [i] : []))
  const fixedSum = amountOverrides.reduce<number>((s, v) => s + (v ?? 0), 0)
  const freeTotal = Math.max(0, Math.round((remaining - fixedSum) * 100) / 100)
  const freeAmount = freeIndexes.length > 0 ? Math.floor((freeTotal / freeIndexes.length) * 100) / 100 : 0
  const lastFree = freeIndexes[freeIndexes.length - 1]
  const first = new Date(data.firstInstallmentDate + 'T12:00:00')

  return Array.from({ length: n }, (_, i) => {
    const dateOverride = i > 0 ? data.installmentDates?.[i] : undefined
    const amountOverride = amountOverrides[i]
    const amount =
      amountOverride !== null
        ? amountOverride
        : i === lastFree
          ? Math.round((freeTotal - freeAmount * (freeIndexes.length - 1)) * 100) / 100
          : freeAmount
    return {
      number: i + 1,
      date: dateOverride || format(addMonths(first, i), 'yyyy-MM-dd'),
      amount,
      edited: Boolean(dateOverride),
      amountEdited: amountOverride !== null,
    }
  })
}

/** Aviso de entrada + parcelas fora do valor do contrato (falta / passou). */
export function paymentPlanDifference(data: PaymentData): string | null {
  if (data.paymentType === 'a_vista') return null
  const total = parseFloat((data.totalValue || '0').replace(',', '.')) || 0
  const deposit = parseFloat((data.depositAmount || '0').replace(',', '.')) || 0
  const schedule = buildInstallmentSchedule(data)
  if (!(total > 0) || schedule.length === 0) return null
  return mensagemDiferencaPlano(total, deposit + schedule.reduce((s, inst) => s + inst.amount, 0))
}

// Entrada a partir do percentual (ou o total, à vista). Percentual fora da
// regra também gera o valor; o erro aparece no campo e segura o avanço.
function depositFor(data: PaymentData): string {
  const total = parseFloat((data.totalValue || '').replace(',', '.'))
  if (isNaN(total) || total <= 0) return ''
  if (data.paymentType === 'a_vista') return total.toFixed(2)
  const percent = parsePercent(data.depositPercent)
  if (!Number.isFinite(percent)) return ''
  return entradaPorPercentual(total, percent).toFixed(2)
}

const PAYMENT_TYPES: { value: PaymentType; label: string; description: string }[] = [
  { value: 'parcelado', label: 'Parcelado', description: `Entrada a partir de ${ENTRADA_MIN_PERCENT}% e saldo em parcelas` },
  { value: 'a_vista', label: 'À vista', description: 'Valor total em um único pagamento' },
]

export function PaymentStep({ data, onChange, errors }: Props) {
  // Sinal herda a forma de pagamento geral do contrato; o select próprio só
  // aparece quando o usuário pede uma forma diferente.
  const [customDepositMethod, setCustomDepositMethod] = useState(false)
  const showDepositMethodSelect = customDepositMethod || Boolean(data.depositPaymentMethod)

  const update = (field: keyof PaymentData, value: any) => {
    const next = { ...data, [field]: value }
    // Entrada: quem o usuário edita manda. Mexeu no %, o valor sai dele; mexeu
    // no valor, o % sai do valor. Total e tipo recalculam o valor pelo %.
    if (field === 'totalValue' || field === 'paymentType' || field === 'depositPercent') {
      next.depositAmount = depositFor(next)
    }
    if (field === 'depositAmount') {
      const total = parseFloat((next.totalValue || '').replace(',', '.'))
      const p = percentualAproximado(total, parseFloat(String(value).replace(',', '.')))
      next.depositPercent = Number.isFinite(p) ? String(p) : ''
    }
    onChange(next)
  }

  const isAVista = data.paymentType === 'a_vista'
  const percentError = isAVista ? null : validarPercentualEntrada(parsePercent(data.depositPercent))
  const totalValue = parseFloat((data.totalValue || '0').replace(',', '.')) || 0
  const amountError =
    isAVista || !(totalValue > 0) || percentError
      ? null
      : validarValorEntrada(totalValue, parseFloat((data.depositAmount || '').replace(',', '.')))
  const depositAmount = parseFloat((data.depositAmount || '0').replace(',', '.')) || 0
  const remainingValue = Math.max(0, totalValue - depositAmount)
  const numberOfInstallments = parseInt(data.numberOfInstallments || '1') || 1

  const installmentPreview = useMemo(() => buildInstallmentSchedule(data), [data])
  const hasEditedDates = installmentPreview.some((inst) => inst.edited)
  const hasEditedAmounts = installmentPreview.some((inst) => inst.amountEdited)
  const diferenca = paymentPlanDifference(data)

  const setInstallmentAmount = (index: number, value: string) => {
    const amounts = [...(data.installmentAmounts ?? [])]
    amounts[index] = value
    update('installmentAmounts', amounts)
  }

  // A 1ª parcela é a própria "Data da 1ª Parcela"; as demais guardam a data
  // editada no índice delas.
  const setInstallmentDate = (index: number, value: string) => {
    if (index === 0) {
      update('firstInstallmentDate', value)
      return
    }
    const dates = [...(data.installmentDates ?? [])]
    dates[index] = value
    update('installmentDates', dates)
  }

  return (
    <div className="space-y-6">
      {/* Values Section */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--secondary)]">
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
            Valores do Contrato
          </h3>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PAYMENT_TYPES.map((pt) => (
              <button
                key={pt.value}
                type="button"
                onClick={() => update('paymentType', pt.value)}
                className={`text-left p-3 rounded-lg border-2 transition-all ${
                  data.paymentType === pt.value
                    ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                    : 'border-[var(--border)] hover:border-[var(--muted-foreground)]/30'
                }`}
              >
                <p className="text-sm font-medium text-[var(--foreground)]">{pt.label}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{pt.description}</p>
              </button>
            ))}
          </div>

          <div className={`grid grid-cols-1 gap-4 ${isAVista ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Valor Total (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={data.totalValue}
                onChange={(e) => update('totalValue', e.target.value)}
                placeholder="0,00"
              />
              {errors.totalValue && <p className="text-xs text-red-500 mt-1">{errors.totalValue}</p>}
            </div>
            {!isAVista && (
              <div>
                <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Entrada (%) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={ENTRADA_MIN_PERCENT}
                  max="99.99"
                  value={data.depositPercent}
                  onChange={(e) => update('depositPercent', e.target.value)}
                  placeholder={String(ENTRADA_MIN_PERCENT)}
                />
                {percentError ? (
                  <p className="text-xs text-red-500 mt-1">{percentError}</p>
                ) : (
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">Mínimo {ENTRADA_MIN_PERCENT}%</p>
                )}
              </div>
            )}
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">
                {isAVista ? 'Valor à Vista' : 'Valor da Entrada'}
              </Label>
              {isAVista ? (
                <div className="flex h-11 items-center px-4 rounded-lg border border-[var(--input-border)] bg-[var(--secondary)] text-sm font-medium">
                  {formatCurrency(depositAmount)}
                </div>
              ) : (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={data.depositAmount}
                  onChange={(e) => update('depositAmount', e.target.value)}
                  placeholder="0,00"
                />
              )}
              {amountError ? (
                <p className="text-xs text-red-500 mt-1">{amountError}</p>
              ) : (
                errors.depositAmount && <p className="text-xs text-red-500 mt-1">{errors.depositAmount}</p>
              )}
            </div>
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Valor Restante</Label>
              <div className="flex h-11 items-center px-4 rounded-lg border border-[var(--input-border)] bg-[var(--secondary)] text-sm font-medium">
                {formatCurrency(remainingValue)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">
                {isAVista ? 'Data do Pagamento *' : 'Vencimento da Entrada *'}
              </Label>
              <Input
                type="date"
                value={data.depositDueDate}
                onChange={(e) => update('depositDueDate', e.target.value)}
              />
              {errors.depositDueDate && <p className="text-xs text-red-500 mt-1">{errors.depositDueDate}</p>}
            </div>
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Valor da Caução (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.cautionValue}
                onChange={(e) => update('cautionValue', e.target.value)}
                placeholder="0,00"
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Garantia contra avarias: paga via Pix até 48h antes da entrada e devolvida após a vistoria de saída.
                Aplica-se à Estância; no Rancho Aveiro a caução é fixa de R$ 2.500, já prevista em cláusula.
              </p>
            </div>
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Forma de Pagamento *</Label>
              <select
                className={selectClass}
                value={data.paymentMethod}
                onChange={(e) => update('paymentMethod', e.target.value)}
              >
                <option value="">Selecione...</option>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
              {errors.paymentMethod && <p className="text-xs text-red-500 mt-1">{errors.paymentMethod}</p>}
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Vale para o sinal e todas as parcelas. Você poderá ajustar no contrato ou por parcela, se precisar.
              </p>
            </div>
          </div>

          {/* Deposit paid checkbox */}
          <div className="rounded-lg border border-[var(--border)] p-4 space-y-3">
            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <Checkbox
                checked={data.depositPaid}
                onCheckedChange={(checked) => update('depositPaid', Boolean(checked))}
              />
              <div>
                <span className="font-medium text-[var(--foreground)]">
                  {isAVista ? 'Pagamento já foi feito' : 'Entrada já foi paga'}
                </span>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {isAVista
                    ? 'Marque se o cliente já realizou o pagamento'
                    : 'Marque se o cliente já realizou o pagamento da entrada'}
                </p>
              </div>
            </label>

            {data.depositPaid && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border)]">
                <div>
                  <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Data do Pagamento</Label>
                  <Input
                    type="date"
                    value={data.depositPaidAt}
                    onChange={(e) => update('depositPaidAt', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Método de Pagamento</Label>
                  {showDepositMethodSelect ? (
                    <div className="space-y-1">
                      <select
                        className={selectClass}
                        value={data.depositPaymentMethod}
                        onChange={(e) => update('depositPaymentMethod', e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method.value} value={method.value}>{method.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="text-xs text-[var(--primary)] hover:underline"
                        onClick={() => {
                          setCustomDepositMethod(false)
                          update('depositPaymentMethod', '')
                        }}
                      >
                        Usar a mesma forma do contrato
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-11 items-center justify-between gap-3 px-4 rounded-lg border border-[var(--input-border)] bg-[var(--secondary)] text-sm">
                      <span className="text-[var(--muted-foreground)] truncate">
                        {data.paymentMethod
                          ? `Mesma do contrato (${paymentMethodLabel(data.paymentMethod)})`
                          : 'Mesma do contrato'}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-[var(--primary)] hover:underline shrink-0"
                        onClick={() => setCustomDepositMethod(true)}
                      >
                        Usar outra
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Installments Section */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--secondary)]">
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
            {isAVista ? 'Pagamento' : 'Parcelamento'}
          </h3>
        </div>

        <div className="p-5 space-y-4">
          {!isAVista && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Nº de Parcelas *</Label>
                <Input
                  type="number"
                  min="1"
                  max="48"
                  value={data.numberOfInstallments}
                  onChange={(e) => update('numberOfInstallments', e.target.value)}
                />
                {errors.numberOfInstallments && <p className="text-xs text-red-500 mt-1">{errors.numberOfInstallments}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Data da 1ª Parcela *</Label>
                <Input
                  type="date"
                  value={data.firstInstallmentDate}
                  onChange={(e) => update('firstInstallmentDate', e.target.value)}
                />
                {errors.firstInstallmentDate && <p className="text-xs text-red-500 mt-1">{errors.firstInstallmentDate}</p>}
              </div>
            </div>
          )}

          {/* Preview */}
          {(depositAmount > 0 || installmentPreview.length > 0) && (
            <div className="mt-4 rounded-lg border border-[var(--border)] overflow-hidden">
              <div className="px-4 py-2.5 bg-[var(--secondary)] border-b border-[var(--border)] flex items-center justify-between gap-3">
                <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase">
                  Plano de Pagamento
                </h4>
                <div className="flex items-center gap-3">
                  {hasEditedAmounts && (
                    <button
                      type="button"
                      className="text-xs text-[var(--primary)] hover:underline"
                      onClick={() => update('installmentAmounts', [])}
                    >
                      Dividir valores por igual
                    </button>
                  )}
                  {hasEditedDates && (
                    <button
                      type="button"
                      className="text-xs text-[var(--primary)] hover:underline"
                      onClick={() => update('installmentDates', [])}
                    >
                      Voltar às datas mensais
                    </button>
                  )}
                </div>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {/* Deposit row */}
                {depositAmount > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 shrink-0">
                      <DollarSign className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {isAVista ? 'Pagamento à vista' : `Sinal (Entrada ${data.depositPercent}%)`}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {data.depositDueDate
                          ? format(new Date(data.depositDueDate + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                          : 'Data não definida'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--foreground)]">{formatCurrency(depositAmount)}</p>
                      {data.depositPaid ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3 w-3" /> Pago
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                          <Clock className="h-3 w-3" /> Pendente
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Installment rows */}
                {installmentPreview.map((inst) => (
                  <div key={inst.number} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 shrink-0">
                      <span className="text-xs font-bold text-blue-600">{inst.number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        Parcela {inst.number}/{numberOfInstallments}
                      </p>
                      <Input
                        type="date"
                        value={inst.date}
                        onChange={(e) => setInstallmentDate(inst.number - 1, e.target.value)}
                        className="mt-1 h-8 w-44 text-xs"
                        aria-label={`Vencimento da parcela ${inst.number}`}
                      />
                      {errors[`installmentDate${inst.number - 1}`] && (
                        <p className="text-xs text-red-500 mt-1">{errors[`installmentDate${inst.number - 1}`]}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={data.installmentAmounts?.[inst.number - 1] ?? inst.amount.toFixed(2)}
                        onChange={(e) => setInstallmentAmount(inst.number - 1, e.target.value)}
                        className="h-8 w-32 text-right text-sm font-semibold"
                        aria-label={`Valor da parcela ${inst.number}`}
                      />
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                        <Clock className="h-3 w-3" /> {inst.amountEdited ? 'Valor editado' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary footer */}
              <div className="px-4 py-3 bg-[var(--secondary)] border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">Total</span>
                <span className="text-sm font-bold text-[var(--foreground)]">{formatCurrency(totalValue)}</span>
              </div>
            </div>
          )}

          {diferenca && (
            <div className="flex items-start gap-2 text-sm text-amber-700 mt-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {diferenca}
            </div>
          )}

          {depositAmount > totalValue && (
            <div className="flex items-center gap-2 text-sm text-red-500 mt-2">
              <AlertCircle className="h-4 w-4" />
              Valor da entrada não pode ser maior que o valor total.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
