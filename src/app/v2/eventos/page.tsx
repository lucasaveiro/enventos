'use client'

// ── Eventos ────────────────────────────────────────────────────────────────
// Duas mudanças de fundo em relação à v1:
//   1. os 5 cartões de indicador do topo viraram chips de filtro. Eles faziam
//      as duas coisas (informar e filtrar) ocupando 120px de altura; como chip,
//      informam o mesmo número e filtram no clique, em 32px
//   2. ganha a visão "Fluxo": o negócio é um funil (interesse → visita →
//      proposta → contrato → confirmado), e a lista plana escondia isso

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, List, Columns3, ChevronRight, Users2 } from 'lucide-react'
import { format, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  EVENTS,
  SPACES,
  STAGES,
  brl,
  today,
  type SpaceSlug,
  type V2Event,
} from '@/lib/v2/mock'
import { EventDrawer } from '@/components/v2/EventDrawer'
import {
  ContractPill,
  DateBlock,
  FilterChip,
  PaymentPill,
  Progress,
  SpaceDot,
  relativeDay,
} from '@/components/v2/ui'

type Quick = 'todos' | 'atrasados' | 'assinatura' | 'sem-contrato' | 'futuros'

const QUICK_FILTERS: { key: Quick; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'futuros', label: 'Próximos' },
  { key: 'atrasados', label: 'Com atraso' },
  { key: 'assinatura', label: 'Aguardando assinatura' },
  { key: 'sem-contrato', label: 'Sem contrato' },
]

function matchesQuick(e: V2Event, q: Quick, now: Date): boolean {
  switch (q) {
    case 'futuros':
      return e.start >= now
    case 'atrasados':
      return e.installments.some((i) => !i.paidAt && i.dueDate < now)
    case 'assinatura':
      return e.contract === 'sent' || e.contract === 'partial'
    case 'sem-contrato':
      return e.contract === 'none' || e.contract === 'draft'
    default:
      return true
  }
}

// ── Linha da lista ─────────────────────────────────────────────────────────
function Row({ event, onOpen }: { event: V2Event; onOpen: () => void }) {
  const pct = event.value > 0 ? (event.paid / event.value) * 100 : 0
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-4 px-3 py-3 text-left transition-colors hover:bg-[var(--v2-surface-2)]"
    >
      <DateBlock date={event.start} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold" style={{ color: 'var(--v2-text)' }}>
          {event.title}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12.5px]" style={{ color: 'var(--v2-text-3)' }}>
          <SpaceDot space={event.space} />
          {event.client.name} · {relativeDay(event.start)} · {event.guests} pessoas
        </p>
      </div>

      <div className="hidden w-36 shrink-0 md:block">
        <p className="v2-tabnum mb-1 text-right text-[13px] font-semibold" style={{ color: 'var(--v2-text)' }}>
          {brl(event.paid)}{' '}
          <span className="font-normal" style={{ color: 'var(--v2-text-3)' }}>
            / {brl(event.value)}
          </span>
        </p>
        <Progress value={pct} tone={event.payment === 'paid' ? 'var(--v2-green)' : 'var(--v2-amber)'} />
      </div>

      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <ContractPill
          status={event.contract}
          signedBy={event.contractSignedBy}
          totalSigners={event.contractTotalSigners}
        />
        <PaymentPill status={event.payment} compact />
      </div>

      <ChevronRight
        className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
        style={{ color: 'var(--v2-text-3)' }}
      />
    </button>
  )
}

// ── Cartão do fluxo ────────────────────────────────────────────────────────
function FlowCard({ event, onOpen }: { event: V2Event; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="v2-card v2-card-hover w-full p-3 text-left"
      style={{ borderLeft: `3px solid ${SPACES[event.space].color}` }}
    >
      <p className="truncate text-[13.5px] font-semibold" style={{ color: 'var(--v2-text)' }}>
        {event.title}
      </p>
      <p className="mt-0.5 truncate text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
        {format(event.start, "d 'de' MMM", { locale: ptBR })} · {event.client.name}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <span className="v2-tabnum text-[13px] font-semibold" style={{ color: 'var(--v2-text)' }}>
          {brl(event.value)}
        </span>
        <span className="flex items-center gap-1 text-[11.5px]" style={{ color: 'var(--v2-text-3)' }}>
          <Users2 className="h-3 w-3" />
          {event.guests}
        </span>
      </div>
    </button>
  )
}

