import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns'
import { getAgendaScreen } from '@/lib/v2/screens'
import { AgendaClient } from '@/components/v2/screens/AgendaClient'

/** `?mes=2026-09`; sem parâmetro (ou com lixo), o mês corrente. */
function parseMonth(value?: string): Date {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? '')
  if (!match) return startOfMonth(new Date())
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1)
  return Number.isNaN(date.getTime()) ? startOfMonth(new Date()) : date
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { mes } = await searchParams
  const cursor = parseMonth(mes)

  // A grade mostra as semanas inteiras que tocam o mês, então a leitura precisa
  // cobrir os dias vizinhos que aparecem nas bordas.
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 })
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 })
  end.setHours(23, 59, 59, 999)

  const { items, spaces } = await getAgendaScreen(start, end)
  return <AgendaClient cursor={cursor} items={items} spaces={spaces} />
}
