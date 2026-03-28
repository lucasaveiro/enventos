'use client'

import { useMemo } from 'react'
import { addMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DollarSign, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Checkbox } from '@/components/ui/Checkbox'

const PAYMENT_METHODS = [
  'PIX',
  'Dinheiro',
  'Transferência bancária',
  'Cartão de crédito',
  'Cartão de débito',
  'Boleto bancário',
]

export interface PaymentData {
  totalValue: string
  depositAmount: string
  depositDueDate: string
  depositPaid: boolean
  depositPaidAt: string
  depositPaymentMethod: string
  numberOfInstallments: string
  firstInstallmentDate: string
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

export function PaymentStep({ data, onChange, errors }: Props) {
  const update = (field: keyof PaymentData, value: any) => {
    onChange({ ...data, [field]: value })
  }

  const totalValue = parseFloat((data.totalValue || '0').replace(',', '.')) || 0
  const depositAmount = parseFloat((data.depositAmount || '0').replace(',', '.')) || 0
  const remainingValue = Math.max(0, totalValue - depositAmount)
  const numberOfInstallments = parseInt(data.numberOfInstallments || '1') || 1

  const installmentPreview = useMemo(() => {
    if (remainingValue <= 0 || numberOfInstallments <= 0 || !data.firstInstallmentDate) return []

    const installmentAmount = Math.floor((remainingValue / numberOfInstallments) * 100) / 100
    const lastAmount = remainingValue - installmentAmount * (numberOfInstallments - 1)

    return Array.from({ length: numberOfInstallments }, (_, i) => {
      const dueDate = addMonths(new Date(data.firstInstallmentDate + 'T12:00:00'), i)
      const isLast = i === numberOfInstallments - 1
      return {
        number: i + 1,
        dueDate,
        amount: isLast ? Math.round(lastAmount * 100) / 100 : installmentAmount,
      }
    })
  }, [remainingValue, numberOfInstallments, data.firstInstallmentDate])

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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Valor da Entrada (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={data.depositAmount}
                onChange={(e) => update('depositAmount', e.target.value)}
                placeholder="0,00"
              />
              {errors.depositAmount && <p className="text-xs text-red-500 mt-1">{errors.depositAmount}</p>}
            </div>
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Valor Restante</Label>
              <div className="flex h-11 items-center px-4 rounded-lg border border-[var(--input-border)] bg-[var(--secondary)] text-sm font-medium">
                {formatCurrency(remainingValue)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Vencimento da Entrada *</Label>
              <Input
                type="date"
                value={data.depositDueDate}
                onChange={(e) => update('depositDueDate', e.target.value)}
              />
              {errors.depositDueDate && <p className="text-xs text-red-500 mt-1">{errors.depositDueDate}</p>}
            </div>
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Valor do Caução (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.cautionValue}
                onChange={(e) => update('cautionValue', e.target.value)}
                placeholder="0,00"
              />
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
                <span className="font-medium text-[var(--foreground)]">Entrada já foi paga</span>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Marque se o cliente já realizou o pagamento da entrada
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
                  <select
                    className={selectClass}
                    value={data.depositPaymentMethod}
                    onChange={(e) => update('depositPaymentMethod', e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
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
            Parcelamento
          </h3>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Forma de Pagamento *</Label>
              <select
                className={selectClass}
                value={data.paymentMethod}
                onChange={(e) => update('paymentMethod', e.target.value)}
              >
                <option value="">Selecione...</option>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
              {errors.paymentMethod && <p className="text-xs text-red-500 mt-1">{errors.paymentMethod}</p>}
            </div>
          </div>

          {/* Preview */}
          {(depositAmount > 0 || installmentPreview.length > 0) && (
            <div className="mt-4 rounded-lg border border-[var(--border)] overflow-hidden">
              <div className="px-4 py-2.5 bg-[var(--secondary)] border-b border-[var(--border)]">
                <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase">
                  Plano de Pagamento
                </h4>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {/* Deposit row */}
                {depositAmount > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 shrink-0">
                      <DollarSign className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)]">Sinal (Entrada)</p>
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
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {format(inst.dueDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--foreground)]">{formatCurrency(inst.amount)}</p>
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                        <Clock className="h-3 w-3" /> Pendente
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
