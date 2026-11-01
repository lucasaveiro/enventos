'use client'

import { useEffect, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { Eye, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { ContractClause, ContractFormData, SpaceConfig, substituteClause } from '@/lib/contractTemplates'
import { ContractPDFDocument } from './ContractPDF'

interface Props {
  space: SpaceConfig
  getClauses: () => ContractClause[]
  getFormData: () => ContractFormData
  isValid?: boolean
  onBeforeGenerate?: () => void | Promise<void>
}

/**
 * Gera o PDF do contrato exatamente como sairia no download/Clicksign e o exibe
 * na tela, SEM salvar versão no evento e SEM enviar nada ao cliente.
 */
export default function PDFPreviewButton({ space, getClauses, getFormData, isValid, onBeforeGenerate }: Props) {
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!url) return
    return () => URL.revokeObjectURL(url)
  }, [url])

  const handlePreview = async () => {
    setLoading(true)
    try {
      if (onBeforeGenerate) await onBeforeGenerate()
      const formData = getFormData()
      const finalClauses = getClauses().map((clause) => ({
        ...clause,
        content: substituteClause(clause.content, formData, space),
      }))
      const blob = await pdf(<ContractPDFDocument formData={formData} clauses={finalClauses} space={space} />).toBlob()
      setUrl(URL.createObjectURL(blob))
    } catch (err) {
      console.error('Erro ao gerar pré-visualização:', err)
      alert('Ocorreu um erro ao gerar a pré-visualização. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={handlePreview}
        disabled={loading || isValid === false}
        className="gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
        {loading ? 'Gerando...' : 'Pré-visualizar'}
      </Button>

      <Dialog open={!!url} onOpenChange={(open) => { if (!open) setUrl(null) }}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Pré-visualização do contrato</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--muted-foreground)]">
            Nada foi salvo nem enviado ao cliente. Feche para continuar editando.
          </p>
          {url && (
            <iframe
              src={url}
              title="Pré-visualização do contrato"
              className="w-full h-[65vh] rounded-md border border-[var(--border)] bg-white"
            />
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 w-fit"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir o PDF em outra aba
            </a>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setUrl(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
