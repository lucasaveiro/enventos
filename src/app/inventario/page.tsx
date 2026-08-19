import { ClipboardList } from 'lucide-react'
import { InventoryManager } from '@/components/inventory/InventoryManager'

export const metadata = {
  title: 'Inventário da Vistoria — Gestor de Espaços',
}

// Cadastro dos itens que compõem o Termo de Vistoria e Inventário (Anexo I do
// contrato). A lista é editável e filtrada por espaço/pacote na geração do PDF,
// feita na página do contrato de cada espaço.
export default function InventoryPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <ClipboardList className="h-5 w-5 text-emerald-700" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Inventário da Vistoria</h1>
        </div>
        <p className="text-sm ml-[52px] text-[var(--muted-foreground)]">
          Itens que entram no Termo de Vistoria e Inventário (Anexo I do contrato). O PDF do termo é
          gerado na página do contrato, já filtrado pelo espaço e pacote da locação.
        </p>
      </div>

      <InventoryManager />
    </div>
  )
}
