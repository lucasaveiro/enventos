const BASE_URLS = {
  sandbox: 'https://sandbox.clicksign.com/api/v1',
  production: 'https://app.clicksign.com/api/v1',
} as const

function getBaseUrl(): string {
  const env = process.env.CLICKSIGN_ENVIRONMENT || 'sandbox'
  return BASE_URLS[env as keyof typeof BASE_URLS] || BASE_URLS.sandbox
}

function getToken(): string {
  const token = process.env.CLICKSIGN_ACCESS_TOKEN
  if (!token) throw new Error('CLICKSIGN_ACCESS_TOKEN não configurado')
  return token
}

// NOTE: Clicksign API v1 only supports access_token as a query parameter.
// This is not ideal (tokens in URLs can appear in server logs), but it is
// the only auth method the API supports. No Authorization header option available.
async function request<T>(path: string, body: unknown): Promise<T> {
  const url = `${getBaseUrl()}${path}?access_token=${getToken()}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Clicksign API error (${res.status}): ${text}`)
  }

  return res.json() as Promise<T>
}

// ── Upload Document ──────────────────────────────────────────────────────────

interface UploadDocumentParams {
  path: string
  contentBase64: string
  deadlineAt: string
}

interface UploadDocumentResponse {
  document: { key: string; path: string; status: string }
}

export async function uploadDocument(params: UploadDocumentParams): Promise<{ documentKey: string }> {
  const data = await request<UploadDocumentResponse>('/documents', {
    document: {
      path: params.path,
      content_base64: params.contentBase64,
      deadline_at: params.deadlineAt,
      auto_close: true,
      locale: 'pt-BR',
      remind_interval: 3,
    },
  })
  return { documentKey: data.document.key }
}

// ── Create Signer ────────────────────────────────────────────────────────────

interface CreateSignerParams {
  email: string
  phoneNumber: string // digits only, e.g. "5511999999999"
  name: string
  documentation: string // CPF (11 dígitos) ou CNPJ (14 dígitos) — só CPF é enviado à Clicksign
}

interface CreateSignerResponse {
  signer: { key: string }
}

export async function createSigner(params: CreateSignerParams): Promise<{ signerKey: string }> {
  // O campo `documentation` do signatário na Clicksign valida ESTRITAMENTE como CPF
  // (11 dígitos). Cliente pessoa jurídica tem CNPJ (14 dígitos): enviá-lo aqui faz a
  // API retornar 422 "CPF inválido" e o envio inteiro sofre rollback. Para CNPJ (ou
  // documento ausente) o signatário assina sem verificação de CPF (has_documentation:false).
  const docDigits = (params.documentation || '').replace(/\D/g, '')
  const hasCPF = docDigits.length === 11

  const data = await request<CreateSignerResponse>('/signers', {
    signer: {
      email: params.email,
      phone_number: params.phoneNumber,
      auths: ['whatsapp'],
      name: params.name,
      ...(hasCPF
        ? { documentation: docDigits, has_documentation: true }
        : { has_documentation: false }),
      communicate_by: 'whatsapp',
    },
  })
  return { signerKey: data.signer.key }
}

// ── Add Signer to Document ──────────────────────────────────────────────────

interface AddSignerParams {
  documentKey: string
  signerKey: string
  signAs?: string
}

interface AddSignerResponse {
  list: { key: string; request_signature_key: string; url: string }
}

export async function addSignerToDocument(
  params: AddSignerParams
): Promise<{ requestSignatureKey: string; url: string }> {
  const data = await request<AddSignerResponse>('/lists', {
    list: {
      document_key: params.documentKey,
      signer_key: params.signerKey,
      sign_as: params.signAs || 'sign',
      refusable: true,
    },
  })
  return {
    requestSignatureKey: data.list.request_signature_key,
    url: data.list.url,
  }
}

// ── Get Document (with signers) ───────────────────────────────────────────────

export interface ClicksignDocumentSigner {
  key: string
  request_signature_key: string
  name: string
  email: string
  sign_as: string
  url: string
  // Presente apenas quando o signatário já assinou.
  signature?: unknown
}

export interface ClicksignDocumentDetail {
  key: string
  status: string // running, closed, canceled
  deadline_at: string | null
  signers: ClicksignDocumentSigner[]
}

export async function getDocument(documentKey: string): Promise<ClicksignDocumentDetail> {
  const url = `${getBaseUrl()}/documents/${documentKey}?access_token=${getToken()}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Clicksign get document error (${res.status}): ${text}`)
  }

  const data = (await res.json()) as { document: ClicksignDocumentDetail }
  return data.document
}

// ── Update Document Deadline (prorrogar prazo) ────────────────────────────────

export async function updateDocumentDeadline(
  documentKey: string,
  deadlineAt: string
): Promise<void> {
  const url = `${getBaseUrl()}/documents/${documentKey}?access_token=${getToken()}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ document: { deadline_at: deadlineAt } }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Clicksign update deadline error (${res.status}): ${text}`)
  }
}

// ── Cancel Document ─────────────────────────────────────────────────────────

export async function cancelDocument(documentKey: string): Promise<void> {
  const url = `${getBaseUrl()}/documents/${documentKey}/cancel?access_token=${getToken()}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Clicksign cancel error (${res.status}): ${text}`)
  }
}

// ── Notify by WhatsApp ──────────────────────────────────────────────────────

export async function notifyByWhatsapp(requestSignatureKey: string): Promise<void> {
  const url = `${getBaseUrl()}/notify_by_whatsapp?access_token=${getToken()}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ request_signature_key: requestSignatureKey }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Clicksign WhatsApp notification error (${res.status}): ${text}`)
  }
}

// ── Webhook HMAC Verification ───────────────────────────────────────────────

export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  hmacKey: string
): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(hmacKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )

  // Convert hex signature to Uint8Array for timing-safe comparison via crypto.subtle.verify
  const sigBytes = new Uint8Array(
    (signature.match(/.{1,2}/g) || []).map((byte) => parseInt(byte, 16))
  )

  return crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payload))
}

// ── Webhook Event Types ─────────────────────────────────────────────────────

export interface ClicksignWebhookPayload {
  event: {
    name: string
    occurred_at: string
    data?: Record<string, unknown>
  }
  document: {
    key: string
    path: string
    status: string
  }
  signers?: Array<{
    key: string
    email: string
    sign_as: string
    auths: string[]
    phone_number?: string
  }>
}
