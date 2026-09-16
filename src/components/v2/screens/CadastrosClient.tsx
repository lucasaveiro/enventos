'use client'

// ── Cadastros ──────────────────────────────────────────────────────────────
// Tudo que se cadastra uma vez e quase não se mexe: clientes, espaços, equipe
// e serviços. Na v1 isso ocupava 5 posições no menu principal, competindo com
// as telas do dia a dia. Aqui vira um destino só, com abas internas.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Phone, MapPin, Search, Lock, CalendarHeart, PenLine } from 'lucide-react'
import { brl } from '@/lib/v2/format'
import type { V2Event, V2Space } from '@/lib/v2/types'
import { EmptyState, FilterChip, SpaceTag } from '@/components/v2/ui'
import { ClientModal } from '@/components/forms/ClientModal'
import { InterestDatesModal } from '@/components/forms/InterestDatesModal'

type Tab = 'clientes' | 'espacos' | 'equipe' | 'servicos'

export type ClientRow = {
  id: number
  name: string
  phone: string | null
  city: string | null
  email: string | null
  cpf: string | null
  rg: string | null
  address: string | null
  state: string | null
  notes: string | null
}
type ProfRow = { id: number; name: string; type: string; phone: string | null }
type ServiceRow = { id: number; name: string; description: string | null }

