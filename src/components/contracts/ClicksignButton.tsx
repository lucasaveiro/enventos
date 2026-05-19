'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { Send, Loader2, CheckCircle2, ExternalLink, AlertCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  ContractClause,
  ContractFormData,
  SpaceConfig,
  substituteClause,
} from '@/lib/contractTemplates'
import { ContractPDFDocument } from './ContractPDF'
import { ContractStatusBadge } from './ContractStatusBadge'
import { sendContractToClicksign, cancelContractSignature } from '@/app/actions/clicksign'

interface ExistingSignature {
  status: string
  signingUrl?: string | null
}

interface Props {
  space: SpaceConfig
  getClauses: () => ContractClause[]
  getFormData: () => ContractFormData
  isValid?: boolean
  eventId: number | null
  existingSignature?: ExistingSignature | null
  onBeforeGenerate?: () => void | Promise<void>
  onAfterGenerate?: (pdfBlob: Blob, formData: ContractFormData, finalClauses: ContractClause[]) => void
}

type SendState = 'idle' | 'generating' | 'sending' | 'success' | 'error'

// Estados parciais: o envio começou mas não chegou a notificar o WhatsApp.
// Pode indicar falha silenciosa (telefone inválido, indisponibilidade do Clicksign,
// etc) — mostrar aviso e oferecer cancelar/reenviar.
const PARTIAL_STATUSES = ['uploaded', 'signer_added']
const FINAL_SENT_STATUSES = ['sent_whatsapp', 'signed', 'closed']

export default function ClicksignButton({
  space,
  getClauses,
  getFormData,
  isValid,
  eventId,
  existingSignature,
  onBeforeGenerate,
  onAfterGenerate,
}: Props) {
  const [state, setState] = useState<SendState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [signingUrl, setSigningUrl] = useState<string | null>(null)

  const isPartial = existingSignature && PARTIAL_STATUSES.includes(existingSignature.status)
  const isFullySent = existingSignature && FINAL_SENT_STATUSES.includes(existingSignature.status)
  const [cancelling, setCancelling] = useState(false)

  const cancelExistingSignature = async (): Promise<boolean> => {
    if (!eventId) return false
    setCancelling(true)
    try {
      const result = await cancelContractSignature(eventId)
      if (result.success) return true
      setError(result.error || 'Erro ao cancelar contrato')
      setState('error')
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar')
      setState('error')
      return false
    } finally {
      setCancelling(false)
    }
  }

  const handleCancel = async () => {
    if (!eventId) return
    const message = isPartial
      ? 'O envio anterior ficou incompleto (cliente pode não ter recebido). Cancelar o registro para permitir um novo envio?'
      : 'Tem certeza que deseja cancelar o contrato atual no Clicksign? Isso permitirá enviar uma nova versão.'
    if (!confirm(message)) return
    const ok = await cancelExistingSignature()
    if (ok) {
      setState('idle')
      setError(null)
      setSigningUrl(null)
      window.location.reload()
    }
  }

  const handleSend = async () => {
    if (!eventId) return
    setError(null)

    // Se já há um signature ativo (parcial ou completo), pede confirmação para
    // cancelar antes de gerar o novo. Evita que o usuário crie registros conflitantes
    // ou envie duas vezes sem perceber.
    if (existingSignature && existingSignature.status !== 'cancelled') {
      const confirmMsg = isPartial
        ? 'Já existe um envio anterior incompleto para este evento (o cliente pode não ter recebido).\n\nDeseja cancelar o envio anterior e enviar este novo contrato?'
        : 'Já existe um contrato ativo para este evento no Clicksign.\n\nDeseja cancelar o contrato anterior e enviar este novo contrato?'
      if (!confirm(confirmMsg)) return
      const ok = await cancelExistingSignature()
      if (!ok) return
    }

    try {
      // Step 1: Generate PDF
      setState('generating')
      // Aplica dados do formulário nas cláusulas automaticamente antes de gerar
      if (onBeforeGenerate) await onBeforeGenerate()
      const formData = getFormData()
      const computedClauses = getClauses()

      const finalClauses = computedClauses.map((clause) => ({
        ...clause,
        content: substituteClause(clause.content, formData, space),
      }))

      const doc = <ContractPDFDocument formData={formData} clauses={finalClauses} space={space} />
      const blob = await pdf(doc).toBlob()

      // Step 2: Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

      // Step 3: Send to Clicksign via server action
      setState('sending')
      const result = await sendContractToClicksign({
        eventId,
        contractNumber: formData.contractNumber,
        spaceId: space.id,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        clientEmail: formData.clientEmail,
        clientCPF: formData.clientCPF,
        pdfBase64: base64,
        // Dados do contratado (proprietário/locador)
        contractorName: space.ownerName,
        contractorPhone: space.ownerPhone,
        contractorEmail: space.ownerEmail,
        contractorCPF: space.ownerCPF.replace(/\D/g, ''),
      })

      if (result.success) {
        setState('success')
        setSigningUrl(result.data?.signingUrl || null)
        if (onAfterGenerate) onAfterGenerate(blob, formData, finalClauses)
      } else {
        setState('error')
        setError(result.error || 'Erro ao enviar contrato')
      }
    } catch (err) {
      console.error('Erro ao enviar para Clicksign:', err)
      setState('error')
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    }
  }

  // Envio parcial: começou mas não completou (cliente provavelmente não recebeu)
  if (isPartial) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 max-w-md">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <ContractStatusBadge status={existingSignature!.status} />
          <span className="text-xs font-medium text-amber-700">Envio incompleto</span>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          O envio anterior não foi concluído — o cliente provavelmente não recebeu o link no WhatsApp.
          Cancele o registro abaixo e clique em &ldquo;Enviar para Clicksign&rdquo; novamente.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={cancelling}
          className="gap-1.5 text-xs text-red-600 border-red-300 hover:bg-red-50 w-fit"
        >
          {cancelling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          {cancelling ? 'Cancelando...' : 'Cancelar envio parcial'}
        </Button>
      </div>
    )
  }

  // Já foi enviado com sucesso (sent_whatsapp / signed / closed)
  if (isFullySent) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <ContractStatusBadge status={existingSignature!.status} />
          {existingSignature!.signingUrl && (
            <a
              href={existingSignature!.signingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Link de assinatura
            </a>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={cancelling}
          className="gap-1.5 text-xs text-red-600 border-red-300 hover:bg-red-50 w-fit"
        >
          {cancelling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          {cancelling ? 'Cancelando...' : 'Cancelar e Reenviar'}
        </Button>
      </div>
    )
  }

  // Estado de sucesso
  if (state === 'success') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Enviado via WhatsApp!
        </div>
        {signingUrl && (
          <a
            href={signingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Link
          </a>
        )}
      </div>
    )
  }

  // Estado de erro
  if (state === 'error') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span className="max-w-48 truncate">{error}</span>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setState('idle')}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  const isDisabled =
    !eventId || isValid === false || state === 'generating' || state === 'sending'
  const isLoading = state === 'generating' || state === 'sending'

  return (
    <Button
      type="button"
      onClick={handleSend}
      disabled={isDisabled}
      size="lg"
      className="gap-2 min-w-52 font-semibold bg-orange-500 hover:bg-orange-600 text-white"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {state === 'generating' ? 'Gerando PDF...' : 'Enviando para Clicksign...'}
        </>
      ) : (
        <>
          <Send className="h-4 w-4" />
          Enviar para Clicksign
        </>
      )}
    </Button>
  )
}
