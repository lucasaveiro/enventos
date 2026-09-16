export const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

export const brlExact = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

// ── Mês como texto ("2026-09") ─────────────────────────────────────────────
// Um Date de "primeiro dia do mês" montado no servidor (UTC) chega ao navegador
// em Brasília como 21h do último dia do mês anterior. Entre servidor e tela o
// mês viaja como chave, e cada lado monta o Date no próprio fuso.

/** Chave "yyyy-MM" para ano e mês (0-11); mês pode transbordar (12 → janeiro seguinte). */
export function monthKeyOf(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Chave "yyyy-MM" → primeiro dia do mês, à meia-noite no fuso de quem renderiza. */
export function monthFromKey(key: string): Date {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1)
}
