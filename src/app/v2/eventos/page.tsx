'use client'

// ── Eventos ────────────────────────────────────────────────────────────────
// Duas mudanças de fundo em relação à v1:
//   1. os 5 cartões de indicador do topo viraram chips de filtro. Eles faziam
//      as duas coisas (informar e filtrar) ocupando 120px de altura; como chip,
//      informam o mesmo número e filtram no clique, em 32px
//   2. ganha a visão "Fluxo": o negócio é um funil (interesse → visita →
//      proposta → contrato → confirmado), e a lista plana escondia isso
//
// FASE A: o progresso aparece em número de parcelas, não em reais. O valor
// exato já pago depende de parcelas + lançamentos avulsos por evento e só é
// calculado no painel lateral, com a mesma regra da v1 — assim a lista nunca
// mostra um número que diverge da tela de evento.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, List, Columns3, ChevronRight, Users2 } from 'lucide-react'
import { format, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { loadEvents, loadSpaces } from '@/lib/v2/data'
import { brl } from '@/lib/v2/format'
import type { V2Event, V2Space, V2Stage } from '@/lib/v2/types'
import { EventDrawer } from '@/components/v2/EventDrawer'
import {
  ContractPill,
  DateBlock,
  EmptyState,
  FilterChip,
  PaymentPill,
  Progress,
  Skeleton,
  SpaceDot,
  relativeDay,
} from '@/components/v2/ui'

const STAGES: { key: V2Stage; label: string }[] = [
  { key: 'interesse', label: 'Interesse' },
  { key: 'visita', label: 'Visita' },
  { key: 'proposta', label: 'Proposta' },
  { key: 'contrato', label: 'Contrato' },
  { key: 'confirmado', label: 'Confirmado' },
  { key: 'realizado', label: 'Realizado' },
]

type Quick = 'todos' | 'futuros' | 'atrasados' | 'assinatura' | 'sem-contrato'

const QUICK_FILTERS: { key: Quick; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'futuros', label: 'Próximos' },
  { key: 'atrasados', label: 'Com parcela em aberto' },
  { key: 'assinatura', label: 'Aguardando assinatura' },
  { key: 'sem-contrato', label: 'Sem contrato' },
]

function matchesQuick(e: V2Event, q: Quick, now: Date): boolean {
  switch (q) {
    case 'futuros':
      return e.start >= now
    case 'atrasados':
      return e.installmentsTotal > e.installmentsPaid && e.payment !== 'paid'
    case 'assinatura':
      return e.contract === 'sent' || e.contract === 'partial'
    case 'sem-contrato':
      return e.contract === 'none' || e.contract === 'draft'
    default:
      return true
  }
}

function Row({ event, onOpen }: { event: V2Event; onOpen: () => void }) {
  const pct = event.installmentsTotal > 0 ? (event.installmentsPaid / event.installmentsTotal) * 100 : 0
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
          {event.client?.name ?? 'Sem cliente'} · {relativeDay(event.start)}
          {event.guests != null && ` · ${event.guests} pessoas`}
        </p>
      </div>

      <div className="hidden w-36 shrink-0 md:block">
        <p className="v2-tabnum mb-1 text-right text-[13px] font-semibold" style={{ color: 'var(--v2-text)' }}>
          {brl(event.value)}
        </p>
        {event.installmentsTotal > 0 ? (
          <>
            <Progress value={pct} tone={event.payment === 'paid' ? 'var(--v2-green)' : 'var(--v2-amber)'} />
            <p className="mt-1 text-right text-[11px]" style={{ color: 'var(--v2-text-3)' }}>
              {event.installmentsPaid} de {event.installmentsTotal} parcelas
            </p>
          </>
        ) : (
          <p className="text-right text-[11px]" style={{ color: 'var(--v2-text-3)' }}>
            sem parcelamento
          </p>
        )}
      </div>

      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <ContractPill status={event.contract} />
        <PaymentPill status={event.payment} compact />
      </div>

      <ChevronRight
        className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
        style={{ color: 'var(--v2-text-3)' }}
      />
    </button>
  )
}

