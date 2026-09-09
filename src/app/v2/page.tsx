'use client'

// ── Hoje ───────────────────────────────────────────────────────────────────
// A tela que não existe na v1. Hoje o sistema abre no calendário do mês, que
// mostra tudo com o mesmo peso e não responde à única pergunta que importa às
// 8h da manhã: "o que eu preciso resolver?".
// Espelha o "Hoje" do painel de anfitrião do Airbnb: primeiro o que trava
// dinheiro ou contrato, depois o que vem pela frente.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  PenLine,
  AlertTriangle,
  ClipboardCheck,
  Send,
  ArrowRight,
  ChevronRight,
  CalendarDays,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { format, isSameDay, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  EVENTS,
  LEDGER,
  AGENDA_EXTRAS,
  SPACES,
  brl,
  today,
  type V2Event,
} from '@/lib/v2/mock'
import { EventDrawer } from '@/components/v2/EventDrawer'
import {
  ContractPill,
  DateBlock,
  PaymentPill,
  Progress,
  SectionHeader,
  SpaceDot,
  relativeDay,
} from '@/components/v2/ui'

// ── Cartão de pendência ────────────────────────────────────────────────────
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
      className="v2-card v2-card-hover group flex w-full items-start gap-3 p-4 text-left"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: soft }}>
        <Icon className="h-[18px] w-[18px]" style={{ color: tone }} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="v2-tabnum block text-[19px] font-semibold leading-tight tracking-[-0.02em]" style={{ color: 'var(--v2-text)' }}>
          {value}
        </span>
        <span className="block text-[13px] font-medium" style={{ color: 'var(--v2-text)' }}>
          {label}
        </span>
        <span className="mt-0.5 block truncate text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
          {detail}
        </span>
      </span>
      <ChevronRight
        className="mt-0.5 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
        style={{ color: 'var(--v2-text-3)' }}
      />
    </button>
  )
}

// ── Linha de evento ────────────────────────────────────────────────────────
function EventRow({ event, onOpen }: { event: V2Event; onOpen: () => void }) {
  const soon = relativeDay(event.start)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-3.5 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-[var(--v2-surface-2)]"
    >
      <DateBlock date={event.start} tone={isSameDay(event.start, today()) ? 'accent' : 'neutral'} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold" style={{ color: 'var(--v2-text)' }}>
          {event.title}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12.5px]" style={{ color: 'var(--v2-text-3)' }}>
          <SpaceDot space={event.space} />
          {SPACES[event.space].short} · {soon} · {format(event.start, 'HH:mm')} · {event.guests} pessoas
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
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

