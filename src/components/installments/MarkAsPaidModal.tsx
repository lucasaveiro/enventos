'use client'

import { useState } from 'react'
import { format } from 'date-fns'
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
import { markInstallmentAsPaid } from '@/app/actions/installments'
import { parseLocalDate, toDateInputValue } from '@/lib/utils'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const paymentMethods = [
  { value: '', label: 'Selecione...' },
  { value: 'pix', label: 'PIX' },
  { value: 'credit_card', label: 'Cartao de Credito' },
  { value: 'debit_card', label: 'Cartao de Debito' },
  { value: 'bank_transfer', label: 'Transferencia Bancaria' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'boleto', label: 'Boleto' },
]

interface MarkAsPaidModalProps {
  isOpen: boolean
  onClose: () => void
  installment: {
    id: number
    installmentNumber: number
    amount: number
    dueDate: Date | string
    paymentMethod: string | null
    isSinal: boolean
  } | null
  onSuccess: () => void
}

export function MarkAsPaidModal({
  isOpen,
  onClose,
  installment,
  onSuccess,
}: MarkAsPaidModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paidAmount, setPaidAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paidAt, setPaidAt] = useState('')

  // Reset form when installment changes
  const resetForm = () => {
    if (installment) {
      setPaidAmount(installment.amount)
      setPaymentMethod(installment.paymentMethod ?? '')
      setPaidAt(toDateInputValue(new Date()))
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
      resetForm()
    } else {
      onClose()
    }
  }

  // Reset when modal opens
  if (isOpen && paidAmount === 0 && installment) {
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!installment) return

    setIsSubmitting(true)
    try {
      const result = await markInstallmentAsPaid(installment.id, {
        paidAmount,
        paymentMethod: paymentMethod || undefined,
        paidAt: paidAt ? parseLocalDate(paidAt) : undefined,
      })

      if (result.success) {
        onSuccess()
        onClose()
      } else {
        alert(result.error || 'Erro ao registrar pagamento')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!installment) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <DialogDescription>
            Parcela {installment.installmentNumber}
            {installment.isSinal ? ' (Sinal)' : ''} - Vencimento:{' '}
            {format(new Date(installment.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-border bg-secondary/20 p-3 text-center">
            <div className="text-xs text-muted-foreground">Valor da Parcela</div>
            <div className="text-xl font-bold text-foreground">
              {formatCurrency(installment.amount)}
            </div>
          </div>

          <div>
            <Label>Valor Pago (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={paidAmount}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
            />
          </div>

          <div>
            <Label>Metodo de Pagamento</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-input-bg px-3 py-2 text-sm"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              {paymentMethods.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Data do Pagamento</Label>
            <Input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="default" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando...' : 'Confirmar Pagamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
