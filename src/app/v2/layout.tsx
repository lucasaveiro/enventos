import type { Metadata } from 'next'
import './v2.css'
import { V2Shell } from '@/components/v2/V2Shell'

export const metadata: Metadata = {
  title: 'Espaços Aveiro — versão 2.0 (protótipo)',
  description: 'Protótipo de interface da versão 2.0, com dados fictícios',
}

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return <V2Shell>{children}</V2Shell>
}
