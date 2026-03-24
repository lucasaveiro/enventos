import { notFound } from 'next/navigation'
import { SPACES } from '@/lib/contractTemplates'
import { ContractEditor } from '@/components/contracts/ContractEditor'

interface Props {
  params: Promise<{ space: string }>
  searchParams: Promise<{ eventId?: string; contractId?: string }>
}

export async function generateStaticParams() {
  return Object.keys(SPACES).map((id) => ({ space: id }))
}

export async function generateMetadata({ params }: Props) {
  const { space: spaceId } = await params
  const space = SPACES[spaceId]
  if (!space) return {}
  return { title: `Contrato — ${space.displayName}` }
}

export default async function ContractSpacePage({ params, searchParams }: Props) {
  const { space: spaceId } = await params
  const { eventId, contractId } = await searchParams
  const space = SPACES[spaceId]

  if (!space) notFound()

  return (
    <ContractEditor
      space={space}
      eventId={eventId ? Number(eventId) : undefined}
      loadContractId={contractId ? Number(contractId) : undefined}
    />
  )
}
