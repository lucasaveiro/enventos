import { FileSearch, MapPin, ShieldAlert } from 'lucide-react'
import { SPACES } from '@/lib/contractTemplates'
import BlankContractDownloadButton from '@/components/contracts/BlankContractDownloadButton'

export const metadata = {
  title: 'Contrato em Branco (Modelo) — Gestor de Espaços',
}

// Página do "contrato em branco": gera a minuta padrão de cada espaço SEM dados
// do cliente/evento, apenas para o cliente ler e conferir as cláusulas antes de
// fechar a locação. O contrato oficial continua sendo gerado pelo fluxo normal
// ("Novo Contrato Fechado" / página do evento).
export default function BlankContractPage() {
  const spaces = Object.values(SPACES)

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <FileSearch className="h-5 w-5 text-amber-700" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Contrato em Branco</h1>
            <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-800">
              Modelo — sem dados do cliente
            </span>
          </div>
        </div>
        <p className="text-sm ml-[52px] text-[var(--muted-foreground)]">
          Baixe o contrato padrão em branco para o cliente conferir as cláusulas antes de fechar a locação
        </p>
      </div>

      {/* Warning box */}
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900 space-y-1">
          <p className="font-semibold">Somente para leitura das cláusulas</p>
          <p>
            O PDF sai sempre com as <strong>cláusulas padrão vigentes</strong> de cada espaço, sem
            nenhum dado do cliente ou do evento — os campos aparecem como lacunas, ex.:{' '}
            <span className="font-mono text-xs">[NOME DO LOCATÁRIO]</span>. O documento é marcado
            como <strong>modelo sem valor contratual</strong> e não deve ser assinado. Para o
            contrato oficial, use o fluxo &ldquo;Novo Contrato Fechado&rdquo;.
          </p>
        </div>
      </div>

      {/* Space cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {spaces.map((space) => (
          <div
            key={space.id}
            className="relative h-full rounded-2xl border-2 border-transparent bg-[var(--card)] shadow-sm overflow-hidden p-6 flex flex-col"
          >
            {/* Color accent top bar */}
            <div
              className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl"
              style={{ backgroundColor: space.color }}
            />

            {/* Icon */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mt-2"
              style={{ backgroundColor: space.bgColor }}
            >
              <FileSearch className="h-7 w-7" style={{ color: space.color }} />
            </div>

            {/* Content */}
            <h2 className="text-xl font-bold text-[var(--card-foreground)] mb-1">{space.displayName}</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              Minuta com as cláusulas padrão atuais do contrato de locação, sem preenchimento
            </p>

            <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] mb-5 mt-auto">
              <MapPin className="h-3.5 w-3.5" />
              {space.address} — {space.city}/{space.state}
            </div>

            <BlankContractDownloadButton space={space} />
          </div>
        ))}
      </div>

      {/* Info box */}
      <div className="rounded-xl bg-[var(--info-light)] border border-[var(--border)] p-5">
        <h3 className="text-sm font-semibold text-[var(--info-foreground)] mb-2">Como usar</h3>
        <ol className="text-sm text-[var(--info)] space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--border)] text-[var(--foreground)] text-xs font-bold flex items-center justify-center mt-0.5">1</span>
            Baixe o modelo em PDF do espaço que o cliente pretende locar
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--border)] text-[var(--foreground)] text-xs font-bold flex items-center justify-center mt-0.5">2</span>
            Envie ao cliente por WhatsApp ou e-mail para leitura das cláusulas
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--border)] text-[var(--foreground)] text-xs font-bold flex items-center justify-center mt-0.5">3</span>
            Estando o cliente de acordo, gere o contrato oficial em &ldquo;Novo Contrato Fechado&rdquo; ou pela página do evento
          </li>
        </ol>
      </div>
    </div>
  )
}
