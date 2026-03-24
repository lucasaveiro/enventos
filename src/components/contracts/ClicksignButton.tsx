'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { Send, Loader2, CheckCircle2, ExternalLink, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  ContractClause,
  ContractFormData,
  SpaceConfig,
  substituteClause,
} from '@/lib/contractTemplates'
import { ContractPDFDocument } from './ContractPDF'
import { ContractStatusBadge } from './ContractStatusBadge'
import { sendContractToClicksign } from '@/app/actions/clicksign'

interface ExistingSignature {
  status: string
  signingUrl?: string | null
}

interface Props {
  space: SpaceConfig
  clauses: ContractClause[]
  getFormData: () => ContractFormData
  isValid?: boolean
  eventId: number | null
  existingSignature?: ExistingSignature | null
  onAfterGenerate?: (pdfBlob: Blob, formData: ContractFormData, finalClauses: ContractClause[]) => void
}

type SendState = 'idle' | 'generating' | 'sending' | 'success' | 'error'

export default function ClicksignButton({
  space,
  clauses,
  getFormData,
  isValid,
  eventId,
  existingSignature,
  onAfterGenerate,
}: Props) {
  const [state, setState] = useState<SendState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [signingUrl, setSigningUrl] = useState<string | null>(null)

  const isAlreadySent =
    existingSignature &&
    ['sent_whatsapp', 'signed', 'closed'].includes(existingSignature.status)

  const handleSend = async () => {
    if (!eventId) return
    setError(null)

    try {
      // Step 1: Generate PDF
      setState('generating')
      const formData = getFormData()

      const finalClauses = clauses.map((clause) => ({
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

  // Se já foi enviado, mostra status
  if (isAlreadySent) {
    return (
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
