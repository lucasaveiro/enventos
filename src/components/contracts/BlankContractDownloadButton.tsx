'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { FileDown, Loader2 } from 'lucide-react'
import {
  ContractClause,
  ContractFormData,
  PaymentConditionType,
  SpaceConfig,
  getInitialClauses,
  substituteClause,
} from '@/lib/contractTemplates'
import { ContractPDFDocument } from './ContractPDF'

// Formulário 100% vazio: substituteClause troca cada placeholder pelo rótulo
// entre colchetes ([NOME DO LOCATÁRIO], [CPF], [VALOR TOTAL]…), que é
// exatamente o formato desejado na minuta em branco enviada ao cliente.
export function createBlankFormData(): ContractFormData {
  return {
    contractNumber: '________',
    contractDate: '',
    clientName: '',
    clientCPF: '',
    clientRG: '',
    clientNationality: '',
    clientCivilStatus: '',
    clientProfession: '',
    clientRepName: '',
    clientRepRole: '',
    clientAddress: '',
    clientCity: '',
    clientState: '',
    clientPhone: '',
    clientEmail: '',
    eventDate: '',
    eventStartTime: '',
    eventEndTime: '',
    eventType: '',
    guestCount: '',
    dailyCount: '',
    packageType: '',
    eventCheckoutDate: '',
    totalValue: '',
    depositValue: '',
    depositDueDate: '',
    remainingValue: '',
    remainingDueDate: '',
    paymentMethod: '',
    paymentCondition: '' as PaymentConditionType,
    installments: [],
    cautionValue: '',
    benchCount: '',
    observations: '',
  }
}

export function buildBlankClauses(space: SpaceConfig): ContractClause[] {
  const blankData = createBlankFormData()
  return getInitialClauses(space.id).map((clause) => ({
    ...clause,
    // Quantidades de mobiliário são derivadas do nº de convidados; sem convidados
    // sairiam "0"/"20" e pareceriam definitivas. No modelo em branco viram lacunas.
    content: substituteClause(
      clause.content
        .replace(/{chairCount}/g, '____')
        .replace(/{tableCount}/g, '____')
        .replace(/{benchCount}/g, '____'),
      blankData,
      space
    ),
  }))
}

interface Props {
  space: SpaceConfig
}

export default function BlankContractDownloadButton({ space }: Props) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const doc = (
        <ContractPDFDocument
          formData={createBlankFormData()}
          clauses={buildBlankClauses(space)}
          space={space}
          isBlankModel
        />
      )
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Modelo-Contrato-${space.displayName.replace(/\s+/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erro ao gerar modelo de contrato em branco:', err)
      alert('Ocorreu um erro ao gerar o PDF do modelo. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
      style={{ backgroundColor: space.color }}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Gerando PDF...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" />
          Baixar modelo em PDF
        </>
      )}
    </button>
  )
}
