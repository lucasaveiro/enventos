'use client'

// ── Financeiro ─────────────────────────────────────────────────────────────
// Na v1 o dinheiro mora em três rotas (/dashboard, /financial,
// /financeiro/calendario) e a tela de resumo abre com ONZE cartões de valor,
// todos com o mesmo peso visual. Aqui:
//   • três números respondem a tudo: entrou, falta entrar, está atrasado
//   • os outros oito viram detalhe dentro da lista, não manchete
//   • lançamentos e vencimentos são a mesma lista, com um seletor — porque são
//     a mesma coisa vista antes ou depois da data de hoje

import { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  Plus,
  Check,
  Clock3,
} from 'lucide-react'
import { format, isAfter, isSameMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  LEDGER,
  MONTHLY,
  SPACES,
  EVENTS,
  brl,
  brlExact,
  today,
  type Ledger,
} from '@/lib/v2/mock'
import { RevenueChart } from '@/components/v2/RevenueChart'
import { EventDrawer } from '@/components/v2/EventDrawer'
import { FilterChip, SectionHeader, SpaceDot } from '@/components/v2/ui'
import { cn } from '@/lib/utils'

type Period = 'mes' | '3meses' | 'tudo'
type Tab = 'movimento' | 'vencimentos'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'mes', label: 'Este mês' },
  { key: '3meses', label: 'Últimos 3 meses' },
  { key: 'tudo', label: 'Tudo' },
]

function inPeriod(d: Date, p: Period, now: Date) {
  if (p === 'tudo') return true
  if (p === 'mes') return isSameMonth(d, now)
  return isAfter(d, subMonths(now, 3))
}

// ── Número grande ──────────────────────────────────────────────────────────
function BigNumber({
  label,
  value,
  detail,
  tone,
  active,
  onClick,
}: {
  label: string
  value: string
  detail: string
  tone: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex-1 rounded-xl p-4 text-left transition-colors', onClick && 'hover:bg-[var(--v2-surface-2)]')}
      style={{ background: active ? 'var(--v2-surface-2)' : 'transparent' }}
    >
      <p className="text-[12.5px] font-medium" style={{ color: 'var(--v2-text-2)' }}>
        {label}
      </p>
      <p className="v2-num mt-1" style={{ color: tone }}>
        {value}
      </p>
      <p className="mt-1 text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
        {detail}
      </p>
    </button>
  )
}

