'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { ClipboardList, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ContractFormData, SpaceConfig } from '@/lib/contractTemplates'
import { getInventoryItems } from '@/app/actions/inventory'
import { VistoriaPDFDocument, VistoriaItem } from './VistoriaPDF'

interface Props {
  space: SpaceConfig
  getFormData: () => ContractFormData
  isValid?: boolean
}

// Filtro por pacote: itens do Pacote Simples também pertencem ao Completo (o
// contrato define o Completo como "todos os itens do pacote simples mais ...").
// Itens sem pacote (null) entram sempre. Sem pacote definido no contrato,
// lista tudo — melhor sobrar item no termo do que faltar.
function filterByPackage(items: VistoriaItem[], packageType: string): VistoriaItem[] {
  const pkg = (packageType || '').toLowerCase()
  if (pkg === 'simples') {
    return items.filter((item) => item.package === null || item.package === 'simples')
  }
  return items
}

export default function VistoriaDownloadButton({ space, getFormData, isValid }: Props) {
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const formData = getFormData()
      const result = await getInventoryItems(space.id)
      if (!result.success) {
        alert(result.error)
        return
      }

      const items = filterByPackage(result.data, formData.packageType)
      if (items.length === 0) {
        const proceed = confirm(
          'Nenhum item cadastrado no inventário deste espaço. Gerar o termo apenas com linhas em branco?\n\n' +
            'Para cadastrar os itens, acesse Configurações → Inventário da Vistoria.'
        )
        if (!proceed) return
      }

      const doc = <VistoriaPDFDocument formData={formData} space={space} items={items} />
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Termo-Vistoria-${formData.contractNumber || space.prefix}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erro ao gerar Termo de Vistoria:', err)
      alert('Ocorreu um erro ao gerar o Termo de Vistoria. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGenerate}
      disabled={loading || isValid === false}
      size="lg"
      className="gap-2 font-semibold"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Gerando termo...
        </>
      ) : (
        <>
          <ClipboardList className="h-4 w-4" />
          Termo de Vistoria (PDF)
        </>
      )}
    </Button>
  )
}
