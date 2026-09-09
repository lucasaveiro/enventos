'use client'

// ── Cadastros ──────────────────────────────────────────────────────────────
// Tudo que se cadastra uma vez e quase não se mexe: clientes, espaços, equipe
// e serviços. Na v1 isso ocupava 5 posições no menu principal, competindo com
// as telas do dia a dia. Aqui vira um destino só, com abas internas.
//
// FASE A: só leitura — cadastrar e editar continua na versão atual.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Phone, MapPin, Search, Lock } from 'lucide-react'
import { getClients } from '@/app/actions/clients'
import { getProfessionals } from '@/app/actions/professionals'
import { getServiceTypes } from '@/app/actions/services'
import { loadEvents, loadSpaces } from '@/lib/v2/data'
import { brl } from '@/lib/v2/format'
import type { V2Event, V2Space } from '@/lib/v2/types'
import { EmptyState, FilterChip, Skeleton, SpaceTag } from '@/components/v2/ui'

type Tab = 'clientes' | 'espacos' | 'equipe' | 'servicos'

type ClientRow = { id: number; name: string; phone: string | null; city: string | null; email: string | null }
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

export default function CadastrosPage() {
  const [tab, setTab] = useState<Tab>('clientes')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  const [clients, setClients] = useState<ClientRow[]>([])
  const [spaces, setSpaces] = useState<V2Space[]>([])
  const [professionals, setProfessionals] = useState<ProfRow[]>([])
  const [services, setServices] = useState<ServiceRow[]>([])
  const [events, setEvents] = useState<V2Event[]>([])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [cli, sp, prof, serv, ev] = await Promise.all([
      getClients(),
      loadSpaces(),
      getProfessionals(),
      getServiceTypes(),
      loadEvents(),
    ])
    if (cli.success && cli.data) setClients(cli.data as ClientRow[])
    setSpaces(sp)
    if (prof.success && prof.data) setProfessionals(prof.data as ProfRow[])
    if (serv.success && serv.data) setServices(serv.data as ServiceRow[])
    setEvents(ev)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

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
        <Link
          href={V1_ROUTES[tab]}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-white"
          style={{ background: 'var(--v2-accent)' }}
          title="Cadastrar na versão atual"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Adicionar
        </Link>
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

      {loading ? (
        <Skeleton className="h-72 w-full" />
      ) : (
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
      )}

      <div className="mt-3 flex items-start gap-2 px-1 text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Somente leitura. Cadastrar e editar continua na versão atual — o botão &ldquo;Adicionar&rdquo; leva para lá.
        </span>
      </div>
    </div>
  )
}
