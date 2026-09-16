import { getCadastrosScreen } from '@/lib/v2/screens'
import { CadastrosClient } from '@/components/v2/screens/CadastrosClient'

export default async function CadastrosPage() {
  const data = await getCadastrosScreen()
  return <CadastrosClient {...data} />
}