// ── Linha de lançamento ────────────────────────────────────────────────────
function LedgerRow({ entry, onOpenEvent }: { entry: Ledger; onOpenEvent: (id?: number) => void }) {
  const income = entry.kind === 'income'
  const now = today()
  const late = entry.status === 'pending' && entry.date < now

  return (
    <button
      type="button"
      onClick={() => onOpenEvent(entry.eventId)}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--v2-surface-2)]"
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
        <span className="flex items-center gap-1.5 truncate text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
          {entry.space && <SpaceDot space={entry.space} />}
          {entry.category} · {format(entry.date, "d 'de' MMM", { locale: ptBR })}
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
            background: late ? 'var(--v2-red-soft)' : entry.status === 'paid' ? 'var(--v2-green-soft)' : 'var(--v2-surface-2)',
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
  const now = today()
  const [period, setPeriod] = useState<Period>('mes')
  const [tab, setTab] = useState<Tab>('movimento')
  const [onlyLate, setOnlyLate] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<(typeof EVENTS)[number] | null>(null)

  const totals = useMemo(() => {
    const scope = LEDGER.filter((l) => inPeriod(l.date, period, now))
    const received = scope.filter((l) => l.kind === 'income' && l.status === 'paid').reduce((s, l) => s + l.amount, 0)
    const spent = scope.filter((l) => l.kind === 'expense' && l.status === 'paid').reduce((s, l) => s + l.amount, 0)
    const toReceive = LEDGER.filter((l) => l.kind === 'income' && l.status === 'pending' && l.date >= now).reduce(
      (s, l) => s + l.amount,
      0,
    )
    const late = LEDGER.filter((l) => l.kind === 'income' && l.status === 'pending' && l.date < now)
    return {
      received,
      spent,
      toReceive,
      lateTotal: late.reduce((s, l) => s + l.amount, 0),
      lateCount: late.length,
      scopeCount: scope.length,
    }
  }, [period, now])

  const rows = useMemo(() => {
    let list = LEDGER.filter((l) => (tab === 'movimento' ? l.status === 'paid' : l.status === 'pending'))
    if (tab === 'movimento') list = list.filter((l) => inPeriod(l.date, period, now))
    if (onlyLate) list = list.filter((l) => l.date < now && l.status === 'pending')
    return list.sort((a, b) => (tab === 'movimento' ? +b.date - +a.date : +a.date - +b.date))
  }, [tab, period, onlyLate, now])

  const openEvent = (id?: number) => {
    const e = EVENTS.find((x) => x.id === id)
    if (e) setSelectedEvent(e)
  }

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
      <div className="v2-card mb-4 flex flex-col divide-y sm:flex-row sm:divide-x sm:divide-y-0" style={{ borderColor: 'var(--v2-line)' }}>
        <BigNumber
          label="Entrou"
          value={brl(totals.received)}
          detail={`${brl(totals.spent)} de despesas · saldo ${brl(totals.received - totals.spent)}`}
          tone="var(--v2-text)"
        />
        <BigNumber
          label="Falta entrar"
          value={brl(totals.toReceive)}
          detail="parcelas a vencer, já contratadas"
          tone="var(--v2-amber)"
          active={tab === 'vencimentos' && !onlyLate}
          onClick={() => {
            setTab('vencimentos')
            setOnlyLate(false)
          }}
        />
        <BigNumber
          label="Em atraso"
          value={brl(totals.lateTotal)}
          detail={`${totals.lateCount} parcela${totals.lateCount === 1 ? '' : 's'} vencida${totals.lateCount === 1 ? '' : 's'} — clique para ver`}
          tone="var(--v2-red)"
          active={onlyLate}
          onClick={() => {
            setTab('vencimentos')
            setOnlyLate(true)
          }}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* ── Lista unificada ────────────────────────────────────────────── */}
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
                className="ml-auto mb-1 rounded-full px-2.5 py-1 text-[12px] font-semibold"
                style={{ background: 'var(--v2-red-soft)', color: 'var(--v2-red)' }}
              >
                só atrasadas ✕
              </button>
            )}
            <button
              type="button"
              className={cn('mb-1 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12.5px] font-semibold', !onlyLate && 'ml-auto')}
              style={{ color: 'var(--v2-accent)' }}
            >
              <Plus className="h-3.5 w-3.5" /> Lançar
            </button>
          </div>

          <div className="v2-card divide-y" style={{ borderColor: 'var(--v2-line)' }}>
            {rows.length === 0 ? (
              <p className="px-4 py-12 text-center text-[13.5px]" style={{ color: 'var(--v2-text-3)' }}>
                Nenhum lançamento neste filtro.
              </p>
            ) : (
              rows.map((r) => <LedgerRow key={r.id} entry={r} onOpenEvent={openEvent} />)
            )}
          </div>
        </div>

        {/* ── Coluna lateral ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="v2-card p-5">
            <SectionHeader title="Receita por espaço" />
            {(Object.keys(SPACES) as (keyof typeof SPACES)[]).map((slug) => {
              const total = EVENTS.filter((e) => e.space === slug).reduce((s, e) => s + e.value, 0)
              const grand = EVENTS.reduce((s, e) => s + e.value, 0) || 1
              return (
                <div key={slug} className="mb-3 last:mb-0">
                  <div className="mb-1.5 flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--v2-text-2)' }}>
                      <SpaceDot space={slug} />
                      {SPACES[slug].name}
                    </span>
                    <span className="v2-tabnum font-semibold" style={{ color: 'var(--v2-text)' }}>
                      {brl(total)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--v2-surface-3)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(total / grand) * 100}%`, background: SPACES[slug].color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="v2-card p-5">
            <SectionHeader title="Próximos 30 dias" />
            <ul className="space-y-2.5">
              {LEDGER.filter((l) => l.status === 'pending' && l.date >= now)
                .sort((a, b) => +a.date - +b.date)
                .slice(0, 5)
                .map((l) => (
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
          </div>
        </div>
      </div>

      {/* ── Gráfico ───────────────────────────────────────────────────────── */}
      <div className="v2-card mt-5 p-5">
        <SectionHeader title="Receita e despesa por mês" />
        <RevenueChart data={MONTHLY} />
      </div>

      <EventDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  )
}
