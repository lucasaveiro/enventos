'use client'

// ── Cadastros ──────────────────────────────────────────────────────────────
// Tudo que se cadastra uma vez e quase não se mexe: clientes, espaços, equipe,
// serviços e inventário da vistoria. Na v1 isso ocupava 5 posições no menu
// principal, competindo com as telas do dia a dia. Aqui vira um destino só,
// com abas internas.

import { useState } from 'react'
import { Plus, Phone, MapPin, Search } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CLIENTS, PROFESSIONALS, SERVICES, SPACES, brl, EVENTS } from '@/lib/v2/mock'
import { FilterChip, SpaceDot, SpaceTag } from '@/components/v2/ui'

type Tab = 'clientes' | 'espacos' | 'equipe' | 'servicos'

const TABS: { key: Tab; label: string; count: number }[] = [
  { key: 'clientes', label: 'Clientes', count: CLIENTS.length },
  { key: 'espacos', label: 'Espaços', count: Object.keys(SPACES).length },
  { key: 'equipe', label: 'Profissionais', count: PROFESSIONALS.length },
  { key: 'servicos', label: 'Serviços', count: SERVICES.length },
]

function Cell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-3 text-[13.5px] ${className}`} style={{ color: 'var(--v2-text-2)' }}>
      {children}
    </td>
  )
}

function Head({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="px-4 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide"
      style={{ color: 'var(--v2-text-3)' }}
    >
      {children}
    </th>
  )
}

export default function CadastrosPage() {
  const [tab, setTab] = useState<Tab>('clientes')
  const [q, setQ] = useState('')

  const term = q.trim().toLowerCase()

  return (
    <div className="v2-fade">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="v2-h1">Cadastros</h1>
          <p className="mt-1 text-[13.5px]" style={{ color: 'var(--v2-text-2)' }}>
            O que se cadastra uma vez e raramente muda.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-white"
          style={{ background: 'var(--v2-accent)' }}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Adicionar
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <FilterChip key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
            <span
              className="ml-0.5 rounded-full px-1.5 text-[11px] font-bold"
              style={{
                background: tab === t.key ? 'rgb(255 255 255 / 0.2)' : 'var(--v2-surface-2)',
                color: tab === t.key ? '#fff' : 'var(--v2-text-3)',
              }}
            >
              {t.count}
            </span>
          </FilterChip>
        ))}
        <div
          className="ml-auto flex h-9 w-full items-center gap-2 rounded-lg border px-3 sm:w-56"
          style={{ borderColor: 'var(--v2-line-2)', background: 'var(--v2-surface)' }}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--v2-text-3)' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-transparent text-[13.5px] outline-none"
            style={{ color: 'var(--v2-text)' }}
          />
        </div>
      </div>

      <div className="v2-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead style={{ background: 'var(--v2-surface-2)' }}>
              <tr>
                {tab === 'clientes' && (
                  <>
                    <Head>Cliente</Head>
                    <Head>Contato</Head>
                    <Head>Cidade</Head>
                    <Head>Último evento</Head>
                  </>
                )}
                {tab === 'espacos' && (
                  <>
                    <Head>Espaço</Head>
                    <Head>Endereço</Head>
                    <Head>Eventos</Head>
                    <Head>Contratado</Head>
                  </>
                )}
                {tab === 'equipe' && (
                  <>
                    <Head>Profissional</Head>
                    <Head>Tipo</Head>
                    <Head>Telefone</Head>
                    <Head>Eventos</Head>
                  </>
                )}
                {tab === 'servicos' && (
                  <>
                    <Head>Serviço</Head>
                    <Head>Espaço</Head>
                    <Head>Recorrência</Head>
                    <Head>Custo</Head>
                  </>
                )}
              </tr>
            </thead>

            <tbody className="divide-y" style={{ borderColor: 'var(--v2-line)' }}>
              {tab === 'clientes' &&
                CLIENTS.filter((c) => !term || c.name.toLowerCase().includes(term)).map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-[var(--v2-surface-2)]">
                    <Cell className="!font-medium">
                      <span className="flex items-center gap-2" style={{ color: 'var(--v2-text)' }}>
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                          style={{ background: 'var(--v2-surface-3)', color: 'var(--v2-text-2)' }}
                        >
                          {c.name
                            .split(' ')
                            .slice(0, 2)
                            .map((p) => p[0])
                            .join('')}
                        </span>
                        {c.name}
                      </span>
                    </Cell>
                    <Cell>
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" style={{ color: 'var(--v2-text-3)' }} />
                        {c.phone}
                      </span>
                    </Cell>
                    <Cell>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" style={{ color: 'var(--v2-text-3)' }} />
                        {c.city}
                      </span>
                    </Cell>
                    <Cell>
                      <span className="flex items-center gap-1.5">
                        <SpaceDot space={c.space} />
                        {format(c.lastEvent, "d 'de' MMM yyyy", { locale: ptBR })}
                      </span>
                    </Cell>
                  </tr>
                ))}

              {tab === 'espacos' &&
                (Object.keys(SPACES) as (keyof typeof SPACES)[])
                  .filter((s) => !term || SPACES[s].name.toLowerCase().includes(term))
                  .map((slug) => {
                    const evts = EVENTS.filter((e) => e.space === slug)
                    return (
                      <tr key={slug} className="transition-colors hover:bg-[var(--v2-surface-2)]">
                        <Cell>
                          <SpaceTag space={slug} />
                        </Cell>
                        <Cell>{SPACES[slug].address}</Cell>
                        <Cell>{evts.length}</Cell>
                        <Cell className="!font-medium">
                          <span className="v2-tabnum" style={{ color: 'var(--v2-text)' }}>
                            {brl(evts.reduce((s, e) => s + e.value, 0))}
                          </span>
                        </Cell>
                      </tr>
                    )
                  })}

              {tab === 'equipe' &&
                PROFESSIONALS.filter((p) => !term || p.name.toLowerCase().includes(term)).map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-[var(--v2-surface-2)]">
                    <Cell className="!font-medium">
                      <span style={{ color: 'var(--v2-text)' }}>{p.name}</span>
                    </Cell>
                    <Cell>
                      <span
                        className="v2-pill"
                        style={{ background: 'var(--v2-surface-2)', color: 'var(--v2-text-2)' }}
                      >
                        {p.type}
                      </span>
                    </Cell>
                    <Cell>{p.phone}</Cell>
                    <Cell>{p.events}</Cell>
                  </tr>
                ))}

              {tab === 'servicos' &&
                SERVICES.filter((s) => !term || s.name.toLowerCase().includes(term)).map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-[var(--v2-surface-2)]">
                    <Cell className="!font-medium">
                      <span style={{ color: 'var(--v2-text)' }}>{s.name}</span>
                    </Cell>
                    <Cell>
                      <span className="flex items-center gap-1.5">
                        <SpaceDot space={s.space} />
                        {SPACES[s.space].short}
                      </span>
                    </Cell>
                    <Cell>{s.recurrence}</Cell>
                    <Cell>{s.cost > 0 ? brl(s.cost) : '—'}</Cell>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 px-1 text-[12.5px]" style={{ color: 'var(--v2-text-3)' }}>
        O inventário da vistoria continua vivendo dentro do contrato de cada evento — é lá que ele é usado.
      </p>
    </div>
  )
}
