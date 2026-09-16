'use client'

// ── Hoje ───────────────────────────────────────────────────────────────────
// A tela que não existe na v1. Hoje o sistema abre no calendário do mês, que
// mostra tudo com o mesmo peso e não responde à única pergunta que importa às
// 8h da manhã: "o que eu preciso resolver?".
// Espelha o "Hoje" do painel de anfitrião do Airbnb: primeiro o que trava
// dinheiro ou contrato, depois o que vem pela frente.
//
// Só interatividade: os dados chegam prontos do Server Component em
// src/app/v2/page.tsx.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  PenLine,
  AlertTriangle,
  ClipboardList,
  FileQuestion,
  ArrowRight,
  ChevronRight,
  CalendarDays,
  TrendingUp,
  Lock,
  type LucideIcon,
} from 'lucide-react'
import { format, isSameDay, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { brl } from '@/lib/v2/format'
import type { V2AgendaItem, V2Event } from '@/lib/v2/types'
import type { V2Totals } from '@/lib/v2/screens'
import { EventDrawer } from '@/components/v2/EventDrawer'
import {
  ContractPill,
  DateBlock,
  EmptyState,
  PaymentPill,
  Progress,
  SectionHeader,
  SpaceDot,
  relativeDay,
} from '@/components/v2/ui'

type UnscheduledTask = {
  id: number
  name: string
  spaceName: string
  responsible: string | null
}

function AttentionCard({
  icon: Icon,
  value,
  label,
  detail,
  tone,
  soft,
  onClick,
}: {
  icon: LucideIcon
  value: string
  label: string
  detail: string
  tone: string
  soft: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="v2-card v2-card-hover group flex w-full items-start gap-3 p-4 text-left disabled:cursor-default"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: soft }}>
        <Icon className="h-[18px] w-[18px]" style={{ color: tone }} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="v2-tabnum block text-[19px] font-semibold leading-tight tracking-[-0.02em]"
          style={{ color: 'var(--v2-text)' }}
        >
          {value}
        </span>
        <span className="block text-[13px] font-medium" style={{ color: 'var(--v2-text)' }}>
          {label}
        </span>
        <span className="mt-0.5 block truncate text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
          {detail}
        </span>
      </span>
      {onClick && (
        <ChevronRight
          className="mt-0.5 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
          style={{ color: 'var(--v2-text-3)' }}
        />
      )}
    </button>
  )
}

