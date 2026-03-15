'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartao de Credito',
  debit_card: 'Cartao de Debito',
  bank_transfer: 'Transferencia',
  cash: 'Dinheiro',
  boleto: 'Boleto',
}

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  paid: { label: 'Pago', variant: 'success' },
  pending: { label: 'Pendente', variant: 'warning' },
  overdue: { label: 'Vencido', variant: 'destructive' },
}

export interface Installment {
  id: number
  installmentNumber: number
  dueDate: Date | string
  amount: number
  paidAmount: number | null
  status: string
  paymentMethod: string | null
  isSinal: boolean
  paidAt: Date | string | null
  notes: string | null
}

interface InstallmentTableProps {
  installments: Installment[]
  onMarkPaid: (installment: Installment) => void
  onEdit: (installment: Installment) => void
  onDelete: (installment: Installment) => void
}

export function InstallmentTable({
  installments,
  onMarkPaid,
  onEdit,
  onDelete,
}: InstallmentTableProps) {
  if (installments.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Nenhuma parcela configurada
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">#</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead className="hidden sm:table-cell">Metodo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Acoes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {installments.map((inst) => {
          const config = statusConfig[inst.status] ?? statusConfig.pending
          const isPaid = inst.status === 'paid'
          return (
            <TableRow key={inst.id} className={isPaid ? 'opacity-70' : ''}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-1.5">
                  <span>{inst.installmentNumber}</span>
                  {inst.isSinal && (
                    <Badge variant="info" className="text-[10px] px-1.5 py-0">
                      Sinal
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {format(new Date(inst.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
              </TableCell>
              <TableCell className="font-medium whitespace-nowrap">
                {formatCurrency(isPaid && inst.paidAmount ? inst.paidAmount : inst.amount)}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                {inst.paymentMethod
                  ? paymentMethodLabels[inst.paymentMethod] ?? inst.paymentMethod
                  : '-'}
              </TableCell>
              <TableCell>
                <Badge variant={config.variant}>{config.label}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {!isPaid && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                      title="Marcar como pago"
                      onClick={() => onMarkPaid(inst)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {!isPaid && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Editar"
                      onClick={() => onEdit(inst)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {!isPaid && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      title="Excluir"
                      onClick={() => onDelete(inst)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {isPaid && inst.paidAt && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(inst.paidAt), 'dd/MM', { locale: ptBR })}
                    </span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
