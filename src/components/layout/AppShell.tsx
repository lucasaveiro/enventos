'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, Sparkles } from 'lucide-react'
import { Sidebar } from './Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Trava o scroll do body quando o sidebar está aberto no mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  // Rotas sem layout (login, etc.) — renderiza apenas o conteúdo
  if (pathname === '/login') {
    return <>{children}</>
  }

  return (
    <div className="flex h-full">
      {/* ── Header Mobile (só visível em telas < lg) ──────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center gap-3 px-4 border-b border-white/10"
        style={{ background: 'var(--sidebar-bg)' }}>
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
          style={{ background: 'rgba(255,255,255,0.07)' }}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5 text-white/80" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            <Sparkles className="h-4 w-4 text-white/80" />
          </div>
          <span className="font-bold text-sm text-white">Gestor de Espaços</span>
        </div>
      </header>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── Conteúdo Principal ────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
