'use client'

import { Link2, User, CalendarDays, DollarSign, FileText, type LucideIcon } from 'lucide-react'

// ── Índice de navegação do editor de contrato ──────────────────────────────
// O editor é uma página muito longa (vincular evento, dados do contratado e do
// contratante, dados do evento, condições financeiras, observações e cláusulas).
// Esta barra fica fixa no topo e leva direto a cada seção. É puramente visual:
// cada botão rola até um id de seção. Não altera geração, cláusulas nem parcelas.

type ContractSection = { id: string; label: string; icon: LucideIcon }

const sections: ContractSection[] = [
  { id: 'ct-vincular', label: 'Vincular', icon: Link2 },
  { id: 'ct-contratante', label: 'Contratante', icon: User },
  { id: 'ct-evento', label: 'Evento', icon: CalendarDays },
  { id: 'ct-financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'ct-clausulas', label: 'Cláusulas', icon: FileText },
]

export function ContractSectionNav() {
  const goTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="sticky top-14 z-20 border-b border-border bg-background/90 py-2 backdrop-blur lg:top-0">
      <nav className="flex gap-1 overflow-x-auto" aria-label="Navegação das seções do contrato">
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
