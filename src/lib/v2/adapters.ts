// ── Tradução banco → tela (v2) ─────────────────────────────────────────────
// Funções puras, sem Prisma e sem I/O: rodam tanto no servidor (screens.ts)
// quanto no cliente. Saíram de data.ts quando a leitura migrou para o servidor,
// para que as duas pontas usem exatamente a mesma tradução.

import type { V2ContractStatus, V2PaymentStatus, V2Space, V2Stage } from './types'

// ── Espaços ────────────────────────────────────────────────────────────────
// A cor é parte da identidade do espaço em todas as telas. Os dois espaços
// atuais têm cor fixa pelo slug; qualquer espaço novo recebe a próxima cor da
// paleta, então cadastrar um terceiro espaço não quebra nada.
const SLUG_COLORS: Record<string, string> = {
  'rancho-aveiro': '#0F7B6C',
  'estancia-aveiro': '#B4530A',
}
const PALETTE = ['#1B5EDB', '#6740C4', '#B42318', '#96660B', '#0E7A4F', '#A83277']

export type RawSpace = {
  id: number
  name: string
  slug?: string | null
  address?: string | null
}

export function toSpace(raw: RawSpace, index = 0): V2Space {
  const color = (raw.slug && SLUG_COLORS[raw.slug]) || PALETTE[index % PALETTE.length]
  return {
    id: raw.id,
    name: raw.name,
    short: raw.name.split(' ')[0],
    slug: raw.slug ?? null,
    address: raw.address ?? null,
    color,
    // 8 dígitos: a mesma cor com 12% de opacidade, para o fundo das pílulas.
    soft: `${color}1f`,
  }
}

// Rótulos das categorias de lançamento. Mesmos textos da v1, mais
// 'installment_payment', que a v1 deixa passar com a chave crua.
const CATEGORY_LABELS: Record<string, string> = {
  event_payment: 'Pagamento de evento',
  installment_payment: 'Parcela de aluguel',
  deposit: 'Sinal/Depósito',
  rental: 'Aluguel',
  rental_installment: 'Parcela de aluguel',
  other_income: 'Outras receitas',
  service_cost: 'Custo de serviço',
  maintenance: 'Manutenção',
  supplies: 'Suprimentos',
  utilities: 'Utilidades',
  professional_payment: 'Pagamento a profissional',
  cleaning: 'Limpeza',
  other_expense: 'Outras despesas',
}

export const categoryLabel = (key: string) => CATEGORY_LABELS[key] ?? key

const EVENT_TYPE_LABELS: Record<string, string> = {
  casamento: 'Casamento',
  aniversario: 'Aniversário',
  confraternizacao: 'Confraternização',
  outros: 'Evento',
}

export const eventTypeLabel = (key: string | null | undefined) =>
  EVENT_TYPE_LABELS[key ?? ''] ?? 'Evento'

/**
 * Estado do contrato a partir da última assinatura registrada, caindo para o
 * campo contractStatus do evento quando não há assinatura na Clicksign.
 * 'signed' na Clicksign significa PARCIALMENTE assinado (o evento emite um
 * `sign` por signatário); 'closed' é que todos assinaram.
 */
export function toContractStatus(
  signatureStatus: string | undefined,
  contractStatus: string | null | undefined,
  hasDocument: boolean,
): V2ContractStatus {
  switch (signatureStatus) {
    case 'closed':
      return 'signed'
    case 'signed':
      return 'partial'
    case 'uploaded':
    case 'signer_added':
    case 'sent_whatsapp':
      return 'sent'
  }
  if (contractStatus === 'signed') return 'signed'
  if (contractStatus === 'sent') return 'sent'
  return hasDocument ? 'draft' : 'none'
}

export function toStage(
  event: { start: Date; status: string; category?: string },
  contract: V2ContractStatus,
  now: Date,
): V2Stage {
  if (event.category === 'visit') return 'visita'
  if (event.start < now && (contract === 'signed' || event.status === 'reserved')) return 'realizado'
  if (contract === 'signed') return 'confirmado'
  if (contract === 'sent' || contract === 'partial') return 'contrato'
  if (contract === 'draft' || event.status === 'confirming') return 'proposta'
  return 'interesse'
}

export function toPayment(status: string | null | undefined): V2PaymentStatus {
  return status === 'paid' || status === 'partial' ? status : 'unpaid'
}
