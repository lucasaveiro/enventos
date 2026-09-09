'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle,
  ClipboardCheck,
  Copy,
  ExternalLink,
  Filter,
  MessageCircle,
  PartyPopper,
  Phone,
  RefreshCw,
  Users,
  Wallet,
} from 'lucide-react'
import { differenceInCalendarDays, format, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonVariants } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { FinanceTabs } from '@/components/financeiro/FinanceTabs'
import { EditInstallmentModal } from '@/components/installments/EditInstallmentModal'
import { MarkAsPaidModal } from '@/components/installments/MarkAsPaidModal'
import { checkOverdueInstallments, getOverdueItems } from '@/app/actions/installments'
import { updateTransactionStatus } from '@/app/actions/transactions'
import { whatsAppLink } from '@/lib/phone'
import { cn } from '@/lib/utils'

// ── Tela de cobrança ────────────────────────────────────────────────────────
// Destino do card "Em Atraso" do calendário financeiro. Ali o número é só um
// total; aqui cada parcela vencida aparece identificada (cliente, telefone,
// evento, espaço, dias de atraso) e agrupada por cliente, porque a cobrança
// acontece por pessoa — uma mensagem cobrindo tudo o que aquele cliente deve —
// e não por parcela solta.

type OverdueItem = {
  key: string
  kind: 'installment' | 'transaction'
  id: number
  direction: 'income' | 'expense'
  label: string
  installmentNumber: number
  isSinal: boolean
  amount: number
  paidAmount: number | null
  paidAt: Date | string | null
  status: string
  dueDate: Date | string
  paymentMethod: string | null
  notes: string | null
  eventId: number | null
  eventTitle: string | null
  eventStart: Date | string | null
  spaceId: number | null
  spaceName: string | null
  clientId: number | null
  clientName: string | null
  clientPhone: string | null
  clientEmail: string | null
}

type ClientGroup = {
  key: string
  clientName: string | null
  clientPhone: string | null
  items: OverdueItem[]
  total: number
  maxDays: number
}

type SortOption = 'oldest' | 'amount' | 'name'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const formatDate = (date: Date | string) =>
  format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })

const daysOverdue = (date: Date | string) =>
  Math.max(differenceInCalendarDays(startOfDay(new Date()), startOfDay(new Date(date))), 0)

const overdueLabel = (days: number) =>
  days === 0 ? 'vence hoje' : `${days} dia${days > 1 ? 's' : ''} em atraso`

/**
 * Mensagem de cobrança pronta para o WhatsApp, cobrindo todas as parcelas
 * vencidas do cliente. Fica no cliente (e não no servidor) porque o usuário
 * pode editá-la antes de enviar — o wa.me só preenche o campo de digitação.
 */
function buildChargeMessage(group: ClientGroup): string {
  const firstName = group.clientName?.trim().split(/\s+/)[0] ?? ''
  const greeting = firstName ? `Olá, ${firstName}! Tudo bem?` : 'Olá! Tudo bem?'
  const single = group.items.length === 1

  const lines = group.items.map((item) => {
    const where = item.eventTitle ? ` (${item.eventTitle})` : ''
    return `• ${item.label}${where} — venceu em ${formatDate(item.dueDate)} — ${formatCurrency(item.amount)}`
  })

  return [
    greeting,
    '',
    single
      ? 'Passando para lembrar do pagamento em aberto:'
      : 'Passando para lembrar dos pagamentos em aberto:',
    ...lines,
    ...(single ? [] : ['', `Total em aberto: ${formatCurrency(group.total)}`]),
    '',
    'Se o pagamento já tiver sido feito, é só me enviar o comprovante que dou baixa por aqui. Qualquer dúvida, estou à disposição!',
  ].join('\n')
}

