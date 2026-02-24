'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ContractClause, ContractFormData, SpaceConfig } from '@/lib/contractTemplates'
import { ContractPDFDocument } from './ContractPDF'

interface Props {
  space: SpaceConfig
  clauses: ContractClause[]
  getFormData: () => ContractFormData
}

export default function PDFGeneratorButton({ space, clauses, getFormData }: Props) {
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const formData = getFormData()
      const doc = <ContractPDFDocument formData={formData} clauses={clauses} space={space} />
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Contrato-${formData.contractNumber}-${space.prefix}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
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
      disabled={loading}
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
