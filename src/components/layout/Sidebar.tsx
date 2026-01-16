'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Users, Briefcase, CheckSquare, Home, Sparkles, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Calendário', href: '/', icon: Calendar, description: 'Visualize suas reservas' },
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3, description: 'Receitas e despesas' },
  { name: 'Espaços', href: '/spaces', icon: Home, description: 'Gerencie seus espaços' },
  { name: 'Clientes', href: '/clients', icon: Users, description: 'Cadastro de clientes' },
  { name: 'Profissionais', href: '/professionals', icon: Briefcase, description: 'Equipe de trabalho' },
  { name: 'Serviços', href: '/services', icon: CheckSquare, description: 'Tarefas operacionais' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-72 flex-col" style={{ background: 'var(--sidebar-bg)' }}>
      {/* Logo Section */}
      <div className="flex h-20 items-center gap-3 px-6 border-b border-white/10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
          <Sparkles className="h-5 w-5 text-indigo-300" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white">Gestor de Espaços</h1>
          <p className="text-xs text-indigo-300">Sistema de reservas</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-6">
        <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-wider text-indigo-300/70">
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
                  ? 'bg-white/15 text-white shadow-lg shadow-indigo-500/20 backdrop-blur-sm'
                  : 'text-indigo-200 hover:bg-white/10 hover:text-white'
              )}
            >
              <div className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-white/20 shadow-inner'
                  : 'bg-white/5 group-hover:bg-white/10'
              )}>
                <item.icon
                  className={cn(
                    'h-5 w-5 transition-colors duration-200',
                    isActive ? 'text-white' : 'text-indigo-300 group-hover:text-white'
                  )}
                  aria-hidden="true"
                />
              </div>
              <div className="flex-1">
                <span className="block">{item.name}</span>
                {isActive && (
                  <span className="text-xs text-indigo-300/80">{item.description}</span>
                )}
              </div>
              {isActive && (
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 mx-3 mb-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500">
            <span className="text-sm font-bold text-white">GE</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Gestão de Espaços</p>
            <p className="text-xs text-indigo-300">v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  )
}
