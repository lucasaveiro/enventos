import Link from 'next/link'
import { FileText, ArrowRight, MapPin } from 'lucide-react'
import { SPACES } from '@/lib/contractTemplates'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Contratos — Gestor de Espaços',
}

export default function ContractsPage() {
  const spaces = Object.values(SPACES)

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <FileText className="h-5 w-5 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Gerador de Contratos</h1>
        </div>
        <p className="text-gray-500 text-sm ml-[52px]">
          Selecione o espaço para iniciar a geração do contrato de locação
        </p>
      </div>

      {/* Space cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {spaces.map((space) => (
          <Link key={space.id} href={`/contracts/${space.id}`} className="group block">
            <div
              className={cn(
                'relative h-full rounded-2xl border-2 border-transparent bg-white shadow-sm',
                'hover:shadow-md transition-all duration-200 overflow-hidden p-6',
                space.hoverBorderClass
              )}
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
                <FileText className="h-7 w-7" style={{ color: space.color }} />
              </div>

              {/* Content */}
              <h2 className="text-xl font-bold text-gray-900 mb-1">{space.displayName}</h2>
              <p className="text-sm text-gray-500 mb-4">{space.description}</p>

              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-5">
                <MapPin className="h-3.5 w-3.5" />
                {space.address} — {space.city}/{space.state}
              </div>

              {/* CTA */}
              <div
                className="flex items-center gap-2 text-sm font-semibold transition-colors"
                style={{ color: space.color }}
              >
                Gerar contrato
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Info box */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-5">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">Como funciona</h3>
        <ol className="text-sm text-blue-700 space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs font-bold flex items-center justify-center mt-0.5">1</span>
            Selecione o espaço que será locado acima
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs font-bold flex items-center justify-center mt-0.5">2</span>
            Preencha os dados do contratante e do evento
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs font-bold flex items-center justify-center mt-0.5">3</span>
            Clique em &ldquo;Aplicar dados&rdquo; para preencher as cláusulas automaticamente
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs font-bold flex items-center justify-center mt-0.5">4</span>
            Revise e edite cláusula por cláusula conforme necessário
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs font-bold flex items-center justify-center mt-0.5">5</span>
            Gere o contrato em PDF com um clique
          </li>
        </ol>
      </div>
    </div>
  )
}
