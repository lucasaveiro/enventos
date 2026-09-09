'use client'

// ── Financeiro ─────────────────────────────────────────────────────────────
// Na v1 o dinheiro mora em três rotas (/dashboard, /financial,
// /financeiro/calendario) e a tela de resumo abre com ONZE cartões de valor,
// todos com o mesmo peso visual. Aqui:
//   • três números respondem a tudo: entrou, falta entrar, está atrasado
//   • movimento e vencimentos são a mesma lista, com um seletor — porque são a
//     mesma coisa vista antes ou depois de hoje
//
// FASE A: os três números vêm das MESMAS actions da v1 (o summary de
// getFinancialLedger e getInstallmentsForCalendar status=overdue), então batem
// com o /financial e com o card "Em Atraso" da versão atual.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  Check,
  Clock3,
  Lock,
} from 'lucide-react'
import { endOfMonth, format, startOfMonth, startOfYear, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { loadFinanceTotals, loadLedger, loadMonthly, loadUpcoming } from '@/lib/v2/data'
import { brl, brlExact } from '@/lib/v2/format'
import type { V2Ledger, V2MonthPoint } from '@/lib/v2/types'
import { RevenueChart } from '@/components/v2/RevenueChart'
import { EventDrawer } from '@/components/v2/EventDrawer'
import { EmptyState, FilterChip, SectionHeader, Skeleton } from '@/components/v2/ui'
import { cn } from '@/lib/utils'

type Period = 'mes' | '3meses' | 'ano'
type Tab = 'movimento' | 'vencimentos'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'mes', label: 'Este mês' },
  { key: '3meses', label: 'Últimos 3 meses' },
  { key: 'ano', label: 'Este ano' },
]

function rangeOf(period: Period) {
  const now = new Date()
  switch (period) {
    case '3meses':
      return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) }
    case 'ano':
      return { start: startOfYear(now), end: endOfMonth(now) }
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) }
  }
}

function BigNumber({
  label,
  value,
  detail,
  tone,
  active,
  onClick,
  loading,
}: {
  label: string
  value: string
  detail: string
  tone: string
  active?: boolean
  onClick?: () => void
  loading?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn('flex-1 rounded-xl p-4 text-left transition-colors', onClick && 'hover:bg-[var(--v2-surface-2)]')}
      style={{ background: active ? 'var(--v2-surface-2)' : 'transparent' }}
    >
      <p className="text-[12.5px] font-medium" style={{ color: 'var(--v2-text-2)' }}>
        {label}
      </p>
      {loading ? (
        <Skeleton className="my-1.5 h-8 w-32" />
      ) : (
        <p className="v2-num mt-1" style={{ color: tone }}>
          {value}
        </p>
      )}
      <p className="mt-1 text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
        {detail}
      </p>
    </button>
  )
}

function LedgerRow({ entry, onOpenEvent }: { entry: V2Ledger; onOpenEvent: (id?: number | null) => void }) {
  const income = entry.kind === 'income'
  const late = entry.status === 'overdue'

  return (
    <button
      type="button"
      onClick={() => onOpenEvent(entry.eventId)}
      disabled={!entry.eventId}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--v2-surface-2)] disabled:cursor-default"
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: income ? 'var(--v2-accent-soft)' : 'var(--v2-surface-2)' }}
      >
        {income ? (
          <ArrowUpRight className="h-4 w-4" style={{ color: 'var(--v2-accent)' }} strokeWidth={2.4} />
        ) : (
          <ArrowDownRight className="h-4 w-4" style={{ color: 'var(--v2-text-2)' }} strokeWidth={2.4} />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium" style={{ color: 'var(--v2-text)' }}>
          {entry.description}
        </span>
        <span className="block truncate text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
          {entry.category} · {format(entry.date, "d 'de' MMM", { locale: ptBR })}
          {entry.spaceName ? ` · ${entry.spaceName}` : ''}
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span
          className="v2-tabnum block text-[14px] font-semibold"
          style={{ color: income ? 'var(--v2-text)' : 'var(--v2-text-2)' }}
        >
          {income ? '+' : '−'} {brlExact(entry.amount)}
        </span>
        <span
          className="v2-pill mt-0.5"
          style={{
            color: late ? 'var(--v2-red)' : entry.status === 'paid' ? 'var(--v2-green)' : 'var(--v2-text-2)',
            background: late
              ? 'var(--v2-red-soft)'
              : entry.status === 'paid'
                ? 'var(--v2-green-soft)'
                : 'var(--v2-surface-2)',
          }}
        >
          {entry.status === 'paid' ? (
            <>
              <Check className="h-3 w-3" strokeWidth={3} /> Pago
            </>
          ) : late ? (
            <>
              <AlertTriangle className="h-3 w-3" /> Em atraso
            </>
          ) : (
            <>
              <Clock3 className="h-3 w-3" /> A vencer
            </>
          )}
        </span>
      </span>
    </button>
  )
}

