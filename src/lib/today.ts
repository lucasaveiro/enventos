// ── "Hoje" no fuso do negócio ──────────────────────────────────────────────
// Os vencimentos são gravados como meia-noite LOCAL (parseLocalDate no
// navegador), mas o servidor da Vercel roda em UTC: lá `startOfDay(new Date())`
// cai às 21:00 do dia anterior em Brasília, e uma parcela que vence hoje é dada
// como vencida três horas antes da virada.
//
// Este módulo devolve o instante da meia-noite em São Paulo, para que a conta
// de "vencido" dê o mesmo resultado no servidor, no navegador e nas duas
// versões da interface.

const TZ = 'America/Sao_Paulo'

/** Deslocamento do fuso (em ms) no instante dado — hoje sempre -3h, mas medido. */
function offsetMs(date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]))
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  )
  return asUTC - date.getTime()
}

/** Início do dia de hoje em São Paulo, como instante. */
export function startOfToday(): Date {
  const now = new Date()
  const offset = offsetMs(now)
  const local = new Date(now.getTime() + offset)
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
  return new Date(midnight - offset)
}

/** Fim do dia de hoje em São Paulo, como instante (23:59:59.999 locais). */
export function endOfToday(): Date {
  return new Date(startOfToday().getTime() + 24 * 60 * 60 * 1000 - 1)
}
