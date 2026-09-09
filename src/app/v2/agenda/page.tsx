'use client'

// ── Agenda ─────────────────────────────────────────────────────────────────
// O calendário continua sendo o coração do sistema, mas com três mudanças:
//   1. clicar num evento abre o painel lateral, não navega para outra página
//   2. o filtro de espaço vira chip colorido — a cor do espaço é a mesma no
//      calendário, na lista e nos gráficos, então dá para ler sem legenda
//   3. no celular a visão vira lista por dia, porque grade de 7 colunas em
//      tela de 390px não é legível

import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  Plus,
} from 'lucide-react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AGENDA_EXTRAS,
  EVENTS,
  SPACES,
  brl,
  today,
  type AgendaItem,
  type SpaceSlug,
  type V2Event,
} from '@/lib/v2/mock'
import { EventDrawer } from '@/components/v2/EventDrawer'
import { FilterChip, PaymentPill, SpaceDot } from '@/components/v2/ui'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

// Cada tipo de item da agenda tem um tratamento visual distinto: eventos são
// blocos cheios (dinheiro travado na data), visitas e interesses são contornos
// (data ainda disponível), serviços são discretos.
const KIND_STYLE: Record<AgendaItem['kind'], { label: string; filled: boolean; dashed: boolean }> = {
  evento: { label: 'Evento', filled: true, dashed: false },
  visita: { label: 'Visita', filled: false, dashed: false },
  interesse: { label: 'Interesse', filled: false, dashed: true },
  servico: { label: 'Serviço', filled: false, dashed: false },
}

