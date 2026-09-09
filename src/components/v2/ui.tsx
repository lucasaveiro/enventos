'use client'

// ── Peças visuais compartilhadas da v2 ─────────────────────────────────────
// Pílulas de status, cabeçalho de seção e etiquetas de espaço. Tudo pequeno e
// sem estado — a ideia é que cada tela seja composta destas peças em vez de
// repetir markup, que é o que faz as telas atuais divergirem entre si.

import { format, isSameDay, isTomorrow, isToday, differenceInCalendarDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, Clock, AlertTriangle, FileText, PenLine, MinusCircle } from 'lucide-react'
import type { V2ContractStatus, V2PaymentStatus, V2Space } from '@/lib/v2/types'
import { cn } from '@/lib/utils'

// ── Status de pagamento ────────────────────────────────────────────────────
const PAYMENT: Record<V2PaymentStatus, { label: string; short: string; fg: string; bg: string; icon: typeof CheckCircle2 }> = {
  paid: { label: 'Pago', short: 'Pago', fg: 'var(--v2-green)', bg: 'var(--v2-green-soft)', icon: CheckCircle2 },
  partial: { label: 'Parcial', short: 'Parcial', fg: 'var(--v2-amber)', bg: 'var(--v2-amber-soft)', icon: Clock },
  unpaid: { label: 'Sem pagamento', short: 'Sem pgto.', fg: 'var(--v2-red)', bg: 'var(--v2-red-soft)', icon: AlertTriangle },
}

export function PaymentPill({ status, compact = false }: { status: V2PaymentStatus; compact?: boolean }) {
  const s = PAYMENT[status]
  const Icon = s.icon
  return (
    <span className="v2-pill" style={{ color: s.fg, background: s.bg }}>
      <Icon className="h-3 w-3" strokeWidth={2.4} />
      {compact ? s.short : s.label}
    </span>
  )
}

// ── Status do contrato ─────────────────────────────────────────────────────
const CONTRACT: Record<V2ContractStatus, { label: string; fg: string; bg: string; icon: typeof FileText }> = {
  none: { label: 'Sem contrato', fg: 'var(--v2-text-2)', bg: 'var(--v2-surface-2)', icon: MinusCircle },
  draft: { label: 'Rascunho', fg: 'var(--v2-text-2)', bg: 'var(--v2-surface-2)', icon: FileText },
  sent: { label: 'Aguardando assinatura', fg: 'var(--v2-amber)', bg: 'var(--v2-amber-soft)', icon: PenLine },
  partial: { label: 'Assinado em parte', fg: 'var(--v2-amber)', bg: 'var(--v2-amber-soft)', icon: PenLine },
  signed: { label: 'Assinado', fg: 'var(--v2-green)', bg: 'var(--v2-green-soft)', icon: CheckCircle2 },
}

export function ContractPill({ status }: { status: V2ContractStatus }) {
  const s = CONTRACT[status]
  const Icon = s.icon
  return (
    <span className="v2-pill" style={{ color: s.fg, background: s.bg }}>
      <Icon className="h-3 w-3" strokeWidth={2.4} />
      {s.label}
    </span>
  )
}

// ── Etiqueta do espaço ─────────────────────────────────────────────────────
export function SpaceTag({ space, dense = false }: { space: V2Space; dense?: boolean }) {
  return (
    <span className="v2-pill" style={{ color: space.color, background: space.soft }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: space.color }} />
      {dense ? space.short : space.name}
    </span>
  )
}

export function SpaceDot({ space, className }: { space: V2Space; className?: string }) {
  return (
    <span
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', className)}
      style={{ background: space.color }}
    />
  )
}

// ── Cabeçalho de seção ─────────────────────────────────────────────────────
// Substitui o bloco "caixa de ícone 48px + título + subtítulo" das telas
// atuais: mesma informação, um terço da altura.
export function SectionHeader({
  title,
  count,
  action,
}: {
  title: string
  count?: string | number
  action?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="v2-h2">
        {title}
        {count !== undefined && (
          <span className="ml-2 text-sm font-medium" style={{ color: 'var(--v2-text-3)' }}>
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  )
}

// ── Bloco de data (usado nas linhas de evento) ─────────────────────────────
export function DateBlock({ date, tone = 'neutral' }: { date: Date; tone?: 'neutral' | 'accent' }) {
  const accent = tone === 'accent'
  return (
    <div
      className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border"
      style={{
        borderColor: accent ? 'transparent' : 'var(--v2-line)',
        background: accent ? 'var(--v2-accent)' : 'var(--v2-surface-2)',
        color: accent ? '#fff' : 'var(--v2-text)',
      }}
    >
      <span className="text-[10px] font-semibold uppercase leading-none tracking-wide opacity-70">
        {format(date, 'MMM', { locale: ptBR }).replace('.', '')}
      </span>
      <span className="v2-tabnum text-lg font-semibold leading-tight">{format(date, 'd')}</span>
    </div>
  )
}

// ── Datas em linguagem natural ─────────────────────────────────────────────
export function relativeDay(date: Date): string {
  if (isToday(date)) return 'Hoje'
  if (isTomorrow(date)) return 'Amanhã'
  const diff = differenceInCalendarDays(date, new Date())
  if (diff > 0 && diff <= 7) return `Em ${diff} dias`
  if (diff < 0 && diff >= -7) return `Há ${Math.abs(diff)} dias`
  return format(date, "d 'de' MMMM", { locale: ptBR })
}

export function dayLabel(date: Date): string {
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR })
}

export function timeRange(start: Date, end: Date): string {
  return isSameDay(start, end)
    ? `${format(start, 'HH:mm')} às ${format(end, 'HH:mm')}`
    : `${format(start, 'HH:mm')} às ${format(end, 'HH:mm')} do dia seguinte`
}

// ── Barra de progresso fina ────────────────────────────────────────────────
export function Progress({ value, tone = 'var(--v2-green)' }: { value: number; tone?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--v2-surface-3)' }}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: tone }}
      />
    </div>
  )
}

// ── Botão-chip de filtro ───────────────────────────────────────────────────
export function FilterChip({
  active,
  onClick,
  children,
  dot,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  dot?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--v2-accent)] focus-visible:ring-offset-1',
      )}
      style={{
        borderColor: active ? 'var(--v2-text)' : 'var(--v2-line-2)',
        background: active ? 'var(--v2-text)' : 'var(--v2-surface)',
        color: active ? '#fff' : 'var(--v2-text-2)',
      }}
    >
      {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
      {children}
    </button>
  )
}

// ── Estados de carregamento e vazio ────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg', className)}
      style={{ background: 'var(--v2-surface-3)' }}
    />
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-[14px] font-medium" style={{ color: 'var(--v2-text)' }}>
        {title}
      </p>
      {hint && (
        <p className="mt-1 text-[13px]" style={{ color: 'var(--v2-text-3)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}

// ── Selo de somente leitura ────────────────────────────────────────────────
// Na Fase A a v2 não grava nada. Em vez de esconder as ações (o que faria
// parecer que a função não existe), elas aparecem desabilitadas com o motivo,
// e o caminho para executá-las de verdade é a v1.
export function ReadOnlyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
      {children}
    </p>
  )
}
