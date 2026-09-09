'use client'

// ── Painel lateral do evento ───────────────────────────────────────────────
// Substitui a navegação para /events/[id], que hoje é uma página tão longa que
// precisou de uma barra de âncoras para ser usável. Aqui o evento abre por cima
// da tela onde você já estava (agenda ou lista) — você consulta e fecha, sem
// perder o contexto.
//
// FASE A: só leitura. Tudo que grava leva para a versão atual, onde a ação
// existe de verdade. O valor exato já pago vem de loadEventDetail(), que usa a
// mesma regra da v1 (computeEventPaid) — as duas versões nunca mostram números
// diferentes para o mesmo evento.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  X,
  Users2,
  Clock3,
  MapPin,
  Phone,
  Mail,
  FileSignature,
  ExternalLink,
  MessageCircle,
  ArrowRight,
  Check,
  Lock,
} from 'lucide-react'
import { format } from 'date-fns'
import { loadEventDetail } from '@/lib/v2/data'
import { brl, brlExact } from '@/lib/v2/format'
import type { V2Event } from '@/lib/v2/types'
import { ContractPill, PaymentPill, Progress, Skeleton, SpaceTag, dayLabel, timeRange } from './ui'
import { Portal } from './Portal'

// O "próximo passo" transforma o estado do evento numa única frase acionável.
// É o que a v1 não diz em lugar nenhum: os dados estão todos lá, mas cabe ao
// usuário cruzar contrato + parcelas + data para descobrir o que fazer.
function nextStep(e: V2Event): { label: string; action: string; tone: string; soft: string } | null {
  if (e.contract === 'none') {
    return {
      label: 'Este evento ainda não tem contrato',
      action: 'Gerar contrato na versão atual',
      tone: 'var(--v2-violet)',
      soft: 'var(--v2-violet-soft)',
    }
  }
  if (e.contract === 'draft') {
    return {
      label: 'Contrato criado, mas ainda não enviado',
      action: 'Enviar para assinatura',
      tone: 'var(--v2-violet)',
      soft: 'var(--v2-violet-soft)',
    }
  }
  if (e.contract === 'sent' || e.contract === 'partial') {
    return {
      label:
        e.contract === 'partial'
          ? 'Contrato assinado só por uma das partes'
          : 'Contrato aguardando assinatura na Clicksign',
      action: 'Acompanhar assinaturas',
      tone: 'var(--v2-amber)',
      soft: 'var(--v2-amber-soft)',
    }
  }
  const vencida = e.installments?.find((i) => i.status !== 'paid' && i.dueDate < new Date())
  if (vencida) {
    return {
      label: `Parcela ${vencida.n}/${vencida.total} venceu em ${format(vencida.dueDate, 'dd/MM')}`,
      action: 'Registrar pagamento',
      tone: 'var(--v2-red)',
      soft: 'var(--v2-red-soft)',
    }
  }
  return null
}

function Row({ icon: Icon, children }: { icon: typeof Users2; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-[13.5px]" style={{ color: 'var(--v2-text-2)' }}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--v2-text-3)' }} />
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  )
}