export default function AgendaPage() {
  const now = today()
  const [cursor, setCursor] = useState(startOfMonth(now))
  const [view, setView] = useState<'mes' | 'lista'>('mes')
  const [spaceFilter, setSpaceFilter] = useState<SpaceSlug | 'all'>('all')
  const [selected, setSelected] = useState<V2Event | null>(null)

  // Une eventos e itens extras num único fluxo — na v1 eles moram em telas
  // diferentes, mas na cabeça de quem opera é tudo "o que acontece nesse dia".
  const items = useMemo<AgendaItem[]>(() => {
    const fromEvents: AgendaItem[] = EVENTS.map((e) => ({
      id: `e${e.id}`,
      kind: 'evento',
      title: e.title,
      subtitle: `${e.guests} convidados · ${brl(e.value)}`,
      space: e.space,
      start: e.start,
      end: e.end,
      eventId: e.id,
    }))
    const all = [...fromEvents, ...AGENDA_EXTRAS]
    return (spaceFilter === 'all' ? all : all.filter((i) => i.space === spaceFilter)).sort(
      (a, b) => +a.start - +b.start,
    )
  }, [spaceFilter])

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 }),
      }),
    [cursor],
  )

  const itemsOf = (day: Date) => items.filter((i) => isSameDay(i.start, day))

  const monthItems = useMemo(
    () => items.filter((i) => isSameMonth(i.start, cursor)),
    [items, cursor],
  )

  const monthRevenue = useMemo(
    () =>
      EVENTS.filter((e) => isSameMonth(e.start, cursor) && (spaceFilter === 'all' || e.space === spaceFilter)).reduce(
        (s, e) => s + e.value,
        0,
      ),
    [cursor, spaceFilter],
  )

  const open = (item: AgendaItem) => {
    const e = EVENTS.find((x) => x.id === item.eventId)
    if (e) setSelected(e)
  }

  return (
    <div className="v2-fade">
      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCursor(subMonths(cursor, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-[var(--v2-surface-2)]"
            style={{ borderColor: 'var(--v2-line-2)' }}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" style={{ color: 'var(--v2-text-2)' }} />
          </button>
          <button
            type="button"
            onClick={() => setCursor(addMonths(cursor, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-[var(--v2-surface-2)]"
            style={{ borderColor: 'var(--v2-line-2)' }}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" style={{ color: 'var(--v2-text-2)' }} />
          </button>
          <h1 className="v2-h1 v2-cap ml-1">{format(cursor, 'MMMM yyyy', { locale: ptBR })}</h1>
          {!isSameMonth(cursor, now) && (
            <button
              type="button"
              onClick={() => setCursor(startOfMonth(now))}
              className="ml-1 rounded-lg border px-2.5 py-1 text-[12.5px] font-medium transition-colors hover:bg-[var(--v2-surface-2)]"
              style={{ borderColor: 'var(--v2-line-2)', color: 'var(--v2-text-2)' }}
            >
              Hoje
            </button>
          )}
        </div>

        <div
          className="flex items-center gap-0.5 rounded-lg border p-0.5"
          style={{ borderColor: 'var(--v2-line-2)' }}
        >
          {(
            [
              { k: 'mes' as const, icon: CalendarDays, label: 'Mês' },
              { k: 'lista' as const, icon: List, label: 'Lista' },
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

      {/* ── Filtros e resumo do mês ───────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterChip active={spaceFilter === 'all'} onClick={() => setSpaceFilter('all')}>
          Todos os espaços
        </FilterChip>
        {(Object.keys(SPACES) as SpaceSlug[]).map((slug) => (
          <FilterChip
            key={slug}
            active={spaceFilter === slug}
            onClick={() => setSpaceFilter(slug)}
            dot={SPACES[slug].color}
          >
            {SPACES[slug].name}
          </FilterChip>
        ))}
        <span className="ml-auto text-[13px]" style={{ color: 'var(--v2-text-2)' }}>
          <strong style={{ color: 'var(--v2-text)' }}>{monthItems.filter((i) => i.kind === 'evento').length}</strong>{' '}
          eventos ·{' '}
          <strong style={{ color: 'var(--v2-text)' }}>{brl(monthRevenue)}</strong> no mês
        </span>
      </div>

      {/* ── Visão de mês ──────────────────────────────────────────────────── */}
      {view === 'mes' ? (
        <div className="v2-card overflow-hidden">
          <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--v2-line)' }}>
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-2.5 text-center text-[11.5px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--v2-text-3)' }}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const inMonth = isSameMonth(day, cursor)
              const isToday = isSameDay(day, now)
              const dayItems = itemsOf(day)
              return (
                <div
                  key={idx}
                  className="group relative min-h-[104px] border-b border-r p-1.5 sm:min-h-[118px]"
                  style={{
                    borderColor: 'var(--v2-line)',
                    background: inMonth ? 'var(--v2-surface)' : 'var(--v2-surface-2)',
                  }}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        'v2-tabnum flex h-6 w-6 items-center justify-center rounded-full text-[12.5px]',
                        isToday ? 'font-bold text-white' : 'font-medium',
                      )}
                      style={{
                        background: isToday ? 'var(--v2-accent)' : 'transparent',
                        color: isToday ? '#fff' : inMonth ? 'var(--v2-text)' : 'var(--v2-text-3)',
                      }}
                    >
                      {format(day, 'd')}
                    </span>
                    <button
                      type="button"
                      className="hidden h-5 w-5 items-center justify-center rounded transition-colors group-hover:flex hover:bg-[var(--v2-surface-3)]"
                      aria-label={`Adicionar em ${format(day, 'dd/MM')}`}
                    >
                      <Plus className="h-3.5 w-3.5" style={{ color: 'var(--v2-text-3)' }} />
                    </button>
                  </div>

                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map((item) => {
                      const c = SPACES[item.space].color
                      const st = KIND_STYLE[item.kind]
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => open(item)}
                          title={`${item.title} — ${item.subtitle}`}
                          className="block w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium leading-tight transition-opacity hover:opacity-80"
                          style={{
                            background: st.filled ? c : SPACES[item.space].soft,
                            color: st.filled ? '#fff' : c,
                            border: st.dashed ? `1px dashed ${c}` : '1px solid transparent',
                          }}
                        >
                          <span className="hidden sm:inline">
                            {item.kind === 'evento' ? format(item.start, 'HH:mm') + ' ' : ''}
                          </span>
                          {item.title.replace(/^(Visita|Interesse) — /, '')}
                        </button>
                      )
                    })}
                    {dayItems.length > 3 && (
                      <p className="px-1.5 text-[11px] font-medium" style={{ color: 'var(--v2-text-3)' }}>
                        +{dayItems.length - 3} mais
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* ── Visão de lista ─────────────────────────────────────────────── */
        <div className="v2-card divide-y overflow-hidden" style={{ borderColor: 'var(--v2-line)' }}>
          {monthItems.length === 0 && (
            <p className="px-4 py-12 text-center text-[13.5px]" style={{ color: 'var(--v2-text-3)' }}>
              Nenhum compromisso neste mês.
            </p>
          )}
          {monthItems.map((item) => {
            const ev = EVENTS.find((e) => e.id === item.eventId)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => open(item)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-[var(--v2-surface-2)]"
              >
                <div className="w-24 shrink-0">
                  <p className="v2-cap text-[12.5px] font-semibold" style={{ color: 'var(--v2-text)' }}>
                    {format(item.start, "EEE, d 'de' MMM", { locale: ptBR })}
                  </p>
                  <p className="v2-tabnum text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
                    {format(item.start, 'HH:mm')}
                  </p>
                </div>
                <span className="h-9 w-[3px] shrink-0 rounded-full" style={{ background: SPACES[item.space].color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium" style={{ color: 'var(--v2-text)' }}>
                    {item.title}
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-[12.5px]" style={{ color: 'var(--v2-text-3)' }}>
                    <SpaceDot space={item.space} />
                    {KIND_STYLE[item.kind].label} · {item.subtitle}
                  </p>
                </div>
                {ev && <PaymentPill status={ev.payment} compact />}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Legenda ───────────────────────────────────────────────────────── */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded" style={{ background: 'var(--v2-text-3)' }} /> Evento confirmado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded border" style={{ borderColor: 'var(--v2-text-3)', background: 'var(--v2-surface-2)' }} />{' '}
          Visita / serviço
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-3 w-5 rounded border border-dashed"
            style={{ borderColor: 'var(--v2-text-3)', background: 'var(--v2-surface-2)' }}
          />{' '}
          Data de interesse (sem sinal)
        </span>
        <span className="ml-auto hidden sm:block">Clique em qualquer item para abrir o painel do evento</span>
      </div>

      <EventDrawer event={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
