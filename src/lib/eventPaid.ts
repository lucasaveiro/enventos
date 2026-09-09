// ── Quanto já foi pago de um evento ────────────────────────────────────────
// Regra ÚNICA, para a v1 e a v2 nunca mostrarem números diferentes para a
// mesma pergunta. Extraída de FinancialSummaryCard (que agora chama daqui);
// recalculateEventPaymentStatus, no servidor, aplica a mesma regra ao gravar
// event.paymentStatus. Se a regra mudar, muda aqui.

export type PaidInstallment = {
  id?: number
  status: string
  amount: number
  paidAmount: number | null
  transactionId?: number | null
}

export type PaidTransaction = {
  id: number
  type: string
  status: string
  amount: number
}

export function computeEventPaid(input: {
  deposit: number
  installments: PaidInstallment[]
  transactions?: PaidTransaction[]
}): number {
  const { deposit, installments, transactions = [] } = input

  const paidFromInstallments = installments
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + (i.paidAmount ?? i.amount), 0)

  // Receitas já pagas que NÃO estão ligadas a uma parcela. As ligadas já estão
  // representadas pela própria parcela — contar as duas dobraria o valor.
  const linked = new Set(
    installments.map((i) => i.transactionId).filter((id): id is number => id != null),
  )
  const paidFromTransactions = transactions
    .filter((t) => t.type === 'income' && t.status === 'paid' && !linked.has(t.id))
    .reduce((sum, t) => sum + t.amount, 0)

  // Sem nenhuma parcela cadastrada, o sinal do evento é a linha de base
  // histórica do que já entrou.
  return installments.length > 0
    ? paidFromInstallments + paidFromTransactions
    : deposit + paidFromTransactions
}
