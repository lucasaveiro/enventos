import { endOfMonth, startOfMonth, startOfYear, subMonths } from 'date-fns'
import { getFinanceiroScreen } from '@/lib/v2/screens'
import { FinanceiroClient, type Period } from '@/components/v2/screens/FinanceiroClient'

function parsePeriod(value?: string): Period {
  return value === '3meses' || value === 'ano' ? value : 'mes'
}

function rangeOf(period: Period) {
  const now = new Date()
  switch (period) {
    case '3meses':
      return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) }
    case 'ano':
      return { start: startOfYear(now), end: endOfMonth(now) }
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) }
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
