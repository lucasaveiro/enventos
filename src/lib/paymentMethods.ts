// Vocabulário canônico da forma de pagamento (PaymentInstallment.paymentMethod).
// No banco gravamos os códigos; rótulos são usados na UI e no texto do contrato.
// Antes desta unificação o wizard gravava rótulos ("PIX", "Transferência
// bancária") e os modais de parcela gravavam códigos ("pix", "bank_transfer") —
// o normalizador aceita os dois para os dados já existentes.
export const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'bank_transfer', label: 'Transferência bancária' },
  { value: 'credit_card', label: 'Cartão de crédito' },
  { value: 'debit_card', label: 'Cartão de débito' },
  { value: 'boleto', label: 'Boleto bancário' },
] as const

const LEGACY_TO_CODE: Record<string, string> = {
  pix: 'pix',
  dinheiro: 'cash',
  cash: 'cash',
  'transferência bancária': 'bank_transfer',
  'transferencia bancaria': 'bank_transfer',
  bank_transfer: 'bank_transfer',
  'cartão de crédito': 'credit_card',
  'cartao de credito': 'credit_card',
  credit_card: 'credit_card',
  'cartão de débito': 'debit_card',
  'cartao de debito': 'debit_card',
  debit_card: 'debit_card',
  'boleto bancário': 'boleto',
  'boleto bancario': 'boleto',
  boleto: 'boleto',
}

// Converte qualquer valor gravado (código novo ou rótulo legado) para o código
// canônico. Vazio vira null; texto desconhecido (valor livre digitado no
// contrato) é preservado como está.
export function normalizePaymentMethod(value?: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return LEGACY_TO_CODE[trimmed.toLowerCase()] ?? trimmed
}

// Rótulo para exibição e para o texto do contrato; texto livre volta como está.
export function paymentMethodLabel(value?: string | null): string {
  const normalized = normalizePaymentMethod(value)
  if (!normalized) return ''
  return PAYMENT_METHODS.find((m) => m.value === normalized)?.label ?? normalized
}
