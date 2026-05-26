'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
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
import { Textarea } from '@/components/ui/Textarea'
import { updateInstallment } from '@/app/actions/installments'
import { parseLocalDate, toDateInputValue } from '@/lib/utils'

const paymentMethods = [
  { value: '', label: 'Selecione...' },
  { value: 'pix', label: 'PIX' },
  { value: 'credit_card', label: 'Cartao de Credito' },
  { value: 'debit_card', label: 'Cartao de Debito' },
  { value: 'bank_transfer', label: 'Transferencia Bancaria' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'boleto', label: 'Boleto' },
]

interface EditInstallmentModalProps {
  isOpen: boolean
  onClose: () => void
  installment: {
    id: number
    installmentNumber: number
    dueDate: Date | string
    amount: number
    paidAmount: number | null
    paidAt: Date | string | null
    status: string
    paymentMethod: string | null
    notes: string | null
    isSinal: boolean
  } | null
  onSuccess: () => void
}

export function EditInstallmentModal({
  isOpen,
  onClose,
  installment,
  onSuccess,
}: EditInstallmentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [amount, setAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [paidAmount, setPaidAmount] = useState(0)
  const [paidAt, setPaidAt] = useState('')

  const isPaid = installment?.status === 'paid'

  useEffect(() => {
    if (installment && isOpen) {
      setDueDate(toDateInputValue(installment.dueDate))
      setAmount(installment.amount)
      setPaymentMethod(installment.paymentMethod ?? '')
      setNotes(installment.notes ?? '')
      setPaidAmount(installment.paidAmount ?? installment.amount)
      setPaidAt(
        installment.paidAt
          ? toDateInputValue(installment.paidAt)
          : toDateInputValue(new Date()),
      )
    }
  }, [installment, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!installment) return

    setIsSubmitting(true)
    try {
      const payload: Parameters<typeof updateInstallment>[1] = {
        dueDate: parseLocalDate(dueDate),
        amount,
        paymentMethod: paymentMethod || undefined,
        notes: notes || undefined,
      }
      if (isPaid) {
        payload.paidAmount = paidAmount
        payload.paidAt = paidAt ? parseLocalDate(paidAt) : undefined
      }

      const result = await updateInstallment(installment.id, payload)

      if (result.success) {
        onSuccess()
        onClose()
      } else {
        alert(result.error || 'Erro ao atualizar parcela')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!installment) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Parcela {installment.installmentNumber}</DialogTitle>
          <DialogDescription>
            {installment.isSinal ? 'Sinal / Entrada' : `Parcela ${installment.installmentNumber}`}
          </DialogDescription>
        </DialogHeader>

        {isPaid && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              Esta parcela ja foi paga. Alterar o valor pago ou a data de pagamento
              atualizara tambem a transacao vinculada no resumo financeiro.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Data de Vencimento</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Valor da Parcela (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
              />
            </div>
          </div>

          {isPaid && (
            <div className="grid gap-3 sm:grid-cols-2 rounded-lg border border-border bg-secondary/20 p-3">
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
                <Label>Data do Pagamento</Label>
                <Input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                />
              </div>
            </div>
          )}

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
            <Label>Observacoes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observacoes sobre esta parcela..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
