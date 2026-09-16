// ── Datas no fuso do negócio ───────────────────────────────────────────────
// Os vencimentos são gravados como meia-noite LOCAL (parseLocalDate no
// navegador), mas o servidor da Vercel roda em UTC: lá `startOfDay(new Date())`
// cai às 21:00 do dia anterior em Brasília, e uma parcela que vence hoje é dada
// como vencida três horas antes da virada. O mesmo vale para "primeiro dia do
// mês": calculado com o relógio do servidor, chega ao navegador como 21h do
// último dia do mês anterior — e a agenda abria no mês errado.
//
// Este módulo faz as contas de calendário em São Paulo e devolve instantes, para
// que o resultado seja o mesmo no servidor, no navegador e nas duas versões da
// interface. Mês é sempre 0-11, como em Date; dia e mês podem transbordar
// (Date.UTC normaliza: mês 12 vira janeiro do ano seguinte, dia 0 o último do
// mês anterior).

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
  // formatToParts para em segundos; comparar com os segundos inteiros do
  // instante evita um resto de ate 999ms no deslocamento (23:59:59.999 virava
  // 00:00:00.998 do dia seguinte).
  return asUTC - Math.floor(date.getTime() / 1000) * 1000
}

/** Ano, mês (0-11) e dia do instante dado, no calendário de São Paulo. */
export function spParts(date: Date = new Date()): { year: number; month: number; day: number } {
  const local = new Date(date.getTime() + offsetMs(date))
  return { year: local.getUTCFullYear(), month: local.getUTCMonth(), day: local.getUTCDate() }
}

/** Instante de uma data e hora do calendário de São Paulo. */
export function spDate(
  year: number,
  month: number,
  day = 1,
  hours = 0,
  minutes = 0,
  seconds = 0,
  ms = 0,
): Date {
  const wall = Date.UTC(year, month, day, hours, minutes, seconds, ms)
  // O deslocamento é medido no próprio instante (duas passagens cobrem uma
  // eventual virada de horário de verão entre a estimativa e o resultado).
  const first = wall - offsetMs(new Date(wall))
  return new Date(wall - offsetMs(new Date(first)))
}

/** Primeiro instante do mês em São Paulo. */
export function spStartOfMonth(year: number, month: number): Date {
  return spDate(year, month, 1)
}

/** Último instante do mês em São Paulo (23:59:59.999). */
export function spEndOfMonth(year: number, month: number): Date {
  return new Date(spDate(year, month + 1, 1).getTime() - 1)
}

/** Início do dia de hoje em São Paulo, como instante. */
export function startOfToday(): Date {
  const { year, month, day } = spParts()
  return spDate(year, month, day)
}

/** Fim do dia de hoje em São Paulo, como instante (23:59:59.999 locais). */
export function endOfToday(): Date {
  return new Date(startOfToday().getTime() + 24 * 60 * 60 * 1000 - 1)
}
