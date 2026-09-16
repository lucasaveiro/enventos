'use client'

// ── Formulário de evento, um só para toda a v2 ─────────────────────────────
// O mesmo EventModal da v1 (788 linhas já validadas: criar, editar, excluir,
// cliente novo no ato, datas de interesse, profissionais) montado uma vez na
// casca da v2. Qualquer tela pede pelo contexto — o botão "Novo evento" do
// topo, o dia vazio da agenda, o "Editar" do painel lateral.
//
// Depois de gravar, `router.refresh()`: as telas são Server Components, então o
// servidor refaz a leitura agregada e a tela volta com os dados novos numa
// requisição só. `version` avisa quem tem estado próprio (o painel lateral) que
// precisa recarregar.

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EventModal } from '@/components/forms/EventModal'
import { loadEventForEdit } from '@/app/actions/v2'

type EventFormContextValue = {
  /** Abre o formulário vazio; com data, já posicionado nela. */
  novoEvento: (date?: Date) => void
  /** Carrega o evento e abre o formulário preenchido. */
  editarEvento: (id: number) => void
  /** Sobe a cada gravação — quem guarda estado próprio recarrega. */
  version: number
}

const EventFormContext = createContext<EventFormContextValue | null>(null)

export function useEventForm(): EventFormContextValue {
  const ctx = useContext(EventFormContext)
  if (!ctx) throw new Error('useEventForm precisa estar dentro de <EventFormProvider>')
  return ctx
}

export function EventFormProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [initialDate, setInitialDate] = useState<Date | undefined>(undefined)
  const [initialEvent, setInitialEvent] = useState<unknown>(null)
  const [version, setVersion] = useState(0)

  const novoEvento = useCallback((date?: Date) => {
    setInitialEvent(null)
    setInitialDate(date)
    setIsOpen(true)
  }, [])

  const editarEvento = useCallback((id: number) => {
    // O EventModal preenche a partir do formato do banco (spaceId, clientId,
    // deposit, professionals...), que os tipos de tela da v2 não carregam —
    // por isso o evento é buscado inteiro na hora de editar.
    loadEventForEdit(id).then((event) => {
      if (!event) {
        alert('Não foi possível carregar este evento.')
        return
      }
      setInitialDate(undefined)
      setInitialEvent(event)
      setIsOpen(true)
    })
  }, [])

  const saved = useCallback(() => {
    setIsOpen(false)
    setVersion((v) => v + 1)
    router.refresh()
  }, [router])

  const value = useMemo(
    () => ({ novoEvento, editarEvento, version }),
    [novoEvento, editarEvento, version],
  )

  return (
    <EventFormContext.Provider value={value}>
      {children}
      <EventModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialDate={initialDate}
        initialEvent={initialEvent ?? undefined}
        onSuccess={saved}
        onDelete={saved}
      />
    </EventFormContext.Provider>
  )
}
