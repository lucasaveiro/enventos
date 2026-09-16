'use client'

// ── Agenda ─────────────────────────────────────────────────────────────────
// O calendário continua sendo o coração do sistema, mas com três mudanças:
//   1. clicar num evento abre o painel lateral, não navega para outra página
//   2. o filtro de espaço vira chip colorido — a cor do espaço é a mesma no
//      calendário, na lista e nos gráficos, então dá para ler sem legenda
//   3. eventos, visitas, datas de interesse e serviços aparecem juntos, porque
//      na cabeça de quem opera é tudo "o que acontece nesse dia"
//
// O mês navegado mora na URL (?mes=2026-09): trocar de mês é uma navegação, e o
// servidor devolve a tela já com os dados do mês novo. O mês chega como texto e
// vira Date aqui, no fuso do navegador: um Date de "1º do mês" montado no
// servidor (UTC) chegava a Brasília como 21h do último dia do mês anterior.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, CalendarDays, List } from 'lucide-react'
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
import { brl, monthFromKey } from '@/lib/v2/format'
import type { V2AgendaItem, V2Space } from '@/lib/v2/types'
import { EventDrawer } from '@/components/v2/EventDrawer'
import { useEventForm } from '@/components/v2/EventFormProvider'
import { EmptyState, FilterChip, SpaceDot } from '@/components/v2/ui'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

// Cada tipo de item tem tratamento visual distinto: eventos são blocos cheios
// (data vendida), visitas e serviços são contornos, interesse é tracejado
// (data segurada, mas sem sinal).
const KIND_STYLE: Record<V2AgendaItem['kind'], { label: string; filled: boolean; dashed: boolean }> = {
  evento: { label: 'Evento', filled: true, dashed: false },
  visita: { label: 'Visita', filled: false, dashed: false },
  interesse: { label: 'Interesse', filled: false, dashed: true },
  servico: { label: 'Serviço', filled: false, dashed: false },
}

const monthHref = (date: Date) => `/v2/agenda?mes=${format(date, 'yyyy-MM')}`