function EventRow({ event, onOpen }: { event: V2Event; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-3.5 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-[var(--v2-surface-2)]"
    >
      <DateBlock date={event.start} tone={isSameDay(event.start, new Date()) ? 'accent' : 'neutral'} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold" style={{ color: 'var(--v2-text)' }}>
          {event.title}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12.5px]" style={{ color: 'var(--v2-text-3)' }}>
          <SpaceDot space={event.space} />
          {event.space.short} · {relativeDay(event.start)} · {format(event.start, 'HH:mm')}
          {event.guests != null && ` · ${event.guests} pessoas`}
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
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

export function HojeClient({
  events,
  todayItems,
  tasks,
  totals,
}: {
  events: V2Event[]
  todayItems: V2AgendaItem[]
  tasks: UnscheduledTask[]
  totals: V2Totals
}) {
  const [openId, setOpenId] = useState<number | null>(null)
  const now = useMemo(() => new Date(), [])

  const upcoming = useMemo(
    () => events.filter((e) => e.start >= now).sort((a, b) => +a.start - +b.start),
    [events, now],
  )
  const awaitingSignature = useMemo(
    () => events.filter((e) => e.contract === 'sent' || e.contract === 'partial'),
    [events],
  )
  const noContract = useMemo(
    () => upcoming.filter((e) => e.contract === 'none' || e.contract === 'draft'),
    [upcoming],
  )
  const monthEvents = useMemo(() => events.filter((e) => isSameMonth(e.start, now)), [events, now])
  const spaces = useMemo(() => {
    const map = new Map<number, { name: string; color: string; count: number }>()
    for (const e of monthEvents) {
      const cur = map.get(e.space.id) ?? { name: e.space.name, color: e.space.color, count: 0 }
      cur.count += 1
      map.set(e.space.id, cur)
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
  }, [monthEvents])

  const pendingTotal = awaitingSignature.length + totals.lateCount + tasks.length + noContract.length

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  })()

  return (
    <div className="v2-fade">
      <div className="mb-6">
        <h1 className="v2-h1">{greeting}, Lucas</h1>
        <p className="v2-cap mt-1 text-[14px]" style={{ color: 'var(--v2-text-2)' }}>
          {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      <SectionHeader title="Precisa de você" count={pendingTotal} />
      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AttentionCard
          icon={PenLine}
          value={String(awaitingSignature.length)}
          label="Aguardando assinatura"
          detail={
            awaitingSignature.map((e) => e.client?.name.split(' ')[0] ?? e.title).slice(0, 3).join(', ') ||
            'nada pendente'
          }
          tone="var(--v2-amber)"
          soft="var(--v2-amber-soft)"
          onClick={awaitingSignature.length ? () => setOpenId(awaitingSignature[0].id) : undefined}
        />
        <AttentionCard
          icon={AlertTriangle}
          value={brl(totals.lateTotal)}
          label="Parcelas em atraso"
          detail={`${totals.lateCount} ${totals.lateCount === 1 ? 'parcela vencida' : 'parcelas vencidas'}`}
          tone="var(--v2-red)"
          soft="var(--v2-red-soft)"
        />
        <AttentionCard
          icon={ClipboardList}
          value={String(tasks.length)}
          label="Serviços sem data"
          detail={tasks[0] ? `${tasks[0].name} · ${tasks[0].spaceName}` : 'nenhum'}
          tone="var(--v2-violet)"
          soft="var(--v2-violet-soft)"
        />
        <AttentionCard
          icon={FileQuestion}
          value={String(noContract.length)}
          label="Sem contrato fechado"
          detail="eventos futuros sem contrato"
          tone="var(--v2-accent)"
          soft="var(--v2-accent-soft)"
          onClick={noContract.length ? () => setOpenId(noContract[0].id) : undefined}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <SectionHeader
            title="Próximos eventos"
            action={
              <Link
                href="/v2/eventos"
                className="inline-flex items-center gap-1 text-[13px] font-semibold"
                style={{ color: 'var(--v2-accent)' }}
              >
                Ver todos <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="v2-card mb-8 p-1.5">
            {upcoming.length === 0 ? (
              <EmptyState title="Nenhum evento futuro" hint="Os próximos eventos aparecem aqui." />
            ) : (
              upcoming.slice(0, 6).map((e) => <EventRow key={e.id} event={e} onOpen={() => setOpenId(e.id)} />)
            )}
          </div>

          <SectionHeader title="Agenda de hoje" count={todayItems.length} />
          <div className="v2-card p-1.5">
            {todayItems.length === 0 ? (
              <EmptyState title="Nada marcado para hoje" />
            ) : (
              todayItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.eventId && setOpenId(item.eventId)}
                  disabled={!item.eventId}
                  className="flex w-full items-center gap-3.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--v2-surface-2)] disabled:cursor-default"
                >
                  <span className="v2-tabnum w-12 shrink-0 text-[13px] font-semibold" style={{ color: 'var(--v2-text-2)' }}>
                    {format(item.start, 'HH:mm')}
                  </span>
                  <span className="h-8 w-[3px] shrink-0 rounded-full" style={{ background: item.space.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium" style={{ color: 'var(--v2-text)' }}>
                      {item.title}
                    </span>
                    <span className="block truncate text-[12.5px]" style={{ color: 'var(--v2-text-3)' }}>
                      {item.subtitle}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="v2-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="v2-h2 v2-cap">{format(now, 'MMMM', { locale: ptBR })}</h2>
              <Link href="/v2/financeiro" className="text-[12.5px] font-semibold" style={{ color: 'var(--v2-accent)' }}>
                Financeiro
              </Link>
            </div>

            <p className="text-[12px] font-medium" style={{ color: 'var(--v2-text-3)' }}>
              Recebido
            </p>
            <p className="v2-num mb-1" style={{ color: 'var(--v2-text)' }}>
              {brl(totals.received)}
            </p>
            <Progress value={(totals.received / (totals.received + totals.toReceive || 1)) * 100} />
            <p className="mt-2 text-[12.5px]" style={{ color: 'var(--v2-text-2)' }}>
              Falta receber <strong style={{ color: 'var(--v2-amber)' }}>{brl(totals.toReceive)}</strong>
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4" style={{ borderColor: 'var(--v2-line)' }}>
              <div>
                <p className="text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
                  Despesas
                </p>
                <p className="v2-tabnum text-[16px] font-semibold" style={{ color: 'var(--v2-text)' }}>
                  {brl(totals.spent)}
                </p>
              </div>
              <div>
                <p className="text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
                  Saldo
                </p>
                <p
                  className="v2-tabnum text-[16px] font-semibold"
                  style={{ color: totals.received - totals.spent >= 0 ? 'var(--v2-green)' : 'var(--v2-red)' }}
                >
                  {brl(totals.received - totals.spent)}
                </p>
              </div>
            </div>
          </div>

          <div className="v2-card p-5">
            <h2 className="v2-h2 mb-3">Eventos do mês</h2>
            {spaces.length === 0 ? (
              <p className="text-[13px]" style={{ color: 'var(--v2-text-3)' }}>
                Nenhum evento neste mês.
              </p>
            ) : (
              spaces.map((s) => (
                <div key={s.name} className="mb-3 last:mb-0">
                  <div className="mb-1.5 flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--v2-text-2)' }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </span>
                    <span className="v2-tabnum font-semibold" style={{ color: 'var(--v2-text)' }}>
                      {s.count} evento{s.count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <Progress value={(s.count / monthEvents.length) * 100} tone={s.color} />
                </div>
              ))
            )}
            <Link
              href="/v2/agenda"
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold"
              style={{ color: 'var(--v2-accent)' }}
            >
              <CalendarDays className="h-4 w-4" /> Abrir agenda
            </Link>
          </div>

          <div className="v2-card p-5">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: 'var(--v2-green)' }} />
              <h2 className="v2-h2">Já contratado</h2>
            </div>
            <p className="v2-num" style={{ color: 'var(--v2-text)' }}>
              {brl(upcoming.reduce((s, e) => s + e.value, 0))}
            </p>
            <p className="mt-1 text-[12.5px]" style={{ color: 'var(--v2-text-2)' }}>
              em {upcoming.length} evento{upcoming.length === 1 ? '' : 's'} ainda por acontecer
            </p>
          </div>

          <div className="flex items-start gap-2 px-1 text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Versão 2.0 em teste. Eventos e clientes já se cadastram por aqui; parcelas, lançamentos e
              contratos ainda acontecem na versão atual. Os dados são os mesmos, em tempo real.
            </span>
          </div>
        </div>
      </div>

      <EventDrawer eventId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
