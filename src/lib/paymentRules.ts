import { inteiroPorExtenso } from '@/lib/extenso'

// Regra comercial dos dois espaços (Rancho e Estância): pagamento parcelado
// exige entrada (sinal) de no mínimo 20% do valor total; o percentual é
// digitado pelo usuário e o saldo restante é dividido nas parcelas. Pagamento
// único (à vista) e cartão de crédito ficam fora da regra. Vale para o plano de
// pagamento do evento, o assistente de Novo Contrato e o editor de contrato —
// todos validam por aqui.
export const ENTRADA_MIN_PERCENT = 20

/** Entrada correspondente a um percentual do total, arredondada em centavos. */
export function entradaPorPercentual(total: number, percent: number): number {
  return Math.round(total * percent) / 100
}

/** Menor entrada aceita no parcelado. */
export function entradaMinima(total: number): number {
  return entradaPorPercentual(total, ENTRADA_MIN_PERCENT)
}

export function isEntradaValida(total: number, entrada: number): boolean {
  return entrada >= entradaMinima(total) - 0.005
}

/** Percentual digitado ("25", "25,5") como número, ou NaN. */
export function parsePercent(value: string | number | undefined | null): number {
  if (typeof value === 'number') return value
  return parseFloat(String(value ?? '').trim().replace(',', '.'))
}

/** Erro do percentual digitado no parcelado, ou null se é aceito. */
export function validarPercentualEntrada(percent: number): string | null {
  if (isNaN(percent)) return 'Informe o percentual da entrada.'
  if (percent < ENTRADA_MIN_PERCENT) return `A entrada não pode ser menor que ${ENTRADA_MIN_PERCENT}% do valor total.`
  if (percent >= 100) return 'No parcelado a entrada tem que ser menor que 100%. Para pagamento único, use à vista.'
  return null
}

/**
 * Percentual (até 2 casas) que a entrada representa do total, ou null quando a
 * entrada não sai de nenhum percentual assim (valor negociado em reais).
 */
export function percentualDaEntrada(total: number, entrada: number): number | null {
  if (!(total > 0) || isNaN(entrada)) return null
  const percent = Math.round((entrada / total) * 10000) / 100
  return Math.abs(entradaPorPercentual(total, percent) - entrada) < 0.01 ? percent : null
}

/** "25" / "25,5" — para campos e textos. */
export function formatPercent(percent: number): string {
  return percent.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

/** "25% (vinte e cinco por cento)"; com casas decimais, só os algarismos. */
export function percentPorExtenso(percent: number): string {
  if (!Number.isInteger(percent)) return `${formatPercent(percent)}%`
  return `${percent}% (${inteiroPorExtenso(percent)} por cento)`
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function mensagemEntradaMinima(total: number): string {
  return `Pagamento parcelado exige entrada de no mínimo ${ENTRADA_MIN_PERCENT}% do valor total (${formatBRL(entradaMinima(total))}).`
}

/**
 * Valida um plano de pagamento. Um único pagamento é à vista e passa; com mais
 * de um, é parcelado: precisa de exatamente um sinal, de no mínimo 20% do total.
 * Retorna a mensagem de erro, ou null se o plano é válido.
 */
export function validarPlanoParcelado(
  total: number,
  itens: { amount: number; isSinal: boolean }[]
): string | null {
  const pagamentos = itens.filter((item) => item.amount > 0)
  if (pagamentos.length <= 1) return null

  const sinais = pagamentos.filter((item) => item.isSinal)
  if (sinais.length !== 1 || !isEntradaValida(total, sinais[0].amount)) {
    return mensagemEntradaMinima(total)
  }
  return null
}
