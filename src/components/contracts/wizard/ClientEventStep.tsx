'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, UserPlus, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Checkbox } from '@/components/ui/Checkbox'
import { searchClientsForWizard, getSpacesForWizard, getProfessionalsForWizard } from '@/app/actions/contractWizard'

function toLocalDatetimeString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

const EVENT_TYPES = [
  'Casamento',
  'Debutante',
  'Aniversário',
  'Confraternização',
  'Formatura',
  'Batizado / Chá de bebê',
  'Chá de panela / Noivado',
  'Evento corporativo',
  'Outro',
]

export interface ClientEventData {
  clientId: number | null
  clientName: string
  clientPhone: string
  clientEmail: string
  clientCPF: string
  clientRG: string
  clientAddress: string
  clientCity: string
  clientState: string
  clientNotes: string
  eventTitle: string
  spaceId: number | null
  eventStart: string
  eventEnd: string
  eventType: string
  guestCount: string
  professionalIds: number[]
  eventNotes: string
}

interface Props {
  data: ClientEventData
  onChange: (data: ClientEventData) => void
  errors: Record<string, string>
}

const selectClass = "flex h-11 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] px-4 py-2 text-sm shadow-sm transition-all duration-200 focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"

export function ClientEventStep({ data, onChange, errors }: Props) {
  const [spaces, setSpaces] = useState<any[]>([])
  const [professionals, setProfessionals] = useState<any[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [isNewClient, setIsNewClient] = useState(!data.clientId)

  useEffect(() => {
    Promise.all([getSpacesForWizard(), getProfessionalsForWizard()]).then(
      ([spacesRes, profRes]) => {
        if (spacesRes.success) setSpaces(spacesRes.data || [])
        if (profRes.success) setProfessionals(profRes.data || [])
      }
    )
  }, [])

  const searchClients = useCallback(async (query: string) => {
    if (query.length < 2) {
      setClientResults([])
      setShowResults(false)
      return
    }
    setIsSearching(true)
    const res = await searchClientsForWizard(query)
    if (res.success) {
      setClientResults(res.data || [])
      setShowResults(true)
    }
    setIsSearching(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchClients(clientSearch), 300)
    return () => clearTimeout(timer)
  }, [clientSearch, searchClients])

  const selectClient = (client: any) => {
    onChange({
      ...data,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone || '',
      clientEmail: client.email || '',
      clientCPF: client.cpf || '',
      clientRG: client.rg || '',
      clientAddress: client.address || '',
      clientCity: client.city || '',
      clientState: client.state || '',
      clientNotes: client.notes || '',
    })
    setClientSearch(client.name)
    setShowResults(false)
    setIsNewClient(false)
  }

  const switchToNewClient = () => {
    setIsNewClient(true)
    setClientSearch('')
    setShowResults(false)
    onChange({
      ...data,
      clientId: null,
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      clientCPF: '',
      clientRG: '',
      clientAddress: '',
      clientCity: '',
      clientState: '',
      clientNotes: '',
    })
  }

  const switchToExistingClient = () => {
    setIsNewClient(false)
  }

  const update = (field: keyof ClientEventData, value: any) => {
    onChange({ ...data, [field]: value })
  }

  const toggleProfessional = (profId: number, checked: boolean) => {
    const next = checked
      ? [...data.professionalIds, profId]
      : data.professionalIds.filter((id) => id !== profId)
    update('professionalIds', next)
  }

  return (
    <div className="space-y-6">
      {/* Client Section */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--secondary)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
            Dados do Cliente
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={isNewClient ? switchToExistingClient : switchToNewClient}
            className="text-xs gap-1.5"
          >
            {isNewClient ? (
              <>
                <Search className="h-3.5 w-3.5" />
                Buscar Existente
              </>
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5" />
                Novo Cliente
              </>
            )}
          </Button>
        </div>

        <div className="p-5 space-y-4">
          {/* Search existing client */}
          {!isNewClient && !data.clientId && (
            <div className="relative">
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">
                Buscar Cliente
              </Label>
              <Input
                icon={<Search className="h-4 w-4" />}
                placeholder="Digite o nome, email, telefone ou CPF..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                onFocus={() => clientResults.length > 0 && setShowResults(true)}
              />
              {showResults && clientResults.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {clientResults.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-[var(--secondary)] transition-colors border-b border-[var(--border)] last:border-b-0"
                      onClick={() => selectClient(client)}
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)]">{client.name}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {[client.phone, client.email, client.cpf].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {isSearching && (
                <p className="text-xs text-[var(--muted-foreground)] mt-1">Buscando...</p>
              )}
            </div>
          )}

          {/* Selected client badge */}
          {!isNewClient && data.clientId && (
            <div className="flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <User className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">{data.clientName}</p>
                <p className="text-xs text-green-600 dark:text-green-400">Cliente selecionado - dados serão atualizados</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={switchToNewClient}
                className="text-xs"
              >
                Trocar
              </Button>
            </div>
          )}

          {/* Client form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Nome Completo *</Label>
              <Input
                value={data.clientName}
                onChange={(e) => update('clientName', e.target.value)}
                placeholder="Nome completo do cliente"
              />
              {errors.clientName && <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>}
            </div>
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">CPF *</Label>
              <Input
                value={data.clientCPF}
                onChange={(e) => update('clientCPF', e.target.value)}
                placeholder="000.000.000-00"
              />
              {errors.clientCPF && <p className="text-xs text-red-500 mt-1">{errors.clientCPF}</p>}
            </div>
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">RG</Label>
              <Input
                value={data.clientRG}
                onChange={(e) => update('clientRG', e.target.value)}
                placeholder="00.000.000-0"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Telefone</Label>
              <Input
                value={data.clientPhone}
                onChange={(e) => update('clientPhone', e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Email</Label>
              <Input
                type="email"
                value={data.clientEmail}
                onChange={(e) => update('clientEmail', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Endereço *</Label>
              <Input
                value={data.clientAddress}
                onChange={(e) => update('clientAddress', e.target.value)}
                placeholder="Rua, número, bairro"
              />
              {errors.clientAddress && <p className="text-xs text-red-500 mt-1">{errors.clientAddress}</p>}
            </div>
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Cidade *</Label>
              <Input
                value={data.clientCity}
                onChange={(e) => update('clientCity', e.target.value)}
                placeholder="Cidade"
              />
              {errors.clientCity && <p className="text-xs text-red-500 mt-1">{errors.clientCity}</p>}
            </div>
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">UF *</Label>
              <Input
                value={data.clientState}
                onChange={(e) => update('clientState', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="SP"
                maxLength={2}
              />
              {errors.clientState && <p className="text-xs text-red-500 mt-1">{errors.clientState}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Event Section */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--secondary)]">
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
            Dados do Evento
          </h3>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Título do Evento *</Label>
              <Input
                value={data.eventTitle}
                onChange={(e) => update('eventTitle', e.target.value)}
                placeholder="Ex: Casamento João e Maria"
              />
              {errors.eventTitle && <p className="text-xs text-red-500 mt-1">{errors.eventTitle}</p>}
            </div>

            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Espaço *</Label>
              <select
                className={selectClass}
                value={data.spaceId || ''}
                onChange={(e) => update('spaceId', e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">Selecione...</option>
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>{space.name}</option>
                ))}
              </select>
              {errors.spaceId && <p className="text-xs text-red-500 mt-1">{errors.spaceId}</p>}
            </div>

            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Tipo de Evento *</Label>
              <select
                className={selectClass}
                value={data.eventType}
                onChange={(e) => update('eventType', e.target.value)}
              >
                <option value="">Selecione...</option>
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.eventType && <p className="text-xs text-red-500 mt-1">{errors.eventType}</p>}
            </div>

            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Início *</Label>
              <Input
                type="datetime-local"
                value={data.eventStart}
                onChange={(e) => update('eventStart', e.target.value)}
              />
              {errors.eventStart && <p className="text-xs text-red-500 mt-1">{errors.eventStart}</p>}
            </div>
            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Fim *</Label>
              <Input
                type="datetime-local"
                value={data.eventEnd}
                onChange={(e) => update('eventEnd', e.target.value)}
              />
              {errors.eventEnd && <p className="text-xs text-red-500 mt-1">{errors.eventEnd}</p>}
            </div>

            <div>
              <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Nº de Convidados</Label>
              <Input
                type="number"
                value={data.guestCount}
                onChange={(e) => update('guestCount', e.target.value)}
                placeholder="Ex: 150"
              />
            </div>
          </div>

          {/* Professionals */}
          {professionals.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-[var(--muted-foreground)] block">Profissionais</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {professionals.map((prof) => (
                  <label
                    key={prof.id}
                    className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2 text-sm cursor-pointer hover:bg-[var(--secondary)] transition-colors"
                  >
                    <Checkbox
                      checked={data.professionalIds.includes(prof.id)}
                      onCheckedChange={(checked) => toggleProfessional(prof.id, Boolean(checked))}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-[var(--foreground)]">{prof.name}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">{prof.type}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Observações do Evento</Label>
            <Textarea
              value={data.eventNotes}
              onChange={(e) => update('eventNotes', e.target.value)}
              placeholder="Informações adicionais sobre o evento..."
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
