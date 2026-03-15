'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    if (installment && isOpen) {
      setDueDate(new Date(installment.dueDate).toISOString().split('T')[0])
      setAmount(installment.amount)
      setPaymentMethod(installment.paymentMethod ?? '')
      setNotes(installment.notes ?? '')
    }
  }, [installment, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!installment) return

    setIsSubmitting(true)
    try {
      const result = await updateInstallment(installment.id, {
        dueDate: new Date(dueDate),
        amount,
        paymentMethod: paymentMethod || undefined,
        notes: notes || undefined,
      })

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
              <Label>Valor (R$)</Label>
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
