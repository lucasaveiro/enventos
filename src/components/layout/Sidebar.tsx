'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Users, Briefcase, CheckSquare, Home, Sparkles, BarChart3, Wallet, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Calendário', href: '/', icon: Calendar, description: 'Visualize suas reservas' },
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3, description: 'Receitas e despesas' },
  { name: 'Financeiro', href: '/financial', icon: Wallet, description: 'Planilha e previsões' },
  { name: 'Espaços', href: '/spaces', icon: Home, description: 'Gerencie seus espaços' },
  { name: 'Clientes', href: '/clients', icon: Users, description: 'Cadastro de clientes' },
  { name: 'Profissionais', href: '/professionals', icon: Briefcase, description: 'Equipe de trabalho' },
  { name: 'Serviços', href: '/services', icon: CheckSquare, description: 'Tarefas operacionais' },
  { name: 'Contratos', href: '/contracts', icon: FileText, description: 'Geração de contratos PDF' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-72 flex-col" style={{ background: 'var(--sidebar-bg)' }}>
      {/* Logo Section */}
      <div className="flex h-20 items-center gap-3 px-6 border-b border-white/10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
          <Sparkles className="h-5 w-5" style={{ color: 'var(--sidebar-text)' }} />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white">Gestor de Espaços</h1>
          <p className="text-xs" style={{ color: 'var(--sidebar-text-muted)' }}>Sistema de reservas</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-6">
        <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sidebar-text-muted)' }}>
          Menu Principal
        </p>
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'shadow-sm'
                  : ''
              )}
              style={{
                background: isActive ? 'var(--sidebar-active)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--sidebar-text)',
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)'
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200"
                style={{ background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)' }}
              >
                <item.icon
                  className="h-5 w-5 transition-colors duration-200"
                  style={{ color: isActive ? '#ffffff' : 'var(--sidebar-text-muted)' }}
                  aria-hidden="true"
                />
              </div>
              <div className="flex-1">
                <span className="block">{item.name}</span>
                {isActive && (
                  <span className="text-xs" style={{ color: 'var(--sidebar-text-muted)' }}>{item.description}</span>
                )}
              </div>
              {isActive && (
                <div className="h-2 w-2 rounded-full bg-green-500 opacity-80" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 mx-3 mb-4 rounded-xl border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
            <span className="text-sm font-bold text-white">GE</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Gestão de Espaços</p>
            <p className="text-xs" style={{ color: 'var(--sidebar-text-muted)' }}>v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  )
}
