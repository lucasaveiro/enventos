import type { Metadata } from 'next'
import './v2.css'
import { V2Shell } from '@/components/v2/V2Shell'
import { EventFormProvider } from '@/components/v2/EventFormProvider'
import { getPendingCount } from '@/lib/v2/screens'

export const metadata: Metadata = {
  title: 'Espaços Aveiro — versão 2.0',
  description: 'Nova interface do sistema de reservas, em teste. Mesmos dados da versão atual.',
}

export default async function V2Layout({ children }: { children: React.ReactNode }) {
  // O contador vem daqui, e não do shell: layout e página renderizam no mesmo
  // request, e as leituras são memoizadas com cache() — então a lista de
  // eventos que alimenta a contagem é a mesma que a página já carregou.
  const pendingCount = await getPendingCount()
  // O provider fica por fora da casca para que o próprio V2Shell (botão "Novo
  // evento") também consiga abrir o formulário.
  return (
    <EventFormProvider>
      <V2Shell pendingCount={pendingCount}>{children}</V2Shell>
    </EventFormProvider>
  )
}
