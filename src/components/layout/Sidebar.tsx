'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Calendar,
  CalendarDays,
  Users,
  Briefcase,
  CheckSquare,
  Home,
  Sparkles,
  Wallet,
  LogOut,
  FilePlus2,
  Settings,
  ChevronDown,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Estrutura de navegação ────────────────────────────────────────────────
// A navegação foi reagrupada de 10 itens planos para 5 grupos seguindo o
// modelo mental de quem usa o sistema:
//   1. Agenda        — calendário de reservas (antiga "Calendário")
//   2. Eventos       — gerenciamento de eventos
//   3. Financeiro    — grupo (Resumo, Lançamentos, Vencimentos)
//   4. Clientes      — cadastro e datas de interesse
//   5. Configurações — grupo (Espaços, Profissionais, Serviços)
// O acesso a contratos continua via botão "Novo Contrato Fechado" (acima) e
// pela página de cada Evento ("Gerar Contrato").

type NavLeaf = {
  name: string
  href: string
  icon: LucideIcon
  description?: string
  /** Prefixos extras de rota que também marcam este item como ativo. */
  matchPrefixes?: string[]
}

type NavItem =
  | ({ type: 'link' } & NavLeaf)
  | {
      type: 'group'
      name: string
      icon: LucideIcon
      description: string
      children: NavLeaf[]
    }

const navigation: NavItem[] = [
  { type: 'link', name: 'Agenda', href: '/', icon: Calendar, description: 'Calendário de reservas' },
  { type: 'link', name: 'Eventos', href: '/events', icon: CalendarDays, description: 'Gerenciamento de eventos' },
  {
    type: 'link',
    name: 'Financeiro',
    href: '/dashboard',
    icon: Wallet,
    description: 'Resumo, lançamentos e vencimentos',
    matchPrefixes: ['/dashboard', '/financial', '/financeiro'],
  },
  { type: 'link', name: 'Clientes', href: '/clients', icon: Users, description: 'Cadastro e datas de interesse' },
  {
    type: 'group',
    name: 'Configurações',
    icon: Settings,
    description: 'Espaços, equipe e serviços',
    children: [
      { name: 'Espaços', href: '/spaces', icon: Home },
      { name: 'Profissionais', href: '/professionals', icon: Briefcase },
      { name: 'Serviços', href: '/services', icon: CheckSquare },
    ],
  },
]

