'use server'

// As telas da v2 são Server Components: leem direto de lib/v2/screens.ts, sem
// requisição nenhuma. Aqui ficam só as leituras sob demanda, que acontecem
// depois que a página já está na tela — uma action, uma requisição.

import { requireAuth } from '@/lib/auth'
import { getEventDetail, loadEvents } from '@/lib/v2/screens'
import type { V2Event } from '@/lib/v2/types'

/** Painel lateral do evento. Substitui as 4 chamadas que o painel fazia. */
export async function loadEventDetail(id: number): Promise<V2Event | null> {
  return getEventDetail(id)
}

/** Busca global (Ctrl+K) — carregada na primeira vez que a busca abre. */
export async function loadEventsForSearch(): Promise<V2Event[]> {
  await requireAuth()
  return loadEvents()
}
