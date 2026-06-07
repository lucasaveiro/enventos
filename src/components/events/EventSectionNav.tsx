'use client'

import {
  CalendarDays,
  Users,
  CreditCard,
  DollarSign,
  FileText,
  type LucideIcon,
} from 'lucide-react'

// ── Índice de navegação da página de evento ────────────────────────────────
// A página de evento concentra tudo (detalhes, cliente, pagamentos, contrato),
// mas é longa. Esta barra fica fixa no topo e leva direto a cada seção, sem
// scroll infinito. É puramente visual: cada botão rola até um id de seção.

type EventSection = { id: string; label: string; icon: LucideIcon }

export function EventSectionNav({ isFinancialEvent }: { isFinancialEvent: boolean }) {
  const sections: EventSection[] = [
    { id: 'evt-detalhes', label: 'Detalhes', icon: CalendarDays },
    { id: 'evt-cliente', label: 'Cliente', icon: Users },
  ]

  if (isFinancialEvent) {
    sections.push(
      { id: 'evt-pagamentos', label: 'Pagamentos', icon: CreditCard },
      { id: 'evt-transacoes', label: 'Transações', icon: DollarSign },
      { id: 'evt-contrato', label: 'Contrato', icon: FileText },
    )
  }

  const goTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="sticky top-14 z-20 -mx-4 mb-2 border-b border-border bg-background/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8">
      <nav className="flex gap-1 overflow-x-auto" aria-label="Navegação das seções do evento">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goTo(s.id)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <s.icon className="h-4 w-4" aria-hidden="true" />
            {s.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