interface SidebarProps {
  /** Controla se o sidebar está aberto no mobile */
  isOpen?: boolean
  /** Callback para fechar o sidebar no mobile */
  onClose?: () => void
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  // Estado de expansão manual dos grupos. Quando indefinido, o grupo segue o
  // padrão "abre se contém a rota ativa".
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const handleLinkClick = () => {
    // Fecha o sidebar ao navegar no mobile
    onClose?.()
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href))

  const groupHasActive = (children: NavLeaf[]) => children.some((c) => isActive(c.href))

  const toggleGroup = (name: string, currentlyOpen: boolean) =>
    setOpenGroups((prev) => ({ ...prev, [name]: !currentlyOpen }))

  // ── Renderiza um link (de topo ou filho de grupo) ────────────────────────
  const renderLeaf = (item: NavLeaf, isChild = false) => {
    const active =
      isActive(item.href) ||
      (item.matchPrefixes?.some((p) => pathname === p || pathname.startsWith(p)) ?? false)
    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={handleLinkClick}
        className={cn(
          'group flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-200',
          isChild ? 'py-2.5' : 'py-3',
          active ? 'shadow-sm' : ''
        )}
        style={{
          background: active ? 'var(--sidebar-active)' : 'transparent',
          color: active ? '#ffffff' : 'var(--sidebar-text)',
        }}
        onMouseEnter={(e) => {
          if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)'
        }}
        onMouseLeave={(e) => {
          if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
        }}
      >
        <div
          className={cn(
            'flex items-center justify-center rounded-lg transition-all duration-200',
            isChild ? 'h-7 w-7' : 'h-9 w-9'
          )}
          style={{ background: active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)' }}
        >
          <item.icon
            className={cn('transition-colors duration-200', isChild ? 'h-4 w-4' : 'h-5 w-5')}
            style={{ color: active ? '#ffffff' : 'var(--sidebar-text-muted)' }}
            aria-hidden="true"
          />
        </div>
        <div className="flex-1 min-w-0">
          <span className="block">{item.name}</span>
          {active && item.description && (
            <span className="text-xs" style={{ color: 'var(--sidebar-text-muted)' }}>{item.description}</span>
          )}
        </div>
        {active && <div className="h-2 w-2 rounded-full bg-green-500 opacity-80 shrink-0" />}
      </Link>
    )
  }

  return (
    <>
      {/* ── Backdrop (mobile only) ──────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* ── Painel do Sidebar ───────────────────────────────────────────── */}
      <div
        className={cn(
          // Posição: fixo no mobile (overlay), relativo no desktop (inline)
          'fixed top-0 left-0 z-50 flex h-full w-72 flex-col transition-transform duration-300 ease-in-out',
          'lg:relative lg:translate-x-0 lg:z-auto',
          // Slide: entra da esquerda no mobile
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {/* Logo Section */}
        <div className="flex h-16 lg:h-20 items-center gap-3 px-6 border-b border-white/10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Sparkles className="h-5 w-5" style={{ color: 'var(--sidebar-text)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg text-white">Gestor de Espaços</h1>
            <p className="text-xs" style={{ color: 'var(--sidebar-text-muted)' }}>Sistema de reservas</p>
          </div>
          {/* Botão fechar (mobile only) */}
          <button
            onClick={onClose}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)' }}
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4 text-white/70" />
          </button>
        </div>

        {/* New Contract Button */}
        <div className="px-3 pt-4">
          <Link
            href="/contracts/new"
            onClick={handleLinkClick}
            className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md"
          >
            <FilePlus2 className="h-5 w-5" />
            Novo Contrato Fechado
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-6 overflow-y-auto">
          <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sidebar-text-muted)' }}>
            Menu Principal
          </p>
          {navigation.map((item) => {
            if (item.type === 'link') {
              return renderLeaf(item)
            }

            // ── Grupo expansível ──────────────────────────────────────────
            const hasActive = groupHasActive(item.children)
            const open = openGroups[item.name] ?? hasActive
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleGroup(item.name, open)}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200"
                  style={{
                    background: 'transparent',
                    color: hasActive ? '#ffffff' : 'var(--sidebar-text)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)'
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                  aria-expanded={open}
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200"
                    style={{ background: hasActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)' }}
                  >
                    <item.icon
                      className="h-5 w-5 transition-colors duration-200"
                      style={{ color: hasActive ? '#ffffff' : 'var(--sidebar-text-muted)' }}
                      aria-hidden="true"
                    />
                  </div>
                  <span className="flex-1 text-left">{item.name}</span>
                  <ChevronDown
                    className={cn('h-4 w-4 shrink-0 transition-transform duration-200', open && 'rotate-180')}
                    style={{ color: 'var(--sidebar-text-muted)' }}
                    aria-hidden="true"
                  />
                </button>

                {open && (
                  <div className="mt-1 mb-1 ml-5 space-y-1 border-l border-white/10 pl-2">
                    {item.children.map((child) => renderLeaf(child, true))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 mx-3 mb-4 rounded-xl border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 shrink-0">
              <span className="text-sm font-bold text-white">GE</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Gestão de Espaços</p>
              <p className="text-xs" style={{ color: 'var(--sidebar-text-muted)' }}>v1.0.0</p>
            </div>
            <button
              onClick={async () => {
                await fetch('/api/auth/login', { method: 'DELETE' })
                window.location.href = '/login'
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
              title="Sair"
              aria-label="Sair do sistema"
            >
              <LogOut className="h-4 w-4 text-white/60" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