export default function HojePage() {
  const [selected, setSelected] = useState<V2Event | null>(null)
  const now = today()

  const data = useMemo(() => {
    const upcoming = EVENTS.filter((e) => e.start >= now).sort((a, b) => +a.start - +b.start)

    const awaitingSignature = EVENTS.filter((e) => e.contract === 'sent' || e.contract === 'partial')

    const overdue = EVENTS.flatMap((e) =>
      e.installments.filter((i) => !i.paidAt && i.dueDate < now).map((i) => ({ event: e, inst: i })),
    )
    const overdueTotal = overdue.reduce((s, o) => s + o.inst.amount, 0)

    const inspections = EVENTS.filter((e) => e.stage === 'realizado' && e.notes?.includes('Vistoria'))

    const proposals = EVENTS.filter((e) => e.stage === 'proposta' || e.stage === 'visita' || e.stage === 'interesse')

    const monthLedger = LEDGER.filter((l) => isSameMonth(l.date, now))
    const received = monthLedger.filter((l) => l.kind === 'income' && l.status === 'paid').reduce((s, l) => s + l.amount, 0)
    const toReceive = monthLedger.filter((l) => l.kind === 'income' && l.status === 'pending').reduce((s, l) => s + l.amount, 0)
    const spent = monthLedger.filter((l) => l.kind === 'expense' && l.status === 'paid').reduce((s, l) => s + l.amount, 0)

    const monthEvents = EVENTS.filter((e) => isSameMonth(e.start, now))

    const todayItems = [
      ...AGENDA_EXTRAS.filter((a) => isSameDay(a.start, now)),
      ...EVENTS.filter((e) => isSameDay(e.start, now)).map((e) => ({
        id: `e${e.id}`,
        kind: 'evento' as const,
        title: e.title,
        subtitle: `${e.guests} convidados`,
        space: e.space,
        start: e.start,
        end: e.end,
        eventId: e.id,
      })),
    ].sort((a, b) => +a.start - +b.start)

    return {
      upcoming,
      awaitingSignature,
      overdue,
      overdueTotal,
      inspections,
      proposals,
      received,
      toReceive,
      spent,
      monthEvents,
      todayItems,
    }
  }, [now])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  })()

  const openEvent = (id?: number) => {
    const e = EVENTS.find((x) => x.id === id)
    if (e) setSelected(e)
  }

  return (
    <div className="v2-fade">
      {/* Saudação */}
      <div className="mb-6">
        <h1 className="v2-h1">{greeting}, Lucas</h1>
        <p className="v2-cap mt-1 text-[14px]" style={{ color: 'var(--v2-text-2)' }}>
          {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* ── Precisa de você ───────────────────────────────────────────────── */}
      <SectionHeader
        title="Precisa de você"
        count={data.awaitingSignature.length + data.overdue.length + data.inspections.length + data.proposals.length}
      />
      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AttentionCard
          icon={PenLine}
          value={String(data.awaitingSignature.length)}
          label="Aguardando assinatura"
          detail={data.awaitingSignature.map((e) => e.client.name.split(' ')[0]).join(', ') || 'nada pendente'}
          tone="var(--v2-amber)"
          soft="var(--v2-amber-soft)"
          onClick={() => setSelected(data.awaitingSignature[0] ?? null)}
        />
        <AttentionCard
          icon={AlertTriangle}
          value={brl(data.overdueTotal)}
          label="Parcelas em atraso"
          detail={`${data.overdue.length} parcela${data.overdue.length === 1 ? '' : 's'} de ${new Set(data.overdue.map((o) => o.event.id)).size} evento(s)`}
          tone="var(--v2-red)"
          soft="var(--v2-red-soft)"
          onClick={() => setSelected(data.overdue[0]?.event ?? null)}
        />
        <AttentionCard
          icon={ClipboardCheck}
          value={String(data.inspections.length)}
          label="Vistoria pendente"
          detail={data.inspections[0]?.title ?? 'nenhuma'}
          tone="var(--v2-violet)"
          soft="var(--v2-violet-soft)"
          onClick={() => setSelected(data.inspections[0] ?? null)}
        />
        <AttentionCard
          icon={Send}
          value={String(data.proposals.length)}
          label="Propostas em aberto"
          detail="sem contrato fechado"
          tone="var(--v2-accent)"
          soft="var(--v2-accent-soft)"
          onClick={() => setSelected(data.proposals[0] ?? null)}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* ── Coluna principal ───────────────────────────────────────────── */}
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
          <div className="v2-card mb-8 divide-y p-1.5" style={{ borderColor: 'var(--v2-line)' }}>
            {data.upcoming.slice(0, 6).map((e) => (
              <EventRow key={e.id} event={e} onOpen={() => setSelected(e)} />
            ))}
          </div>

          <SectionHeader title="Agenda de hoje" count={data.todayItems.length} />
          <div className="v2-card p-1.5">
            {data.todayItems.length === 0 ? (
              <p className="px-3 py-8 text-center text-[13.5px]" style={{ color: 'var(--v2-text-3)' }}>
                Nada marcado para hoje.
              </p>
            ) : (
              data.todayItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openEvent(item.eventId)}
                  className="flex w-full items-center gap-3.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--v2-surface-2)]"
                >
                  <span
                    className="v2-tabnum w-12 shrink-0 text-[13px] font-semibold"
                    style={{ color: 'var(--v2-text-2)' }}
                  >
                    {format(item.start, 'HH:mm')}
                  </span>
                  <span
                    className="h-8 w-[3px] shrink-0 rounded-full"
                    style={{ background: SPACES[item.space].color }}
                  />
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

        {/* ── Coluna lateral ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="v2-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="v2-h2 v2-cap">{format(now, 'MMMM', { locale: ptBR })}</h2>
              <Link
                href="/v2/financeiro"
                className="text-[12.5px] font-semibold"
                style={{ color: 'var(--v2-accent)' }}
              >
                Financeiro
              </Link>
            </div>

            <p className="text-[12px] font-medium" style={{ color: 'var(--v2-text-3)' }}>
              Recebido
            </p>
            <p className="v2-num mb-1" style={{ color: 'var(--v2-text)' }}>
              {brl(data.received)}
            </p>
            <Progress value={(data.received / (data.received + data.toReceive || 1)) * 100} />
            <p className="mt-2 text-[12.5px]" style={{ color: 'var(--v2-text-2)' }}>
              Falta receber <strong style={{ color: 'var(--v2-amber)' }}>{brl(data.toReceive)}</strong> este mês
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4" style={{ borderColor: 'var(--v2-line)' }}>
              <div>
                <p className="text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
                  Despesas
                </p>
                <p className="v2-tabnum text-[16px] font-semibold" style={{ color: 'var(--v2-text)' }}>
                  {brl(data.spent)}
                </p>
              </div>
              <div>
                <p className="text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
                  Saldo
                </p>
                <p className="v2-tabnum text-[16px] font-semibold" style={{ color: 'var(--v2-green)' }}>
                  {brl(data.received - data.spent)}
                </p>
              </div>
            </div>
          </div>

          <div className="v2-card p-5">
            <h2 className="v2-h2 mb-3">Ocupação</h2>
            {(Object.keys(SPACES) as (keyof typeof SPACES)[]).map((slug) => {
              const count = data.monthEvents.filter((e) => e.space === slug).length
              const total = data.monthEvents.length || 1
              return (
                <div key={slug} className="mb-3 last:mb-0">
                  <div className="mb-1.5 flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--v2-text-2)' }}>
                      <SpaceDot space={slug} />
                      {SPACES[slug].name}
                    </span>
                    <span className="v2-tabnum font-semibold" style={{ color: 'var(--v2-text)' }}>
                      {count} evento{count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <Progress value={(count / total) * 100} tone={SPACES[slug].color} />
                </div>
              )
            })}
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
              {brl(EVENTS.filter((e) => e.start >= now).reduce((s, e) => s + e.value, 0))}
            </p>
            <p className="mt-1 text-[12.5px]" style={{ color: 'var(--v2-text-2)' }}>
              em {data.upcoming.length} eventos futuros, dos quais{' '}
              {brl(EVENTS.filter((e) => e.start >= now).reduce((s, e) => s + e.paid, 0))} já entraram no caixa
            </p>
          </div>
        </div>
      </div>

      <EventDrawer event={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