/** Onde cada aba manda para cadastrar/editar de verdade. */
const V1_ROUTES: Record<Tab, string> = {
  clientes: '/clients',
  espacos: '/spaces',
  equipe: '/professionals',
  servicos: '/services',
}

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

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function CadastrosClient({
  clients,
  spaces,
  professionals,
  services,
  events,
}: {
  clients: ClientRow[]
  spaces: V2Space[]
  professionals: ProfRow[]
  services: ServiceRow[]
  events: V2Event[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('clientes')
  const [q, setQ] = useState('')

  // Clientes e datas de interesse já se cadastram aqui, com os mesmos modais da
  // v1. Espaços, equipe e serviços continuam mandando para a versão atual.
  const [clientModal, setClientModal] = useState<{ open: boolean; client?: ClientRow }>({ open: false })
  const [interestClient, setInterestClient] = useState<{ id: number; name: string } | null>(null)

  const term = q.trim().toLowerCase()

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'clientes', label: 'Clientes', count: clients.length },
    { key: 'espacos', label: 'Espaços', count: spaces.length },
    { key: 'equipe', label: 'Profissionais', count: professionals.length },
    { key: 'servicos', label: 'Serviços', count: services.length },
  ]

  const filteredClients = useMemo(
    () => clients.filter((c) => !term || c.name.toLowerCase().includes(term)),
    [clients, term],
  )
  const filteredSpaces = useMemo(
    () => spaces.filter((s) => !term || s.name.toLowerCase().includes(term)),
    [spaces, term],
  )
  const filteredProfs = useMemo(
    () => professionals.filter((p) => !term || p.name.toLowerCase().includes(term)),
    [professionals, term],
  )
  const filteredServices = useMemo(
    () => services.filter((s) => !term || s.name.toLowerCase().includes(term)),
    [services, term],
  )

  const isEmpty =
    (tab === 'clientes' && filteredClients.length === 0) ||
    (tab === 'espacos' && filteredSpaces.length === 0) ||
    (tab === 'equipe' && filteredProfs.length === 0) ||
    (tab === 'servicos' && filteredServices.length === 0)

  return (
    <div className="v2-fade">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="v2-h1">Cadastros</h1>
          <p className="mt-1 text-[13.5px]" style={{ color: 'var(--v2-text-2)' }}>
            O que se cadastra uma vez e raramente muda.
          </p>
        </div>
        {tab === 'clientes' ? (
          <button
            type="button"
            onClick={() => setClientModal({ open: true })}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-white"
            style={{ background: 'var(--v2-accent)' }}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Novo cliente
          </button>
        ) : (
          <Link
            href={V1_ROUTES[tab]}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-white"
            style={{ background: 'var(--v2-accent)' }}
            title="Cadastrar na versão atual"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Adicionar
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
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
        {isEmpty ? (
          <EmptyState title="Nada encontrado" hint="Tente outro termo de busca." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead style={{ background: 'var(--v2-surface-2)' }}>
                <tr>
                  {tab === 'clientes' && (
                    <>
                      <Head>Cliente</Head>
                      <Head>Telefone</Head>
                      <Head>Cidade</Head>
                      <Head>E-mail</Head>
                      <Head> </Head>
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
                    </>
                  )}
                  {tab === 'servicos' && (
                    <>
                      <Head>Serviço</Head>
                      <Head>Descrição</Head>
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y" style={{ borderColor: 'var(--v2-line)' }}>
                {tab === 'clientes' &&
                  filteredClients.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-[var(--v2-surface-2)]">
                      <Cell>
                        <span className="flex items-center gap-2 font-medium" style={{ color: 'var(--v2-text)' }}>
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                            style={{ background: 'var(--v2-surface-3)', color: 'var(--v2-text-2)' }}
                          >
                            {initials(c.name)}
                          </span>
                          {c.name}
                        </span>
                      </Cell>
                      <Cell>
                        {c.phone ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" style={{ color: 'var(--v2-text-3)' }} />
                            {c.phone}
                          </span>
                        ) : (
                          '—'
                        )}
                      </Cell>
                      <Cell>
                        {c.city ? (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" style={{ color: 'var(--v2-text-3)' }} />
                            {c.city}
                          </span>
                        ) : (
                          '—'
                        )}
                      </Cell>
                      <Cell>{c.email ?? '—'}</Cell>
                      <Cell className="text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInterestClient({ id: c.id, name: c.name })}
                          className="mr-1 inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-medium transition-colors hover:bg-[var(--v2-surface-2)]"
                          style={{ borderColor: 'var(--v2-line-2)', color: 'var(--v2-text-2)' }}
                          title="Datas de interesse deste cliente"
                        >
                          <CalendarHeart className="h-3.5 w-3.5" /> Datas
                        </button>
                        <button
                          type="button"
                          onClick={() => setClientModal({ open: true, client: c })}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-medium transition-colors hover:bg-[var(--v2-surface-2)]"
                          style={{ borderColor: 'var(--v2-line-2)', color: 'var(--v2-text-2)' }}
                          title="Editar cliente"
                        >
                          <PenLine className="h-3.5 w-3.5" /> Editar
                        </button>
                      </Cell>
                    </tr>
                  ))}

                {tab === 'espacos' &&
                  filteredSpaces.map((s) => {
                    const evts = events.filter((e) => e.space.id === s.id)
                    return (
                      <tr key={s.id} className="transition-colors hover:bg-[var(--v2-surface-2)]">
                        <Cell>
                          <SpaceTag space={s} />
                        </Cell>
                        <Cell>{s.address ?? '—'}</Cell>
                        <Cell>{evts.length}</Cell>
                        <Cell>
                          <span className="v2-tabnum font-medium" style={{ color: 'var(--v2-text)' }}>
                            {brl(evts.reduce((sum, e) => sum + e.value, 0))}
                          </span>
                        </Cell>
                      </tr>
                    )
                  })}

                {tab === 'equipe' &&
                  filteredProfs.map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-[var(--v2-surface-2)]">
                      <Cell>
                        <span className="font-medium" style={{ color: 'var(--v2-text)' }}>
                          {p.name}
                        </span>
                      </Cell>
                      <Cell>
                        <span className="v2-pill" style={{ background: 'var(--v2-surface-2)', color: 'var(--v2-text-2)' }}>
                          {p.type}
                        </span>
                      </Cell>
                      <Cell>{p.phone ?? '—'}</Cell>
                    </tr>
                  ))}

                {tab === 'servicos' &&
                  filteredServices.map((s) => (
                    <tr key={s.id} className="transition-colors hover:bg-[var(--v2-surface-2)]">
                      <Cell>
                        <span className="font-medium" style={{ color: 'var(--v2-text)' }}>
                          {s.name}
                        </span>
                      </Cell>
                      <Cell>{s.description ?? '—'}</Cell>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {tab !== 'clientes' && (
        <div className="mt-3 flex items-start gap-2 px-1 text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Esta aba ainda é somente leitura — o botão &ldquo;Adicionar&rdquo; leva para a versão atual.
          </span>
        </div>
      )}

      <ClientModal
        isOpen={clientModal.open}
        onClose={() => setClientModal({ open: false })}
        initialClient={clientModal.client}
        onSuccess={() => {
          setClientModal({ open: false })
          router.refresh()
        }}
      />

      <InterestDatesModal
        client={interestClient}
        isOpen={interestClient !== null}
        onClose={() => {
          setInterestClient(null)
          // As datas de interesse aparecem na agenda: a tela toda recarrega
          // para refletir o que foi criado ou apagado no modal.
          router.refresh()
        }}
      />
    </div>
  )
}
