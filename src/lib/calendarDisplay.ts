import { endOfDay, subDays } from 'date-fns'

// Regra de exibição no calendário: evento que termina de madrugada (antes das
// 05:00) pertence visualmente ao dia anterior — o dia do término fica livre
// para outro evento. O contrato continua guardando o horário real; isto afeta
// apenas o card no calendário.
export const OVERNIGHT_CUTOFF_HOUR = 5

export function getCalendarDisplayEnd(start: Date, end: Date): Date {
  if (end.getHours() < OVERNIGHT_CUTOFF_HOUR) {
    const truncated = endOfDay(subDays(end, 1))
    if (truncated > start) return truncated
  }
  return end
}

// Primeira palavra de um nome ("Rancho Aveiro" -> "Rancho"); undefined quando
// vazio, para compor rótulos com .filter(Boolean).
export function firstWord(text?: string | null): string | undefined {
  return text?.trim().split(/\s+/)[0] || undefined
}
