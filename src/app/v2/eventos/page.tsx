import { getEventosScreen } from '@/lib/v2/screens'
import { EventosClient } from '@/components/v2/screens/EventosClient'

export default async function EventosPage() {
  const { events, spaces } = await getEventosScreen()
  return <EventosClient events={events} spaces={spaces} />
}
