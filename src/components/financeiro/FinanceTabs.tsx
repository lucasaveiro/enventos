'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Receipt, CalendarClock, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Abas da área Financeiro ────────────────────────────────────────────────
// Unifica as três telas de dinheiro numa única navegação por abas, sem alterar
// o conteúdo nem a lógica de cada página:
//   • Resumo      → /dashboard            (visão geral, KPIs e gráficos)
//   • Lançamentos → /financial            (planilha de receitas e despesas)
//   • Vencimentos → /financeiro/calendario(calendário de parcelas)
// Cada aba continua sendo sua própria rota — por isso a navegação é não
// destrutiva e totalmente reversível.

type FinanceTab = {
  name: string
  href: string
  icon: LucideIcon
  /** Prefixo de rota que mantém a aba destacada (inclui subpáginas). */
  match: string
}

const tabs: FinanceTab[] = [
  { name: 'Resumo', href: '/dashboard', icon: BarChart3, match: '/dashboard' },
  { name: 'Lançamentos', href: '/financial', icon: Receipt, match: '/financial' },
  { name: 'Vencimentos', href: '/financeiro/calendario', icon: CalendarClock, match: '/financeiro' },
]

export function FinanceTabs() {
  const pathname = usePathname()

  return (
    <div className="border-b border-border">
      <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Seções do financeiro">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.match)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              <tab.icon className="h-4 w-4" aria-hidden="true" />
              {tab.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