export function AgendaClient({
  month,
  items,
  spaces,
}: {
  /** "yyyy-MM" — ver monthKeyOf/monthFromKey em lib/v2/format.ts. */
  month: string
  items: V2AgendaItem[]
  spaces: V2Space[]
}) {
  const cursor = useMemo(() => monthFromKey(month), [month])
  const now = useMemo(() => new Date(), [])
  const { novoEvento } = useEventForm()
  const [view, setView] = useState<'mes' | 'lista'>('mes')
  const [spaceFilter, setSpaceFilter] = useState<number | 'all'>('all')
  const [openId, setOpenId] = useState<number | null>(null)

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 }),
      }),
    [cursor],
  )

  const visible = useMemo(
    () => (spaceFilter === 'all' ? items : items.filter((i) => i.space.id === spaceFilter)),
    [items, spaceFilter],
  )

  const itemsOf = (day: Date) => visible.filter((i) => isSameDay(i.start, day))
  const monthItems = useMemo(() => visible.filter((i) => isSameMonth(i.start, cursor)), [visible, cursor])
  const monthEvents = monthItems.filter((i) => i.kind === 'evento')
  const monthRevenue = monthEvents.reduce((s, i) => s + (i.value ?? 0), 0)

  return (
    <div className="v2-fade">
      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={monthHref(subMonths(cursor, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-[var(--v2-surface-2)]"
            style={{ borderColor: 'var(--v2-line-2)' }}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" style={{ color: 'var(--v2-text-2)' }} />
          </Link>
          <Link
            href={monthHref(addMonths(cursor, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-[var(--v2-surface-2)]"
            style={{ borderColor: 'var(--v2-line-2)' }}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" style={{ color: 'var(--v2-text-2)' }} />
          </Link>
          <h1 className="v2-h1 v2-cap ml-1">{format(cursor, 'MMMM yyyy', { locale: ptBR })}</h1>
          {!isSameMonth(cursor, now) && (
            <Link
              href={monthHref(now)}
              className="ml-1 rounded-lg border px-2.5 py-1 text-[12.5px] font-medium transition-colors hover:bg-[var(--v2-surface-2)]"
              style={{ borderColor: 'var(--v2-line-2)', color: 'var(--v2-text-2)' }}
            >
              Hoje
            </Link>
          )}
        </div>

        <div className="flex items-center gap-0.5 rounded-lg border p-0.5" style={{ borderColor: 'var(--v2-line-2)' }}>
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
        {spaces.map((s) => (
          <FilterChip
            key={s.id}
            active={spaceFilter === s.id}
            onClick={() => setSpaceFilter(s.id)}
            dot={s.color}
          >
            {s.name}
          </FilterChip>
        ))}
        <span className="ml-auto text-[13px]" style={{ color: 'var(--v2-text-2)' }}>
          <strong style={{ color: 'var(--v2-text)' }}>{monthEvents.length}</strong> eventos ·{' '}
          <strong style={{ color: 'var(--v2-text)' }}>{brl(monthRevenue)}</strong> no mês
        </span>
      </div>

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
                  className="relative min-h-[104px] border-b border-r p-1.5 sm:min-h-[118px]"
                  style={{
                    borderColor: 'var(--v2-line)',
                    background: inMonth ? 'var(--v2-surface)' : 'var(--v2-surface-2)',
                  }}
                >
                  {/* Área vazia do dia: marcar um evento naquela data. Fica
                      atrás dos itens (z-0) para não engolir o clique deles —
                      botão dentro de botão não é HTML válido. */}
                  <button
                    type="button"
                    onClick={() => novoEvento(day)}
                    aria-label={`Marcar evento em ${format(day, "d 'de' MMMM", { locale: ptBR })}`}
                    title="Marcar evento neste dia"
                    className="absolute inset-0 z-0 transition-colors hover:bg-[var(--v2-surface-2)]"
                  />

                  <div className="pointer-events-none relative z-10">
                    <div className="mb-1">
                      <span
                        className={cn(
                          'v2-tabnum flex h-6 w-6 items-center justify-center rounded-full text-[12.5px]',
                          isToday ? 'font-bold' : 'font-medium',
                        )}
                        style={{
                          background: isToday ? 'var(--v2-accent)' : 'transparent',
                          color: isToday ? '#fff' : inMonth ? 'var(--v2-text)' : 'var(--v2-text-3)',
                        }}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>

                    <div className="pointer-events-auto space-y-1">
                      {dayItems.slice(0, 3).map((item) => {
                        const st = KIND_STYLE[item.kind]
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => item.eventId && setOpenId(item.eventId)}
                            disabled={!item.eventId}
                            title={item.subtitle ? `${item.title} — ${item.subtitle}` : item.title}
                            className="block w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium leading-tight transition-opacity hover:opacity-80 disabled:cursor-default"
                            style={{
                              background: st.filled ? item.space.color : item.space.soft,
                              color: st.filled ? '#fff' : item.space.color,
                              border: st.dashed ? `1px dashed ${item.space.color}` : '1px solid transparent',
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
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="v2-card divide-y overflow-hidden" style={{ borderColor: 'var(--v2-line)' }}>
          {monthItems.length === 0 ? (
            <EmptyState title="Nenhum compromisso neste mês" />
          ) : (
            monthItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => item.eventId && setOpenId(item.eventId)}
                disabled={!item.eventId}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-[var(--v2-surface-2)] disabled:cursor-default"
              >
                <div className="w-24 shrink-0">
                  <p className="v2-cap text-[12.5px] font-semibold" style={{ color: 'var(--v2-text)' }}>
                    {format(item.start, "EEE, d 'de' MMM", { locale: ptBR })}
                  </p>
                  <p className="v2-tabnum text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
                    {format(item.start, 'HH:mm')}
                  </p>
                </div>
                <span className="h-9 w-[3px] shrink-0 rounded-full" style={{ background: item.space.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium" style={{ color: 'var(--v2-text)' }}>
                    {item.title}
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-[12.5px]" style={{ color: 'var(--v2-text-3)' }}>
                    <SpaceDot space={item.space} />
                    {KIND_STYLE[item.kind].label}
                    {item.subtitle ? ` · ${item.subtitle}` : ''}
                  </p>
                </div>
                {item.value != null && (
                  <span className="v2-tabnum shrink-0 text-[13px] font-semibold" style={{ color: 'var(--v2-text)' }}>
                    {brl(item.value)}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {/* ── Legenda ───────────────────────────────────────────────────────── */}
      <div
        className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-[12px]"
        style={{ color: 'var(--v2-text-3)' }}
      >
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded" style={{ background: 'var(--v2-text-3)' }} /> Evento
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-3 w-5 rounded border"
            style={{ borderColor: 'var(--v2-text-3)', background: 'var(--v2-surface-2)' }}
          />{' '}
          Visita / serviço
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-3 w-5 rounded border border-dashed"
            style={{ borderColor: 'var(--v2-text-3)', background: 'var(--v2-surface-2)' }}
          />{' '}
          Data de interesse (sem sinal)
        </span>
        <span className="ml-auto hidden sm:block">Clique num evento para abrir o painel</span>
      </div>

      <EventDrawer eventId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