export default function FinanceiroPage() {
  const [period, setPeriod] = useState<Period>('mes')
  const [tab, setTab] = useState<Tab>('movimento')
  const [onlyLate, setOnlyLate] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState({ received: 0, spent: 0, toReceive: 0, lateTotal: 0, lateCount: 0 })
  const [ledger, setLedger] = useState<V2Ledger[]>([])
  const [upcoming, setUpcoming] = useState<V2Ledger[]>([])
  const [monthly, setMonthly] = useState<V2MonthPoint[]>([])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const range = rangeOf(period)
    const [fin, led, up, mon] = await Promise.all([
      loadFinanceTotals(range),
      loadLedger(range),
      loadUpcoming(),
      loadMonthly(12),
    ])
    setTotals(fin)
    setLedger(led)
    setUpcoming(up)
    setMonthly(mon)
    setLoading(false)
  }, [period])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const rows = useMemo(() => {
    if (tab === 'movimento') {
      return ledger.filter((l) => l.status === 'paid').sort((a, b) => +b.date - +a.date)
    }
    const list = onlyLate ? upcoming.filter((u) => u.status === 'overdue') : upcoming
    return [...list].sort((a, b) => +a.date - +b.date)
  }, [tab, ledger, upcoming, onlyLate])

  const nextDue = useMemo(
    () => upcoming.filter((u) => u.status !== 'overdue').sort((a, b) => +a.date - +b.date).slice(0, 5),
    [upcoming],
  )

  return (
    <div className="v2-fade">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="v2-h1">Financeiro</h1>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <FilterChip key={p.key} active={period === p.key} onClick={() => setPeriod(p.key)}>
              {p.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* ── Os três números que importam ──────────────────────────────────── */}
      <div
        className="v2-card mb-4 flex flex-col divide-y sm:flex-row sm:divide-x sm:divide-y-0"
        style={{ borderColor: 'var(--v2-line)' }}
      >
        <BigNumber
          label="Entrou"
          value={brl(totals.received)}
          detail={`${brl(totals.spent)} de despesas · saldo ${brl(totals.received - totals.spent)}`}
          tone="var(--v2-text)"
          loading={loading}
        />
        <BigNumber
          label="Falta entrar"
          value={brl(totals.toReceive)}
          detail="parcelas a vencer, já contratadas"
          tone="var(--v2-amber)"
          active={tab === 'vencimentos' && !onlyLate}
          loading={loading}
          onClick={() => {
            setTab('vencimentos')
            setOnlyLate(false)
          }}
        />
        <BigNumber
          label="Em atraso"
          value={brl(totals.lateTotal)}
          detail={`${totals.lateCount} ${totals.lateCount === 1 ? 'parcela vencida' : 'parcelas vencidas'} — clique para ver`}
          tone="var(--v2-red)"
          active={onlyLate}
          loading={loading}
          onClick={() => {
            setTab('vencimentos')
            setOnlyLate(true)
          }}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 flex items-center gap-1 border-b" style={{ borderColor: 'var(--v2-line)' }}>
            {(
              [
                { k: 'movimento' as const, label: 'Movimento' },
                { k: 'vencimentos' as const, label: 'A vencer' },
              ]
            ).map(({ k, label }) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setTab(k)
                  if (k === 'movimento') setOnlyLate(false)
                }}
                className="-mb-px border-b-2 px-3 py-2 text-[13.5px] font-medium transition-colors"
                style={{
                  borderColor: tab === k ? 'var(--v2-accent)' : 'transparent',
                  color: tab === k ? 'var(--v2-accent)' : 'var(--v2-text-2)',
                }}
              >
                {label}
              </button>
            ))}
            {onlyLate && (
              <button
                type="button"
                onClick={() => setOnlyLate(false)}
                className="mb-1 ml-auto rounded-full px-2.5 py-1 text-[12px] font-semibold"
                style={{ background: 'var(--v2-red-soft)', color: 'var(--v2-red)' }}
              >
                só atrasadas ✕
              </button>
            )}
          </div>

          <div className="v2-card divide-y" style={{ borderColor: 'var(--v2-line)' }}>
            {loading ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                title="Nenhum lançamento neste filtro"
                hint={tab === 'movimento' ? 'Tente ampliar o período.' : 'Nada a vencer no momento.'}
              />
            ) : (
              rows.map((r) => <LedgerRow key={r.id} entry={r} onOpenEvent={(id) => id && setOpenId(id)} />)
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="v2-card p-5">
            <SectionHeader title="Próximos vencimentos" />
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : nextDue.length === 0 ? (
              <p className="text-[13px]" style={{ color: 'var(--v2-text-3)' }}>
                Nada a vencer.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {nextDue.map((l) => (
                  <li key={l.id} className="flex items-center gap-2.5 text-[12.5px]">
                    <span className="v2-tabnum w-11 shrink-0 font-semibold" style={{ color: 'var(--v2-text-2)' }}>
                      {format(l.date, 'dd/MM')}
                    </span>
                    <span className="min-w-0 flex-1 truncate" style={{ color: 'var(--v2-text-2)' }}>
                      {l.description}
                    </span>
                    <span
                      className="v2-tabnum shrink-0 font-semibold"
                      style={{ color: l.kind === 'income' ? 'var(--v2-text)' : 'var(--v2-text-3)' }}
                    >
                      {l.kind === 'income' ? '+' : '−'}
                      {brl(l.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-start gap-2 px-1 text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Somente leitura. Para lançar receita ou despesa e dar baixa em parcela, use a versão atual.
            </span>
          </div>
        </div>
      </div>

      <div className="v2-card mt-5 p-5">
        <SectionHeader title="Receita e despesa por mês" />
        {loading || monthly.length === 0 ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <RevenueChart data={monthly} />
        )}
      </div>

      <EventDrawer eventId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
