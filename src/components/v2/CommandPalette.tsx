'use client'

// ── Busca global (Ctrl/Cmd + K) ────────────────────────────────────────────
// Hoje, achar um cliente ou um evento exige ir na página certa e filtrar. Aqui
// qualquer coisa é alcançável de qualquer tela, digitando. Também é onde ficam
// as ações rápidas ("Novo evento", "Gerar contrato"), tirando peso da sidebar.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  CalendarDays,
  Users,
  Wallet,
  FileSignature,
  Home,
  Plus,
  CornerDownLeft,
  type LucideIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EVENTS, SPACES, brl } from '@/lib/v2/mock'
import { Portal } from './Portal'

type Row = {
  id: string
  group: 'Ações' | 'Ir para' | 'Eventos' | 'Clientes'
  icon: LucideIcon
  label: string
  hint?: string
  href: string
  color?: string
}

const NAV_ROWS: Row[] = [
  { id: 'n1', group: 'Ir para', icon: Home, label: 'Hoje', href: '/v2' },
  { id: 'n2', group: 'Ir para', icon: CalendarDays, label: 'Agenda', href: '/v2/agenda' },
  { id: 'n3', group: 'Ir para', icon: CalendarDays, label: 'Eventos', href: '/v2/eventos' },
  { id: 'n4', group: 'Ir para', icon: Wallet, label: 'Financeiro', href: '/v2/financeiro' },
  { id: 'n5', group: 'Ir para', icon: Users, label: 'Cadastros', href: '/v2/cadastros' },
]

const ACTION_ROWS: Row[] = [
  { id: 'a1', group: 'Ações', icon: Plus, label: 'Novo evento', hint: 'cria e já abre o contrato', href: '/v2/eventos?novo=1' },
  { id: 'a2', group: 'Ações', icon: FileSignature, label: 'Gerar contrato', hint: 'a partir de um evento', href: '/v2/eventos?contrato=1' },
  { id: 'a3', group: 'Ações', icon: Wallet, label: 'Lançar receita ou despesa', href: '/v2/financeiro?novo=1' },
]

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const rows = useMemo<Row[]>(() => {
    const term = q.trim().toLowerCase()

    const eventRows: Row[] = EVENTS.map((e) => ({
      id: `e${e.id}`,
      group: 'Eventos' as const,
      icon: CalendarDays,
      label: e.title,
      hint: `${format(e.start, "d 'de' MMM", { locale: ptBR })} · ${SPACES[e.space].name} · ${brl(e.value)}`,
      href: `/v2/eventos?id=${e.id}`,
      color: SPACES[e.space].color,
    }))

    const clientRows: Row[] = EVENTS.map((e) => ({
      id: `c${e.id}`,
      group: 'Clientes' as const,
      icon: Users,
      label: e.client.name,
      hint: `${e.client.phone} · ${e.client.city}`,
      href: `/v2/eventos?id=${e.id}`,
    }))

    const all = [...ACTION_ROWS, ...NAV_ROWS, ...eventRows, ...clientRows]
    if (!term) return [...ACTION_ROWS, ...NAV_ROWS, ...eventRows.slice(0, 4)]

    return all
      .filter((r) => `${r.label} ${r.hint ?? ''}`.toLowerCase().includes(term))
      .slice(0, 12)
  }, [q])

  useEffect(() => {
    setCursor(0)
  }, [q])

  useEffect(() => {
    if (open) {
      setQ('')
      setCursor(0)
      // Espera o painel montar para focar sem roubar o scroll da página
      const t = setTimeout(() => inputRef.current?.focus(), 20)
      return () => clearTimeout(t)
    }
  }, [open])

  if (!open) return null

  const go = (row: Row) => {
    onClose()
    router.push(row.href)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => (c + 1) % Math.max(1, rows.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => (c - 1 + rows.length) % Math.max(1, rows.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (rows[cursor]) go(rows[cursor])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  let lastGroup = ''

  return (
    <Portal>
      <div className="v2-vars fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
      <div className="v2-backdrop absolute inset-0 bg-[rgb(16_24_40/0.4)] backdrop-blur-[2px]" onClick={onClose} />

      <div
        className="v2-fade relative w-full max-w-xl overflow-hidden rounded-2xl"
        style={{ background: 'var(--v2-surface)', boxShadow: 'var(--v2-shadow-lg)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Busca global"
      >
        <div className="flex items-center gap-3 border-b px-4" style={{ borderColor: 'var(--v2-line)' }}>
          <Search className="h-4.5 w-4.5 shrink-0" style={{ color: 'var(--v2-text-3)' }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar evento, cliente ou ação..."
            className="h-14 w-full bg-transparent text-[15px] outline-none"
            style={{ color: 'var(--v2-text)' }}
          />
          <kbd
            className="hidden rounded-md border px-1.5 py-0.5 text-[11px] font-medium sm:block"
            style={{ borderColor: 'var(--v2-line-2)', color: 'var(--v2-text-3)' }}
          >
            esc
          </kbd>
        </div>

        <div className="v2-scroll max-h-[52vh] overflow-y-auto p-2">
          {rows.length === 0 && (
            <p className="px-3 py-8 text-center text-sm" style={{ color: 'var(--v2-text-3)' }}>
              Nada encontrado para “{q}”.
            </p>
          )}

          {rows.map((row, i) => {
            const showGroup = row.group !== lastGroup
            lastGroup = row.group
            const active = i === cursor
            const Icon = row.icon
            return (
              <div key={row.id}>
                {showGroup && (
                  <p
                    className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--v2-text-3)' }}
                  >
                    {row.group}
                  </p>
                )}
                <button
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(row)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
                  style={{ background: active ? 'var(--v2-surface-2)' : 'transparent' }}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                    style={{ background: row.color ? `${row.color}1a` : 'var(--v2-surface-3)' }}
                  >
                    <Icon className="h-4 w-4" style={{ color: row.color ?? 'var(--v2-text-2)' }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium" style={{ color: 'var(--v2-text)' }}>
                      {row.label}
                    </span>
                    {row.hint && (
                      <span className="block truncate text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
                        {row.hint}
                      </span>
                    )}
                  </span>
                  {active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--v2-text-3)' }} />}
                </button>
              </div>
            )
          })}
        </div>
        </div>
      </div>
    </Portal>
  )
}