function Block({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border-t px-5 py-4" style={{ borderColor: 'var(--v2-line)' }}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--v2-text-3)' }}>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

const onlyDigits = (s: string) => s.replace(/\D/g, '')

export function EventDrawer({ eventId, onClose }: { eventId: number | null; onClose: () => void }) {
  const [event, setEvent] = useState<V2Event | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (eventId == null) {
      setEvent(null)
      return
    }
    let alive = true
    setLoading(true)
    setEvent(null)
    loadEventDetail(eventId).then((data) => {
      if (!alive) return
      setEvent(data)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [eventId])

  useEffect(() => {
    if (eventId == null) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [eventId, onClose])

  if (eventId == null) return null

  const pct = event && event.value > 0 ? ((event.paid ?? 0) / event.value) * 100 : 0
  const step = event ? nextStep(event) : null

  return (
    <Portal>
      <div className="v2-vars fixed inset-0 z-[60]">
        <div className="v2-backdrop absolute inset-0 bg-[rgb(16_24_40/0.35)]" onClick={onClose} />

        <div
          className="v2-drawer-panel v2-scroll absolute inset-y-0 right-0 w-full max-w-[440px] overflow-y-auto"
          style={{ background: 'var(--v2-surface)', boxShadow: 'var(--v2-shadow-lg)' }}
          role="dialog"
          aria-modal="true"
          aria-label={event?.title ?? 'Evento'}
        >
          {/* Cabeçalho */}
          <div
            className="sticky top-0 z-10 border-b px-5 pb-4 pt-4"
            style={{ background: 'var(--v2-surface)', borderColor: 'var(--v2-line)' }}
          >
            <div className="mb-2 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {event ? (
                  <>
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      <SpaceTag space={event.space} />
                      <span className="v2-pill" style={{ background: 'var(--v2-surface-2)', color: 'var(--v2-text-2)' }}>
                        {event.type}
                      </span>
                    </div>
                    <h2
                      className="text-[19px] font-semibold leading-snug tracking-[-0.015em]"
                      style={{ color: 'var(--v2-text)' }}
                    >
                      {event.title}
                    </h2>
                  </>
                ) : (
                  <>
                    <Skeleton className="mb-2 h-4 w-32" />
                    <Skeleton className="h-5 w-56" />
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--v2-surface-2)]"
                aria-label="Fechar"
              >
                <X className="h-4.5 w-4.5" style={{ color: 'var(--v2-text-2)' }} />
              </button>
            </div>

            <div className="flex gap-2">
              {event?.client?.phone ? (
                <a
                  href={`https://wa.me/55${onlyDigits(event.client.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold text-white"
                  style={{ background: 'var(--v2-accent)' }}
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              ) : (
                <span
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-lg text-[13px] font-medium"
                  style={{ background: 'var(--v2-surface-2)', color: 'var(--v2-text-3)' }}
                >
                  Sem telefone
                </span>
              )}
              <Link
                href={`/events/${eventId}`}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium"
                style={{ borderColor: 'var(--v2-line-2)', color: 'var(--v2-text)' }}
                title="Abrir na versão atual, onde dá para editar"
              >
                <ExternalLink className="h-4 w-4" /> Abrir na v1
              </Link>
            </div>
          </div>

          {loading && (
            <div className="space-y-3 p-5">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {!loading && !event && (
            <p className="px-5 py-12 text-center text-[13.5px]" style={{ color: 'var(--v2-text-3)' }}>
              Não foi possível carregar este evento.
            </p>
          )}

          {event && (
            <>
              {step && (
                <div className="px-5 pt-4">
                  <div className="rounded-xl p-3.5" style={{ background: step.soft }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: step.tone }}>
                      Próximo passo
                    </p>
                    <p className="mt-1 text-[13.5px] font-medium" style={{ color: 'var(--v2-text)' }}>
                      {step.label}
                    </p>
                    <Link
                      href={`/events/${event.id}`}
                      className="mt-2.5 inline-flex items-center gap-1 text-[13px] font-semibold"
                      style={{ color: step.tone }}
                    >
                      {step.action} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Quando e onde */}
              <div className="space-y-2 px-5 py-4">
                <Row icon={Clock3}>
                  <span className="v2-cap font-medium" style={{ color: 'var(--v2-text)' }}>
                    {dayLabel(event.start)}
                  </span>
                  <br />
                  {timeRange(event.start, event.end)}
                </Row>
                {event.space.address && <Row icon={MapPin}>{event.space.address}</Row>}
                {event.guests != null && <Row icon={Users2}>{event.guests} convidados</Row>}
              </div>

              {/* Cliente */}
              <Block title="Cliente">
                {event.client ? (
                  <>
                    <p className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--v2-text)' }}>
                      {event.client.name}
                    </p>
                    <div className="space-y-1.5">
                      {event.client.phone && <Row icon={Phone}>{event.client.phone}</Row>}
                      {event.client.email && <Row icon={Mail}>{event.client.email}</Row>}
                      {event.client.city && <Row icon={MapPin}>{event.client.city}</Row>}
                    </div>
                  </>
                ) : (
                  <p className="text-[13.5px]" style={{ color: 'var(--v2-text-2)' }}>
                    Nenhum cliente vinculado a este evento.
                  </p>
                )}
              </Block>

              {/* Pagamento */}
              <Block title="Pagamento" action={<PaymentPill status={event.payment} />}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span
                    className="v2-tabnum text-[22px] font-semibold tracking-[-0.02em]"
                    style={{ color: 'var(--v2-text)' }}
                  >
                    {brlExact(event.paid ?? 0)}
                  </span>
                  <span className="text-[13px]" style={{ color: 'var(--v2-text-3)' }}>
                    de {brlExact(event.value)}
                  </span>
                </div>
                <Progress value={pct} tone={event.payment === 'paid' ? 'var(--v2-green)' : 'var(--v2-amber)'} />

                {event.installments && event.installments.length > 0 ? (
                  <ul className="mt-3.5 space-y-1">
                    {event.installments.map((i) => {
                      const paid = i.status === 'paid'
                      const late = !paid && i.dueDate < new Date()
                      return (
                        <li
                          key={i.id}
                          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px]"
                          style={{ background: late ? 'var(--v2-red-soft)' : 'transparent' }}
                        >
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                            style={{
                              background: paid ? 'var(--v2-green)' : late ? 'var(--v2-red)' : 'var(--v2-surface-3)',
                              color: paid || late ? '#fff' : 'var(--v2-text-2)',
                            }}
                          >
                            {paid ? <Check className="h-3 w-3" strokeWidth={3} /> : i.n}
                          </span>
                          <span className="flex-1" style={{ color: 'var(--v2-text-2)' }}>
                            {i.isSinal ? 'Sinal' : `Parcela ${i.n}/${i.total}`} · {format(i.dueDate, 'dd/MM/yy')}
                            {late && (
                              <strong className="ml-1.5" style={{ color: 'var(--v2-red)' }}>
                                em atraso
                              </strong>
                            )}
                          </span>
                          <span className="v2-tabnum font-medium" style={{ color: 'var(--v2-text)' }}>
                            {brl(i.paidAmount ?? i.amount)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="mt-3 text-[13px]" style={{ color: 'var(--v2-text-3)' }}>
                    Sem plano de parcelas cadastrado.
                  </p>
                )}
              </Block>

              {/* Contrato */}
              <Block title="Contrato" action={<ContractPill status={event.contract} />}>
                {event.contract === 'none' ? (
                  <p className="text-[13.5px]" style={{ color: 'var(--v2-text-2)' }}>
                    Nenhum contrato gerado para este evento.
                  </p>
                ) : (
                  <Row icon={FileSignature}>Modelo do {event.space.name}</Row>
                )}
                <Link
                  href={`/events/${event.id}`}
                  className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-medium"
                  style={{ borderColor: 'var(--v2-line-2)', color: 'var(--v2-text)' }}
                >
                  <FileSignature className="h-3.5 w-3.5" />
                  {event.contract === 'none' ? 'Gerar contrato na v1' : 'Ver contrato na v1'}
                </Link>
              </Block>

              {event.notes && (
                <Block title="Observações">
                  <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--v2-text-2)' }}>
                    {event.notes}
                  </p>
                </Block>
              )}

              <div className="flex items-start gap-2 px-5 py-4 text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  A versão 2.0 ainda é somente leitura. Para editar, registrar pagamento ou mexer no contrato, use
                  &ldquo;Abrir na v1&rdquo;.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  )
}