function FlowCard({ event, onOpen }: { event: V2Event; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="v2-card v2-card-hover w-full p-3 text-left"
      style={{ borderLeft: `3px solid ${event.space.color}` }}
    >
      <p className="truncate text-[13.5px] font-semibold" style={{ color: 'var(--v2-text)' }}>
        {event.title}
      </p>
      <p className="mt-0.5 truncate text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
        {format(event.start, "d 'de' MMM", { locale: ptBR })}
        {event.client ? ` · ${event.client.name}` : ''}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <span className="v2-tabnum text-[13px] font-semibold" style={{ color: 'var(--v2-text)' }}>
          {brl(event.value)}
        </span>
        {event.guests != null && (
          <span className="flex items-center gap-1 text-[11.5px]" style={{ color: 'var(--v2-text-3)' }}>
            <Users2 className="h-3 w-3" />
            {event.guests}
          </span>
        )}
      </div>
    </button>
  )
}

export default function EventosPage() {
  const now = useMemo(() => new Date(), [])

  // O id vem da URL (a busca global manda para cá com ?id=), mas lido do
  // window num efeito, e não com useSearchParams: o hook obriga um limite de
  // Suspense em volta da página inteira e, com o React Compiler ligado, essa
  // fronteira ficava adiada para sempre — a tela abria em branco.
  const [openId, setOpenId] = useState<number | null>(null)

  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get('id'))
    if (Number.isFinite(id) && id > 0) setOpenId(id)
  }, [])
  const [events, setEvents] = useState<V2Event[]>([])
  const [spaces, setSpaces] = useState<V2Space[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'lista' | 'fluxo'>('lista')
  const [q, setQ] = useState('')
  const [space, setSpace] = useState<number | 'all'>('all')
  const [quick, setQuick] = useState<Quick>('todos')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [ev, sp] = await Promise.all([loadEvents(), loadSpaces()])
    setEvents(ev)
    setSpaces(sp)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return events
      .filter((e) => {
        if (space !== 'all' && e.space.id !== space) return false
        if (!matchesQuick(e, quick, now)) return false
        if (term && !`${e.title} ${e.client?.name ?? ''} ${e.type}`.toLowerCase().includes(term)) return false
        return true
      })
      .sort((a, b) => +a.start - +b.start)
  }, [events, q, space, quick, now])

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
        QUICK_FILTERS.map((f) => [f.key, events.filter((e) => matchesQuick(e, f.key, now)).length]),
      ) as Record<Quick, number>,
    [events, now],
  )

  const totalValue = filtered.reduce((s, e) => s + e.value, 0)

  return (
    <div className="v2-fade">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="v2-h1">Eventos</h1>
          <p className="mt-1 text-[13.5px]" style={{ color: 'var(--v2-text-2)' }}>
            {loading ? 'Carregando...' : (
              <>
                {filtered.length} evento{filtered.length === 1 ? '' : 's'} ·{' '}
                <strong style={{ color: 'var(--v2-text)' }}>{brl(totalValue)}</strong> contratados
              </>
            )}
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

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div
          className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-lg border px-3 md:max-w-xs"
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
        {spaces.map((s) => (
          <FilterChip key={s.id} active={space === s.id} onClick={() => setSpace(s.id)} dot={s.color}>
            {s.short}
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
              {counts[f.key] ?? 0}
            </span>
          </FilterChip>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : view === 'lista' ? (
        filtered.length === 0 ? (
          <div className="v2-card">
            <EmptyState title="Nenhum evento encontrado" hint="Tente limpar a busca ou trocar o filtro." />
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
                    <Row key={e.id} event={e} onOpen={() => setOpenId(e.id)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
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
                  <div className="min-h-[140px] space-y-2 rounded-xl p-2" style={{ background: 'var(--v2-surface-2)' }}>
                    {items.map((e) => (
                      <FlowCard key={e.id} event={e} onOpen={() => setOpenId(e.id)} />
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

      <EventDrawer eventId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