export default function OverdueInstallmentsPage() {
  const [items, setItems] = useState<OverdueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [spaceFilter, setSpaceFilter] = useState('all')
  const [sortBy, setSortBy] = useState<SortOption>('oldest')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<OverdueItem | null>(null)
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    // Promove para "vencida" o que passou do vencimento desde o último acesso,
    // igual ao calendário — senão a lista nasce desatualizada.
    await checkOverdueInstallments()
    const res = await getOverdueItems()
    setItems(res.success && res.data ? (res.data as OverdueItem[]) : [])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const spaceOptions = useMemo(() => {
    const map = new Map<number, string>()
    for (const item of items) {
      if (item.spaceId != null && item.spaceName) map.set(item.spaceId, item.spaceName)
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
  }, [items])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter((item) => {
      if (spaceFilter !== 'all' && String(item.spaceId) !== spaceFilter) return false
      if (!term) return true
      return [item.clientName, item.eventTitle, item.spaceName, item.label]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(term))
    })
  }, [items, search, spaceFilter])

  const receivables = useMemo(
    () => filtered.filter((item) => item.direction === 'income'),
    [filtered],
  )
  const payables = useMemo(
    () => filtered.filter((item) => item.direction === 'expense'),
    [filtered],
  )

  const groups = useMemo(() => {
    const map = new Map<string, ClientGroup>()

    for (const item of receivables) {
      const key =
        item.clientId != null
          ? `client-${item.clientId}`
          : item.clientName
            ? `name-${item.clientName}`
            : 'sem-cliente'

      const group = map.get(key)
      if (group) {
        group.items.push(item)
        group.total += item.amount
        group.maxDays = Math.max(group.maxDays, daysOverdue(item.dueDate))
        // Um cliente pode ter eventos antigos sem telefone; guarda o primeiro
        // número disponível para não perder o botão de cobrança.
        group.clientPhone = group.clientPhone ?? item.clientPhone
      } else {
        map.set(key, {
          key,
          clientName: item.clientName,
          clientPhone: item.clientPhone,
          items: [item],
          total: item.amount,
          maxDays: daysOverdue(item.dueDate),
        })
      }
    }

    const list = [...map.values()]
    list.sort((a, b) => {
      if (sortBy === 'amount') return b.total - a.total
      if (sortBy === 'name')
        return (a.clientName ?? 'zzz').localeCompare(b.clientName ?? 'zzz', 'pt-BR')
      return b.maxDays - a.maxDays
    })
    return list
  }, [receivables, sortBy])

  const totals = useMemo(() => {
    const receivableTotal = receivables.reduce((sum, item) => sum + item.amount, 0)
    const payableTotal = payables.reduce((sum, item) => sum + item.amount, 0)
    const maxDays = receivables.reduce((max, item) => Math.max(max, daysOverdue(item.dueDate)), 0)
    return { receivableTotal, payableTotal, maxDays }
  }, [receivables, payables])

  const handleCopy = async (group: ClientGroup) => {
    try {
      await navigator.clipboard.writeText(buildChargeMessage(group))
      setCopiedKey(group.key)
      setTimeout(() => setCopiedKey((current) => (current === group.key ? null : current)), 2500)
    } catch {
      alert('Não foi possível copiar a mensagem. Selecione e copie manualmente.')
    }
  }

  const handleMarkPaid = (item: OverdueItem) => {
    if (item.kind === 'installment') {
      setSelectedItem(item)
      setIsMarkPaidOpen(true)
      return
    }
    void handleMarkTransactionPaid(item)
  }

  const handleMarkTransactionPaid = async (item: OverdueItem) => {
    if (!confirm(`Marcar "${item.label}" como pago?`)) return
    const res = await updateTransactionStatus(item.id, 'paid')
    if (!res.success) {
      alert(res.error || 'Erro ao marcar como pago')
      return
    }
    fetchData()
  }

  const renderItemRow = (item: OverdueItem) => {
    const days = daysOverdue(item.dueDate)
    return (
      <div
        key={item.key}
        className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-secondary/20 p-3"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{item.label}</span>
            {item.isSinal && (
              <Badge variant="info" className="px-1.5 py-0 text-[10px]">
                Sinal
              </Badge>
            )}
            <Badge variant={days > 7 ? 'destructive' : 'warning'}>{overdueLabel(days)}</Badge>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            Venceu em {formatDate(item.dueDate)}
            {item.eventTitle ? ` • ${item.eventTitle}` : ''}
            {item.spaceName ? ` • ${item.spaceName}` : ''}
          </p>
          {item.notes && (
            <p className="mt-1 truncate text-xs text-muted-foreground italic">{item.notes}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-base font-bold text-destructive">
            {formatCurrency(item.amount)}
          </span>
          <div className="flex flex-wrap justify-end gap-1.5">
            <Button size="sm" variant="success" className="gap-1" onClick={() => handleMarkPaid(item)}>
              <CheckCircle className="h-4 w-4" />
              Marcar pago
            </Button>
            {item.kind === 'installment' && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                title="Alterar vencimento, valor ou observações da parcela"
                onClick={() => {
                  setSelectedItem(item)
                  setIsEditOpen(true)
                }}
              >
                <CalendarClock className="h-4 w-4" />
                Renegociar
              </Button>
            )}
            {item.eventId != null && (
              <Link
                href={`/events/${item.eventId}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <ExternalLink className="h-4 w-4" />
                Ver evento
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <FinanceTabs />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Parcelas em Atraso</h1>
            <p className="text-sm text-muted-foreground">
              Cobre os clientes pelo WhatsApp, registre os pagamentos e renegocie vencimentos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            Atualizar
          </Button>
          <Link href="/financeiro/calendario" className={buttonVariants({ variant: 'ghost' })}>
            <ArrowLeft className="h-4 w-4" />
            Calendário
          </Link>
        </div>
      </div>

      {/* Resumo */}
      <div
        className={cn(
          'grid gap-3 sm:grid-cols-2',
          payables.length > 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
        )}
      >
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <Wallet className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">A receber em atraso</p>
              <p className="text-lg font-bold text-destructive">
                {formatCurrency(totals.receivableTotal)}
              </p>
              <p className="text-xs text-muted-foreground">{receivables.length} parcela(s)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Clientes a cobrar</p>
              <p className="text-lg font-bold text-foreground">{groups.length}</p>
              <p className="text-xs text-muted-foreground">agrupados por cliente</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <CalendarClock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Maior atraso</p>
              <p className="text-lg font-bold text-foreground">{totals.maxDays} dia(s)</p>
              <p className="text-xs text-muted-foreground">desde o vencimento</p>
            </div>
          </CardContent>
        </Card>
        {payables.length > 0 && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">A pagar vencido</p>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(totals.payableTotal)}
                </p>
                <p className="text-xs text-muted-foreground">{payables.length} lançamento(s)</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente, evento ou espaço..."
            className="h-9 min-w-56 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
          />
          {spaceOptions.length > 1 && (
            <select
              value={spaceFilter}
              onChange={(e) => setSpaceFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="all">Todos os espaços</option>
              {spaceOptions.map(([id, name]) => (
                <option key={id} value={String(id)}>
                  {name}
                </option>
              ))}
            </select>
          )}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="oldest">Maior atraso primeiro</option>
            <option value="amount">Maior valor primeiro</option>
            <option value="name">Cliente (A-Z)</option>
          </select>
        </CardContent>
      </Card>

      {/* Cobranças por cliente */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={items.length === 0 ? PartyPopper : Filter}
              title={
                items.length === 0
                  ? 'Nenhuma parcela em atraso'
                  : 'Nenhuma cobrança com esses filtros'
              }
              description={
                items.length === 0
                  ? 'Todas as parcelas estão em dia. Os próximos vencimentos aparecem no calendário financeiro.'
                  : 'Ajuste a busca ou o filtro de espaço para ver as parcelas em atraso.'
              }
              action={
                items.length === 0 ? (
                  <Link
                    href="/financeiro/calendario"
                    className={buttonVariants({ variant: 'outline' })}
                  >
                    Ver calendário financeiro
                  </Link>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const message = buildChargeMessage(group)
            const link = whatsAppLink(group.clientPhone, message)
            return (
              <Card key={group.key}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-foreground">
                        {group.clientName ?? 'Sem cliente vinculado'}
                      </h2>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {group.clientPhone || 'sem telefone cadastrado'}
                        </span>
                        <span aria-hidden="true">•</span>
                        <span>{group.items.length} parcela(s)</span>
                        <span aria-hidden="true">•</span>
                        <span>até {overdueLabel(group.maxDays)}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-bold text-destructive">
                        {formatCurrency(group.total)}
                      </span>
                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonVariants({ variant: 'success' })}
                        >
                          <MessageCircle className="h-4 w-4" />
                          Cobrar no WhatsApp
                        </a>
                      ) : (
                        <Button
                          variant="outline"
                          className="gap-2"
                          disabled
                          title="Cadastre o telefone do cliente para cobrar pelo WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Sem telefone
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="gap-2"
                        title="Copiar a mensagem de cobrança"
                        onClick={() => handleCopy(group)}
                      >
                        {copiedKey === group.key ? (
                          <>
                            <ClipboardCheck className="h-4 w-4" />
                            Copiada!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copiar mensagem
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">{group.items.map(renderItemRow)}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Contas a pagar vencidas — não são cobrança, mas vencem junto e entram
          no total "Em Atraso" do calendário; ficam aqui para não sumirem. */}
      {!isLoading && payables.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Contas a pagar vencidas</h2>
              <p className="text-xs text-muted-foreground">
                Despesas com data de pagamento vencida — entram no total do card &ldquo;Em
                Atraso&rdquo;, mas não são cobradas do cliente.
              </p>
            </div>
            <div className="space-y-2">{payables.map(renderItemRow)}</div>
          </CardContent>
        </Card>
      )}

      <MarkAsPaidModal
        isOpen={isMarkPaidOpen}
        onClose={() => {
          setIsMarkPaidOpen(false)
          setSelectedItem(null)
        }}
        installment={selectedItem}
        onSuccess={fetchData}
      />

      <EditInstallmentModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false)
          setSelectedItem(null)
        }}
        installment={selectedItem}
        onSuccess={fetchData}
      />
    </div>
  )
}
