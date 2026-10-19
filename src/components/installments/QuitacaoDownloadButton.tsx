'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { BadgeCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getQuitacaoData, saveGeneratedQuitacao } from '@/app/actions/quitacao'
import { nomeArquivoQuitacao } from '@/lib/quitacao'
import { QuitacaoPDFDocument } from '@/components/contracts/QuitacaoPDF'

interface Props {
  eventId: number
  /** Chamado depois que a quitação foi guardada no histórico (para recarregar a lista). */
  onSaved?: () => void | Promise<void>
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Botão "Declaração de Quitação": aparece na tela do evento só quando todas as
// parcelas estão pagas (regra em lib/quitacao). Os dados vêm do servidor, que
// refaz a validação; o PDF é montado no navegador como os demais documentos e,
// depois de baixado, é guardado no histórico do evento.
export function QuitacaoDownloadButton({ eventId, onSaved }: Props) {
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const result = await getQuitacaoData(eventId)
      if (!result.success) {
        alert(result.error)
        return
      }

      const fileName = nomeArquivoQuitacao(result.data)
      const blob = await pdf(<QuitacaoPDFDocument data={result.data} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Guarda a cópia entregue. O download já aconteceu; se a gravação falhar,
      // o usuário fica sabendo e pode gerar de novo.
      const saved = await saveGeneratedQuitacao({
        eventId,
        pdfBase64: await blobToBase64(blob),
        pdfFileName: fileName,
        contractNumber: result.data.contrato.numero,
        verificationCode: result.data.codigoVerificacao,
        totalReceived: result.data.totalRecebido,
      })
      if (!saved.success) {
        alert(saved.error)
        return
      }
      if (onSaved) await onSaved()
    } catch (err) {
      console.error('Erro ao gerar Declaração de Quitação:', err)
      alert('Ocorreu um erro ao gerar a Declaração de Quitação. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="success"
      size="sm"
      className="gap-1"
      onClick={handleGenerate}
      disabled={loading}
      title="Gera o PDF da Declaração de Quitação para enviar ao cliente"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
      {loading ? 'Gerando...' : 'Declaração de Quitação'}
    </Button>
  )
}
