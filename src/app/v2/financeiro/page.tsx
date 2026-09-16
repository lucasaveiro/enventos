import { spEndOfMonth, spParts, spStartOfMonth } from '@/lib/today'
import { getFinanceiroScreen } from '@/lib/v2/screens'
import { FinanceiroClient, type Period } from '@/components/v2/screens/FinanceiroClient'

function parsePeriod(value?: string): Period {
  return value === '3meses' || value === 'ano' ? value : 'mes'
}

/** Limites do período no calendário de São Paulo — o servidor roda em UTC. */
function rangeOf(period: Period) {
  const { year, month } = spParts()
  const end = spEndOfMonth(year, month)
  switch (period) {
    case '3meses':
      return { start: spStartOfMonth(year, month - 2), end }
    case 'ano':
      return { start: spStartOfMonth(year, 0), end }
    default:
      return { start: spStartOfMonth(year, month), end }
  }
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
}) {
  const { periodo } = await searchParams
  const period = parsePeriod(periodo)
  const data = await getFinanceiroScreen(rangeOf(period))
  return <FinanceiroClient period={period} {...data} />
}
