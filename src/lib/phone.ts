// Validação de telefone no padrão brasileiro de celular: (XX) XXXXX-XXXX
// 2 dígitos de DDD + 9 dígitos do número = 11 dígitos. É o formato que o
// Clicksign espera para enviar o link de assinatura por WhatsApp; números fora
// desse padrão (um dígito a mais/a menos) fazem a notificação não chegar.

export const BR_PHONE_DIGITS = 11

/** Conta apenas os dígitos de um telefone, ignorando máscara, espaços e símbolos. */
export function countPhoneDigits(phone: string | null | undefined): number {
  return (phone || '').replace(/\D/g, '').length
}

export type BrazilianPhoneCheck = 'empty' | 'ok' | 'too_long' | 'too_short'

/**
 * Classifica um telefone em relação ao padrão brasileiro de 11 dígitos.
 * - 'empty'     → sem dígitos (campo opcional, nada a validar)
 * - 'ok'        → exatamente 11 dígitos
 * - 'too_long'  → mais de 11 dígitos (pode ser um número internacional)
 * - 'too_short' → menos de 11 dígitos (provável erro de digitação)
 */
export function checkBrazilianPhone(phone: string | null | undefined): BrazilianPhoneCheck {
  const digits = countPhoneDigits(phone)
  if (digits === 0) return 'empty'
  if (digits === BR_PHONE_DIGITS) return 'ok'
  return digits > BR_PHONE_DIGITS ? 'too_long' : 'too_short'
}

/**
 * Converte o telefone do cadastro para o formato do link wa.me: só dígitos e
 * com código do país. Números de 10/11 dígitos (fixo ou celular brasileiro)
 * recebem o 55 na frente; números que já vêm com o país são mantidos.
 * Retorna null quando não há dígitos suficientes para montar o link.
 */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length < 10) return null
  return digits.length <= BR_PHONE_DIGITS ? `55${digits}` : digits
}

/**
 * Link do WhatsApp com a mensagem já preenchida (o app abre a conversa com o
 * texto no campo de digitação — quem envia é sempre o usuário).
 * Retorna null se o cliente não tiver telefone utilizável.
 */
export function whatsAppLink(
  phone: string | null | undefined,
  message: string,
): string | null {
  const number = toWhatsAppNumber(phone)
  if (!number) return null
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
