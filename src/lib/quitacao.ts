// ── Declaração de Quitação: tipos e regras compartilhadas ──────────────────
// A action (servidor) monta estes dados a partir do banco; o PDF (navegador)
// só formata. Tudo já vem como texto pronto, para o documento não depender do
// fuso do navegador nem repetir regras de formatação.

export type QuitacaoPagamento = {
  /** Rótulo da linha: "Sinal", "Parcela 2", "Pagamento avulso". */
  descricao: string
  /** Vencimento formatado (dd/mm/aaaa) ou "—" para pagamentos avulsos. */
  vencimento: string
  /** Data em que o pagamento foi recebido (dd/mm/aaaa). */
  pagamento: string
  /** Forma de pagamento já em rótulo ("PIX", "Dinheiro"...), ou "—". */
  forma: string
  /** Valor efetivamente recebido nesta linha. */
  valor: number
}

export type QuitacaoData = {
  eventId: number
  espaco: {
    slug: string
    nome: string
    /** Artigo definido do nome ("o" Rancho, "a" Estância), para a mensagem final. */
    artigo: 'o' | 'a'
    endereco: string
    telefone: string
    cidade: string
    estado: string
  }
  credor: {
    nome: string
    cpf: string
    cnpj: string
  }
  cliente: {
    nome: string
    /** CPF ou CNPJ, com máscara, ou vazio quando não cadastrado. */
    documento: string
    /** Nome do representante legal, só para cliente pessoa jurídica. */
    representante: string
  }
  contrato: {
    /** Número do contrato gerado/enviado, ou null quando o evento não tem contrato no sistema. */
    numero: string | null
    /** Data de celebração formatada, ou null. */
    data: string | null
  }
  evento: {
    titulo: string
    /** Tipo informado no cadastro ("Casamento", "Confraternização"...), ou vazio. */
    tipo: string
    /** Data do evento formatada (dd/mm/aaaa). */
    data: string
    /** O evento já aconteceu na data de emissão? Muda o tom da mensagem final. */
    jaRealizado: boolean
  }
  pagamentos: QuitacaoPagamento[]
  valorContratado: number
  totalRecebido: number
  /** "Campinas, 15 de outubro de 2026". */
  localEData: string
  /** Data e hora de emissão (dd/mm/aaaa HH:mm). */
  emitidoEm: string
  /** Código curto derivado dos dados, para conferir o documento contra o sistema. */
  codigoVerificacao: string
}

/**
 * Regra única de elegibilidade: há parcelas cadastradas e TODAS estão pagas.
 * A conferência de valor (recebido ≥ contratado) fica na action, que tem os
 * números completos; aqui é só o que a tela precisa para mostrar o botão.
 */
export function todasParcelasPagas(installments: Array<{ status: string }>): boolean {
  return installments.length > 0 && installments.every((i) => i.status === 'paid')
}

export function nomeArquivoQuitacao(data: Pick<QuitacaoData, 'eventId' | 'contrato'>): string {
  const ref = (data.contrato.numero || `evento-${data.eventId}`).replace(/[^a-zA-Z0-9_-]/g, '_')
  return `Declaracao-Quitacao-${ref}.pdf`
}
