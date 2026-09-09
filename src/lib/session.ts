/**
 * Assinatura e verificação do cookie de sessão.
 *
 * Este módulo roda nos DOIS runtimes:
 *   - Edge (middleware.ts) — não pode tocar em Prisma nem em next/headers;
 *   - Node (server actions, route handlers).
 *
 * Por isso usa apenas Web Crypto (crypto.subtle), disponível nos dois.
 *
 * Formato do cookie: `<token>.<expiraEmMs>.<hmacBase64Url>`
 * O HMAC cobre `<token>.<expiraEmMs>`, então nem o token nem a validade podem
 * ser forjados sem a chave. O token continua sendo o mesmo UUID guardado na
 * tabela AdminSession — o banco segue como fonte da verdade para revogação.
 */

const AUTH_COOKIE_NAME = 'auth_session'

export { AUTH_COOKIE_NAME }

export interface SessionPayload {
  /** UUID gravado em AdminSession.token */
  token: string
  /** Expiração embutida no cookie (epoch ms) */
  expiresAt: number
}

const encoder = new TextEncoder()

/**
 * Chave do HMAC. `AUTH_SECRET` é o ideal (segredo dedicado e longo); na falta
 * dele reaproveitamos `ADMIN_PASSWORD`, que já é obrigatório para o login
 * funcionar — assim a correção não depende de configurar variável nova.
 *
 * As referências a process.env são estáticas de propósito: o bundle do Edge
 * substitui esse acesso em build time, e acesso dinâmico (process.env[x]) não
 * funcionaria no middleware.
 */
function getSecret(): string | null {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || null
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): ArrayBuffer | null {
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'))
    // ArrayBuffer explícito: crypto.subtle.verify exige BufferSource, e um
    // Uint8Array solto é tipado como ArrayBufferLike (pode ser SharedArrayBuffer).
    const buffer = new ArrayBuffer(binary.length)
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return buffer
  } catch {
    return null
  }
}

function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

/** Monta o valor assinado do cookie. Lança se não houver segredo configurado. */
export async function signSessionCookie(
  token: string,
  expiresAt: Date
): Promise<string> {
  const secret = getSecret()
  if (!secret) {
    throw new Error(
      'Sessão não pode ser assinada: defina AUTH_SECRET (ou ADMIN_PASSWORD).'
    )
  }

  const payload = `${token}.${expiresAt.getTime()}`
  const signature = await crypto.subtle.sign(
    'HMAC',
    await importKey(secret),
    encoder.encode(payload)
  )

  return `${payload}.${toBase64Url(new Uint8Array(signature))}`
}

/**
 * Confere a assinatura do cookie, sem olhar a expiração.
 * Só deve ser usado no logout, para descobrir qual linha de AdminSession
 * apagar mesmo quando a sessão já expirou. Para autorizar acesso use
 * `verifySessionCookie`.
 */
export async function readSessionToken(
  value: string | undefined | null
): Promise<string | null> {
  const payload = await parseAndVerify(value)
  return payload ? payload.token : null
}

/**
 * Verifica assinatura E expiração. Retorna null para cookie ausente, malformado,
 * forjado ou vencido — ou seja, tudo que não for uma sessão legítima e viva.
 */
export async function verifySessionCookie(
  value: string | undefined | null
): Promise<SessionPayload | null> {
  const payload = await parseAndVerify(value)
  if (!payload) return null
  if (payload.expiresAt <= Date.now()) return null
  return payload
}

async function parseAndVerify(
  value: string | undefined | null
): Promise<SessionPayload | null> {
  if (!value) return null

  // Sem segredo configurado, falha fechado: ninguém entra.
  const secret = getSecret()
  if (!secret) return null

  // O token é um UUID (sem pontos), então exatamente 3 partes.
  const parts = value.split('.')
  if (parts.length !== 3) return null

  const [token, expiresRaw, signatureRaw] = parts
  if (!token || !expiresRaw || !signatureRaw) return null

  const expiresAt = Number(expiresRaw)
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= 0) return null

  const signature = fromBase64Url(signatureRaw)
  if (!signature) return null

  // crypto.subtle.verify compara em tempo constante.
  const valid = await crypto.subtle.verify(
    'HMAC',
    await importKey(secret),
    signature,
    encoder.encode(`${token}.${expiresRaw}`)
  )
  if (!valid) return null

  return { token, expiresAt }
}
