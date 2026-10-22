// Regra comercial dos dois espaços (Rancho e Estância): pagamento parcelado
// exige entrada (sinal) de exatamente 20% do valor total; o saldo de 80% é
// dividido nas parcelas. Pagamento único (à vista) e cartão de crédito ficam
// fora da regra. Vale para o plano de pagamento do evento, o assistente de
// Novo Contrato e o editor de contrato — todos validam por aqui.
export const ENTRADA_PERCENT = 20

/** Entrada exigida no parcelado, arredondada em centavos. */
export function entradaPadrao(total: number): number {
  return Math.round(total * ENTRADA_PERCENT) / 100
}

export function isEntradaPadrao(total: number, entrada: number): boolean {
  return Math.abs(entrada - entradaPadrao(total)) < 0.01
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function mensagemEntradaPadrao(total: number): string {
  return `Pagamento parcelado exige entrada de ${ENTRADA_PERCENT}% do valor total (${formatBRL(entradaPadrao(total))}).`
}

/**
 * Valida um plano de pagamento. Um único pagamento é à vista e passa; com mais
 * de um, é parcelado: precisa de exatamente um sinal, de 20% do total.
 * Retorna a mensagem de erro, ou null se o plano é válido.
 */
export function validarPlanoParcelado(
  total: number,
  itens: { amount: number; isSinal: boolean }[]
): string | null {
  const pagamentos = itens.filter((item) => item.amount > 0)
  if (pagamentos.length <= 1) return null

  const sinais = pagamentos.filter((item) => item.isSinal)
  if (sinais.length !== 1 || !isEntradaPadrao(total, sinais[0].amount)) {
    return mensagemEntradaPadrao(total)
  }
  return null
}