function EventosInner() {
  const now = today()
  const params = useSearchParams()
  const [selected, setSelected] = useState<V2Event | null>(() => {
    const id = Number(params.get('id'))
    return EVENTS.find((e) => e.id === id) ?? null
  })
  const [view, setView] = useState<'lista' | 'fluxo'>('lista')
  const [q, setQ] = useState('')
  const [space, setSpace] = useState<SpaceSlug | 'all'>('all')
  const [quick, setQuick] = useState<Quick>('todos')

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return EVENTS.filter((e) => {
      if (space !== 'all' && e.space !== space) return false
      if (!matchesQuick(e, quick, now)) return false
      if (term && !`${e.title} ${e.client.name} ${e.type}`.toLowerCase().includes(term)) return false
      return true
    }).sort((a, b) => +a.start - +b.start)
  }, [q, space, quick, now])

  // Grupos por mês, para a lista não virar um paredão de linhas
  const grouped = useMemo(() => {
    const out: { label: string; items: V2Event[] }[] = []
    for (const e of filtered) {
      const label = format(e.start, "MMMM 'de' yyyy", { locale: ptBR })
      const last = out[out.length - 1]
      if (last && last.label === label) last.items.push(e)
      else out.push({ label, items: [e] })
    }
    return out
  }, [filtered])

  const counts = useMemo(
    () =>
      Object.fromEntries(
        QUICK_FILTERS.map((f) => [f.key, EVENTS.filter((e) => matchesQuick(e, f.key, now)).length]),
      ) as Record<Quick, number>,
    [now],
  )

  const totalValue = filtered.reduce((s, e) => s + e.value, 0)
  const totalPaid = filtered.reduce((s, e) => s + e.paid, 0)

  return (
    <div className="v2-fade">
      {/* Cabeçalho */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="v2-h1">Eventos</h1>
          <p className="mt-1 text-[13.5px]" style={{ color: 'var(--v2-text-2)' }}>
            {filtered.length} evento{filtered.length === 1 ? '' : 's'} ·{' '}
            <strong style={{ color: 'var(--v2-text)' }}>{brl(totalValue)}</strong> contratados,{' '}
            <strong style={{ color: 'var(--v2-green)' }}>{brl(totalPaid)}</strong> recebidos
          </p>
        </div>

        <div className="flex items-center gap-0.5 rounded-lg border p-0.5" style={{ borderColor: 'var(--v2-line-2)' }}>
          {(
            [
              { k: 'lista' as const, icon: List, label: 'Lista' },
              { k: 'fluxo' as const, icon: Columns3, label: 'Fluxo' },
            ]
          ).map(({ k, icon: Icon, label }) => (
            <button
              key={k}
              type="button"
              onClick={() => setView(k)}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors"
              style={{
                background: view === k ? 'var(--v2-surface-2)' : 'transparent',
                color: view === k ? 'var(--v2-text)' : 'var(--v2-text-3)',
              }}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Busca + filtros */}
      <div className="mb-3 flex items-center gap-2">
        <div
          className="flex h-9 flex-1 items-center gap-2 rounded-lg border px-3 md:max-w-xs"
          style={{ borderColor: 'var(--v2-line-2)', background: 'var(--v2-surface)' }}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--v2-text-3)' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por evento ou cliente..."
            className="w-full bg-transparent text-[13.5px] outline-none"
            style={{ color: 'var(--v2-text)' }}
          />
        </div>
        <FilterChip active={space === 'all'} onClick={() => setSpace('all')}>
          Todos
        </FilterChip>
        {(Object.keys(SPACES) as SpaceSlug[]).map((slug) => (
          <FilterChip key={slug} active={space === slug} onClick={() => setSpace(slug)} dot={SPACES[slug].color}>
            {SPACES[slug].short}
          </FilterChip>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {QUICK_FILTERS.map((f) => (
          <FilterChip key={f.key} active={quick === f.key} onClick={() => setQuick(f.key)}>
            {f.label}
            <span
              className="ml-0.5 rounded-full px-1.5 text-[11px] font-bold"
              style={{
                background: quick === f.key ? 'rgb(255 255 255 / 0.2)' : 'var(--v2-surface-2)',
                color: quick === f.key ? '#fff' : 'var(--v2-text-3)',
              }}
            >
              {counts[f.key]}
            </span>
          </FilterChip>
        ))}
      </div>

      {/* ── Lista ─────────────────────────────────────────────────────────── */}
      {view === 'lista' ? (
        filtered.length === 0 ? (
          <div className="v2-card px-4 py-16 text-center">
            <p className="text-[14px] font-medium" style={{ color: 'var(--v2-text)' }}>
              Nenhum evento encontrado
            </p>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--v2-text-3)' }}>
              Tente limpar a busca ou trocar o filtro.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map((g) => (
              <div key={g.label}>
                <h2
                  className="v2-cap mb-2 px-1 text-[12.5px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--v2-text-3)' }}
                >
                  {g.label}
                  {isSameMonth(g.items[0].start, now) && (
                    <span className="ml-2 normal-case" style={{ color: 'var(--v2-accent)' }}>
                      · mês atual
                    </span>
                  )}
                </h2>
                <div className="v2-card divide-y" style={{ borderColor: 'var(--v2-line)' }}>
                  {g.items.map((e) => (
                    <Row key={e.id} event={e} onOpen={() => setSelected(e)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── Fluxo (funil comercial) ─────────────────────────────────────── */
        <div className="v2-scroll -mx-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
          <div className="flex min-w-[900px] gap-3">
            {STAGES.map((stage) => {
              const items = filtered.filter((e) => e.stage === stage.key)
              const value = items.reduce((s, e) => s + e.value, 0)
              return (
                <div key={stage.key} className="flex-1">
                  <div className="mb-2 flex items-baseline justify-between px-1">
                    <h2 className="text-[13px] font-semibold" style={{ color: 'var(--v2-text)' }}>
                      {stage.label}
                      <span className="ml-1.5 font-normal" style={{ color: 'var(--v2-text-3)' }}>
                        {items.length}
                      </span>
                    </h2>
                  </div>
                  <p className="v2-tabnum mb-2 px-1 text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
                    {brl(value)}
                  </p>
                  <div
                    className="min-h-[140px] space-y-2 rounded-xl p-2"
                    style={{ background: 'var(--v2-surface-2)' }}
                  >
                    {items.map((e) => (
                      <FlowCard key={e.id} event={e} onOpen={() => setSelected(e)} />
                    ))}
                    {items.length === 0 && (
                      <p className="px-1 py-6 text-center text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
                        vazio
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <EventDrawer event={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

export default function EventosPage() {
  return (
    <Suspense fallback={null}>
      <EventosInner />
    </Suspense>
  )
}
