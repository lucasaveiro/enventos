'use client'

import { DollarSign, AlertTriangle, CalendarDays, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

interface FinancialSummaryCardProps {
  totalValue: number
  deposit: number
  installments: {
    id: number
    status: string
    amount: number
    paidAmount: number | null
    dueDate: Date | string
    isSinal: boolean
  }[]
  paymentStatus: string
}

export function FinancialSummaryCard({
  totalValue,
  deposit,
  installments,
  paymentStatus,
}: FinancialSummaryCardProps) {
  const paidInstallments = installments.filter((i) => i.status === 'paid')
  const overdueInstallments = installments.filter((i) => i.status === 'overdue')
  const pendingInstallments = installments.filter((i) => i.status === 'pending')

  const totalPaid = paidInstallments.reduce(
    (sum, i) => sum + (i.paidAmount ?? i.amount),
    0
  )

  // If no installments, use deposit as paid basis
  const effectivePaid = installments.length > 0 ? totalPaid : deposit
  const remaining = Math.max(totalValue - effectivePaid, 0)
  const progressPercent = totalValue > 0 ? Math.min((effectivePaid / totalValue) * 100, 100) : 0

  // Find next due installment
  const now = new Date()
  const nextDue = [...pendingInstallments, ...overdueInstallments]
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .at(0)

  const statusLabel: Record<string, string> = {
    paid: 'Pago',
    partial: 'Parcial',
    unpaid: 'Pendente',
  }

  const statusVariant: Record<string, 'success' | 'warning' | 'destructive'> = {
    paid: 'success',
    partial: 'warning',
    unpaid: 'destructive',
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Resumo Financeiro</CardTitle>
          </div>
          <Badge variant={statusVariant[paymentStatus] ?? 'warning'}>
            {statusLabel[paymentStatus] ?? paymentStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="text-xs text-muted-foreground">Valor Total</div>
            <div className="font-semibold text-foreground text-lg">{formatCurrency(totalValue)}</div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="text-xs text-muted-foreground">Total Pago</div>
            <div className="font-semibold text-green-600 text-lg">{formatCurrency(effectivePaid)}</div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="text-xs text-muted-foreground">Saldo Restante</div>
            <div className="font-semibold text-foreground text-lg">{formatCurrency(remaining)}</div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="text-xs text-muted-foreground">Parcelas</div>
            <div className="font-semibold text-foreground">
              {paidInstallments.length}/{installments.length}
              {overdueInstallments.length > 0 && (
                <span className="text-destructive ml-1">
                  ({overdueInstallments.length} vencida{overdueInstallments.length > 1 ? 's' : ''})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso de pagamento</span>
            <span>{progressPercent.toFixed(0)}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-secondary/50 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                background:
                  progressPercent >= 100
                    ? 'var(--success)'
                    : progressPercent > 0
                      ? 'var(--warning)'
                      : 'var(--destructive)',
              }}
            />
          </div>
        </div>

        {/* Alerts & Next Due */}
        <div className="flex flex-wrap gap-3">
          {overdueInstallments.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>
                {overdueInstallments.length} parcela{overdueInstallments.length > 1 ? 's' : ''} vencida{overdueInstallments.length > 1 ? 's' : ''} -{' '}
                {formatCurrency(overdueInstallments.reduce((s, i) => s + i.amount, 0))}
              </span>
            </div>
          )}
          {nextDue && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/20 px-3 py-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>
                Proximo vencimento:{' '}
                {format(new Date(nextDue.dueDate), 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                {formatCurrency(nextDue.amount)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
