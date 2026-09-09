'use client'

// Camadas sobrepostas (painel lateral, busca global) vão para o <body>.
// Sem isso elas ficam presas ao primeiro ancestral com transform/filter — e
// basta uma animação de entrada em qualquer tela para o painel abrir no lugar
// errado. Portal resolve isso na raiz, e não a cada tela.

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(children, document.body)
}
