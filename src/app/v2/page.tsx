import { getHojeScreen } from '@/lib/v2/screens'
import { HojeClient } from '@/components/v2/screens/HojeClient'

export default async function HojePage() {
  const data = await getHojeScreen()
  return <HojeClient {...data} />
}
