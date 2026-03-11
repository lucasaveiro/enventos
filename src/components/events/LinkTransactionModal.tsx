'use client'

import { useEffect, useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, Link2, Loader2, DollarSign } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getUnlinkedTransactions, updateTransaction } from '@/app/actions/transactions'

const categoryLabels: Record<string, string> = {
  event_payment: 'Pagamento de Evento',
  deposit: 'Sinal/Deposito',
  rental: 'Aluguel',
  rental_installment: 'Parcela de Aluguel',
  other_income: 'Outras Receitas',
  service_cost: 'Custo de Servico',
  maintenance: 'Manutencao',
  supplies: 'Suprimentos',
  utilities: 'Utilidades',
  professional_payment: 'Pagamento Profissional',
  cleaning: 'Limpeza',
  other_expense: 'Outras Despesas',
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

interface LinkTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: number
  onSuccess: () => void
}

export function LinkTransactionModal({
  isOpen,
  onClose,
  eventId,
  onSuccess,
}: LinkTransactionModalProps) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [linkingId, setLinkingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      return
    }

    setIsLoading(true)
    getUnlinkedTransactions().then((res) => {
      if (res.success && res.data) {
        setTransactions(res.data)
      }
      setIsLoading(false)
    })
  }, [isOpen])

  const filtered = useMemo(() => {
    if (!search.trim()) return transactions
    const q = search.toLowerCase()
    return transactions.filter(
      (tx) =>
        tx.description.toLowerCase().includes(q) ||
        (categoryLabels[tx.category] || tx.category).toLowerCase().includes(q) ||
        formatCurrency(tx.amount).includes(q),
    )
  }, [transactions, search])

  const handleLink = async (txId: number) => {
    setLinkingId(txId)
    try {
      const res = await updateTransaction(txId, { eventId })
      if (res.success) {
        onSuccess()
        onClose()
      }
    } catch (error) {
      console.error('Error linking transaction:', error)
    } finally {
      setLinkingId(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] overflow-hidden p-0 gap-0 sm:w-full sm:max-w-lg">
        <DialogHeader className="px-4 pt-5 pb-4 pr-12 border-b border-border sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Vincular Transacao Existente
          </DialogTitle>
          <DialogDescription>
            Selecione uma transacao para vincular a este evento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="px-4 py-3 border-b border-border sm:px-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por descricao, categoria ou valor..."
                className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
              />
            </div>
            {!isLoading && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {filtered.length} transac{filtered.length !== 1 ? 'oes' : 'ao'} disponive{filtered.length !== 1 ? 'is' : 'l'}
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-80">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Carregando transacoes...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <DollarSign className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">
                  {transactions.length === 0
                    ? 'Nenhuma transacao sem evento disponivel'
                    : 'Nenhuma transacao encontrada para essa busca'}
                </p>
              </div>
            ) : (
              <div className="py-1">
                {filtered.map((tx) => (
                  <button
                    key={tx.id}
                    type="button"
                    disabled={linkingId !== null}
                    onClick={() => handleLink(tx.id)}
                    className="w-full text-left px-4 py-3 transition-colors hover:bg-muted border-b border-border/50 last:border-b-0 disabled:opacity-50 sm:px-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-foreground truncate">
                            {tx.description}
                          </span>
                          {linkingId === tx.id && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={tx.type === 'income' ? 'success' : 'destructive'} className="text-xs">
                            {tx.type === 'income' ? 'Receita' : 'Despesa'}
                          </Badge>
                          <Badge variant={tx.status === 'paid' ? 'success' : 'warning'} className="text-xs">
                            {tx.status === 'paid' ? 'Pago' : 'Pendente'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {categoryLabels[tx.category] || tx.category}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(tx.date), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      <span className="font-semibold text-sm text-foreground whitespace-nowrap">
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border bg-card/95 backdrop-blur px-4 py-3 sm:px-6">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
