import { spDate, spParts } from '@/lib/today'
import { monthKeyOf } from '@/lib/v2/format'
import { getAgendaScreen } from '@/lib/v2/screens'
import { AgendaClient } from '@/components/v2/screens/AgendaClient'

/** `?mes=2026-09` → ano e mês (0-11); sem parâmetro (ou com lixo), o mês corrente em São Paulo. */
function parseMonth(value?: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? '')
  if (match) {
    const month = Number(match[2]) - 1
    if (month >= 0 && month <= 11) return { year: Number(match[1]), month }
  }
  const today = spParts()
  return { year: today.year, month: today.month }
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { mes } = await searchParams
  const { year, month } = parseMonth(mes)

  // A grade mostra as semanas inteiras que tocam o mês, então a leitura precisa
  // cobrir os dias vizinhos que aparecem nas bordas. As contas de calendário
  // são feitas em UTC (livres de fuso) e viram instantes no fuso de São Paulo:
  // o servidor roda em UTC, e um "1º de setembro 00:00" pelo relógio dele é
  // 31 de agosto às 21h em Brasília — a tela abria no mês errado.
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const lastWeekday = new Date(Date.UTC(year, month, lastDay)).getUTCDay()
  const start = spDate(year, month, 1 - firstWeekday)
  const end = spDate(year, month, lastDay + (6 - lastWeekday), 23, 59, 59, 999)

  const { items, spaces } = await getAgendaScreen(start, end)
  // O mês vai como texto: a tela monta o Date no fuso do navegador.
  return <AgendaClient month={monthKeyOf(year, month)} items={items} spaces={spaces} />
}
