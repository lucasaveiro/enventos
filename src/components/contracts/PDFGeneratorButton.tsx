'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ContractClause, ContractFormData, SpaceConfig, substituteClause } from '@/lib/contractTemplates'
import { ContractPDFDocument } from './ContractPDF'

interface Props {
  space: SpaceConfig
  getClauses: () => ContractClause[]
  getFormData: () => ContractFormData
  isValid?: boolean
  onBeforeGenerate?: () => void
  onAfterGenerate?: (pdfBlob: Blob, formData: ContractFormData, finalClauses: ContractClause[]) => void
}

export default function PDFGeneratorButton({ space, getClauses, getFormData, isValid, onBeforeGenerate, onAfterGenerate }: Props) {
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      // Aplica dados do formulário nas cláusulas automaticamente antes de gerar,
      // garantindo que o PDF sempre reflita os valores atuais — mesmo se o usuário
      // não clicou em "Aplicar dados do formulário".
      if (onBeforeGenerate) onBeforeGenerate()
      const formData = getFormData()
      const computedClauses = getClauses()

      // Segurança extra: substitui qualquer placeholder residual (cláusulas editadas
      // pelo usuário não passam por getClauses; substituteClause aqui é idempotente).
      const finalClauses = computedClauses.map((clause) => ({
        ...clause,
        content: substituteClause(clause.content, formData, space),
      }))

      const doc = <ContractPDFDocument formData={formData} clauses={finalClauses} space={space} />
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Contrato-${formData.contractNumber}-${space.prefix}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      if (onAfterGenerate) onAfterGenerate(blob, formData, finalClauses)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      alert('Ocorreu um erro ao gerar o PDF. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      onClick={handleGenerate}
      disabled={loading || isValid === false}
      size="lg"
      className="gap-2 min-w-52 font-semibold"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Gerando PDF...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" />
          Gerar Contrato em PDF
        </>
      )}
    </Button>
  )
}
