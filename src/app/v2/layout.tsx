import type { Metadata } from 'next'
import './v2.css'
import { V2Shell } from '@/components/v2/V2Shell'
import { getPendingCount } from '@/lib/v2/screens'

export const metadata: Metadata = {
  title: 'Espaços Aveiro — versão 2.0 (protótipo)',
  description: 'Protótipo de interface da versão 2.0, com dados fictícios',
}

export default async function V2Layout({ children }: { children: React.ReactNode }) {
  // O contador vem daqui, e não do shell: layout e página renderizam no mesmo
  // request, e as leituras são memoizadas com cache() — então a lista de
  // eventos que alimenta a contagem é a mesma que a página já carregou.
  const pendingCount = await getPendingCount()
  return <V2Shell pendingCount={pendingCount}>{children}</V2Shell>
}
