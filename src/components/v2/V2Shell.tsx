'use client'

// ── Casca do protótipo v2 ──────────────────────────────────────────────────
// Inspirada no painel de anfitrião do Airbnb:
//   • 5 destinos fixos, sem grupos escondidos e sem CTAs competindo na sidebar
//   • sidebar clara e estreita (236px) — a atual tem 288px e fundo carvão
//   • busca global sempre visível (Ctrl/Cmd + K)
//   • no celular a navegação vai para a base da tela (polegar), não no menu
//     hambúrguer, porque quem opera o espaço está de pé com o celular na mão

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Home,
  CalendarDays,
  PartyPopper,
  Wallet,
  Settings2,
  Search,
  Bell,
  Plus,
  LogOut,
  ArrowLeftRight,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CommandPalette } from './CommandPalette'
import { useEventForm } from './EventFormProvider'

type NavItem = { name: string; short: string; href: string; icon: LucideIcon }

const NAV: NavItem[] = [
  { name: 'Hoje', short: 'Hoje', href: '/v2', icon: Home },
  { name: 'Agenda', short: 'Agenda', href: '/v2/agenda', icon: CalendarDays },
  { name: 'Eventos', short: 'Eventos', href: '/v2/eventos', icon: PartyPopper },
  { name: 'Financeiro', short: 'Dinheiro', href: '/v2/financeiro', icon: Wallet },
  { name: 'Cadastros', short: 'Mais', href: '/v2/cadastros', icon: Settings2 },
]

export function V2Shell({
  children,
  pendingCount,
}: {
  children: React.ReactNode
  /** Mesma contagem que a tela "Hoje" mostra em "Precisa de você". Vem do
      layout (Server Component), junto com o HTML — antes era uma consulta a
      mais no navegador, refeita a cada carregamento. */
  pendingCount: number
}) {
  const pathname = usePathname()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { novoEvento } = useEventForm()

  const isActive = (href: string) => (href === '/v2' ? pathname === '/v2' : pathname.startsWith(href))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="v2-root flex min-h-screen">
      {/* ── Sidebar (desktop) ────────────────────────────────────────────── */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-[236px] flex-col border-r lg:flex"
        style={{ background: 'var(--v2-surface)', borderColor: 'var(--v2-line)' }}
      >
        <div className="flex h-16 items-center gap-2.5 px-5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-bold text-white"
            style={{ background: 'var(--v2-text)' }}
          >
            A
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-tight" style={{ color: 'var(--v2-text)' }}>
              Espaços Aveiro
            </p>
            <p className="text-[11px] leading-tight" style={{ color: 'var(--v2-text-3)' }}>
              Rancho · Estância
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-3">
          {NAV.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors"
                style={{
                  background: active ? 'var(--v2-surface-2)' : 'transparent',
                  color: active ? 'var(--v2-text)' : 'var(--v2-text-2)',
                }}
              >
                <item.icon
                  className="h-[18px] w-[18px]"
                  strokeWidth={active ? 2.3 : 1.9}
                  style={{ color: active ? 'var(--v2-accent)' : 'var(--v2-text-3)' }}
                />
                {item.name}
                {item.href === '/v2' && pendingCount > 0 && (
                  <span
                    className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={{ background: 'var(--v2-red-soft)', color: 'var(--v2-red)' }}
                  >
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t px-3 py-3" style={{ borderColor: 'var(--v2-line)' }}>
          <Link
            href="/"
            className="mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--v2-surface-2)]"
            style={{ color: 'var(--v2-text-2)' }}
            title="Voltar para a versão atual do sistema"
          >
            <ArrowLeftRight className="h-4 w-4" style={{ color: 'var(--v2-text-3)' }} />
            Voltar para a v1
          </Link>
          <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white"
              style={{ background: 'var(--v2-accent)' }}
            >
              LA
            </div>
            <span className="flex-1 truncate text-[13px] font-medium" style={{ color: 'var(--v2-text)' }}>
              Lucas Aveiro
            </span>
            <LogOut className="h-4 w-4" style={{ color: 'var(--v2-text-3)' }} />
          </div>
        </div>
      </aside>

      {/* ── Coluna de conteúdo ───────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-[236px]">
        {/* Barra superior */}
        <header
          className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-4 lg:h-16 lg:px-8"
          style={{ background: 'rgb(255 255 255 / 0.85)', borderColor: 'var(--v2-line)', backdropFilter: 'blur(8px)' }}
        >
          {/* Marca no mobile */}
          <div className="flex items-center gap-2 lg:hidden">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-bold text-white"
              style={{ background: 'var(--v2-text)' }}
            >
              A
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 flex-1 items-center gap-2 rounded-lg border px-3 text-left text-[13px] transition-colors lg:max-w-sm"
            style={{ borderColor: 'var(--v2-line-2)', background: 'var(--v2-surface)', color: 'var(--v2-text-3)' }}
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">Buscar evento, cliente...</span>
            <kbd
              className="hidden shrink-0 rounded border px-1.5 text-[10px] font-medium sm:block"
              style={{ borderColor: 'var(--v2-line-2)' }}
            >
              Ctrl K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--v2-surface-2)]"
              aria-label="Pendências"
            >
              <Bell className="h-[18px] w-[18px]" style={{ color: 'var(--v2-text-2)' }} />
              {pendingCount > 0 && (
                <span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2"
                  style={{ background: 'var(--v2-red)', ['--tw-ring-color' as string]: 'var(--v2-surface)' }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => novoEvento()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-white transition-colors"
              style={{ background: 'var(--v2-accent)' }}
              title="Criar evento, visita ou proposta"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">Novo evento</span>
            </button>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 px-4 pb-24 pt-5 lg:px-8 lg:pb-10 lg:pt-7">
          <div className="mx-auto w-full max-w-[1180px]">{children}</div>
        </main>
      </div>

      {/* ── Abas na base (mobile) ────────────────────────────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t lg:hidden"
        style={{ background: 'var(--v2-surface)', borderColor: 'var(--v2-line)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className="flex flex-1 flex-col items-center gap-1 py-2.5"
              style={{ color: active ? 'var(--v2-accent)' : 'var(--v2-text-3)' }}
            >
              <span className="relative">
                <item.icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.3 : 1.8} />
                {item.href === '/v2' && pendingCount > 0 && (
                  <span
                    className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full"
                    style={{ background: 'var(--v2-red)' }}
                  />
                )}
              </span>
              <span className={cn('text-[10px]', active && 'font-semibold')}>{item.short}</span>
            </Link>
          )
        })}
      </nav>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
