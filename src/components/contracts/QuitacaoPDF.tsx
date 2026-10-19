'use client'

import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { isCNPJ } from '@/lib/contractTemplates'
import { valorPorExtenso } from '@/lib/extenso'
import type { QuitacaoData } from '@/lib/quitacao'

Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.woff', fontWeight: 400 },
    { src: '/fonts/Roboto-Bold.woff', fontWeight: 700 },
    { src: '/fonts/Roboto-Italic.woff', fontStyle: 'italic' },
  ],
})

// ── Declaração de Quitação ──────────────────────────────────────────────────
// Documento que o cliente guarda como prova de que pagou tudo. Por isso o corpo
// é sóbrio e segue o que o Código Civil pede de uma quitação (art. 320): valor
// e espécie da dívida, nome de quem pagou, tempo e lugar do pagamento e
// assinatura do credor. O que NÃO entra aqui, de propósito: dados bancários,
// telefone/e-mail do cliente (não são necessários para identificá-lo), notas
// internas das parcelas, promessas ou condições novas. A mensagem de
// agradecimento fica DEPOIS da assinatura, em bloco próprio, para não se
// confundir com o conteúdo declarado.

const BORDER = '#444'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 9.5,
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 46,
    color: '#111',
    lineHeight: 1.45,
  },

  // Cabeçalho — mesmo desenho do contrato, para o cliente reconhecer a origem.
  header: { alignItems: 'center', marginBottom: 8 },
  brandName: { fontSize: 20, fontWeight: 700, fontStyle: 'italic', textAlign: 'center', marginBottom: 3 },
  headerLine: { fontSize: 8.3, textAlign: 'center', color: '#333' },

  title: { fontSize: 14, fontWeight: 700, textAlign: 'center', letterSpacing: 1 },
  subtitle: { fontSize: 9.5, textAlign: 'center', color: '#333', marginTop: 3, marginBottom: 10 },

  // Blocos de identificação
  box: { borderWidth: 0.8, borderColor: BORDER, borderRadius: 3, paddingVertical: 6, paddingHorizontal: 9, marginBottom: 6 },
  boxTitle: { fontSize: 7.8, fontWeight: 700, textTransform: 'uppercase', color: '#444', marginBottom: 2, letterSpacing: 0.5 },
  line: { fontSize: 9.2, marginBottom: 2 },
  label: { fontWeight: 700 },

  // Corpo da declaração
  body: { fontSize: 9.4, textAlign: 'justify', lineHeight: 1.5, marginTop: 4, marginBottom: 6 },
  strong: { fontWeight: 700 },

  sectionTitle: { fontSize: 9.5, fontWeight: 700, marginTop: 6, marginBottom: 4 },

  // Tabela de pagamentos
  table: { borderWidth: 0.8, borderColor: BORDER, marginBottom: 4 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#e8e8e8', minHeight: 16 },
  tableRow: { flexDirection: 'row', borderTopWidth: 0.6, borderTopColor: BORDER, minHeight: 16 },
  totalRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: '#f3f3f3', minHeight: 17 },
  cell: { paddingVertical: 2.5, paddingHorizontal: 4, borderLeftWidth: 0.6, borderLeftColor: BORDER, fontSize: 8.5, justifyContent: 'center' },
  cellFirst: { borderLeftWidth: 0 },
  cellRight: { textAlign: 'right' },
  headerCell: { fontWeight: 700, fontSize: 8.2 },
  colNum: { width: '6%' },
  colDesc: { width: '30%' },
  colDate: { width: '15%' },
  colMethod: { width: '18%' },
  colValue: { width: '16%' },

  summary: { fontSize: 8.6, textAlign: 'right', color: '#222', marginTop: 2, marginBottom: 8 },

  // Alcance da quitação
  scope: { fontSize: 8.2, textAlign: 'justify', color: '#222', lineHeight: 1.4, marginBottom: 10 },

  // Local, data e assinatura do credor
  dateLine: { fontSize: 9.5, textAlign: 'right', marginBottom: 20 },
  signatureBlock: { width: '52%', alignSelf: 'center', alignItems: 'center', marginBottom: 10 },
  signatureLine: { borderTopWidth: 0.5, borderTopColor: '#111', width: '100%', marginBottom: 3 },
  signatureName: { fontSize: 8.8, textAlign: 'center' },
  signatureRole: { fontSize: 7.8, color: '#444', textAlign: 'center' },

  // Mensagem da equipe — fora do corpo declarado, visual leve.
  thanks: {
    borderWidth: 0.6,
    borderColor: '#bbb',
    borderRadius: 4,
    backgroundColor: '#fafaf7',
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  thanksText: { fontSize: 9, fontStyle: 'italic', textAlign: 'center', color: '#333', lineHeight: 1.5 },
  thanksSign: { fontSize: 8.5, textAlign: 'center', color: '#333', marginTop: 4 },

  footer: { position: 'absolute', bottom: 22, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7.2, color: '#777' },
})

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

function docLabel(documento: string): string {
  return isCNPJ(documento) ? 'CNPJ' : 'CPF'
}

function mensagemAgradecimento(data: QuitacaoData): string {
  const { nome, artigo } = data.espaco
  const abertura = `Agradecemos a confiança n${artigo} ${nome}.`
  if (data.evento.jaRealizado) {
    return (
      `${abertura} Foi um prazer receber você e seus convidados, ` +
      `e esperamos que esta tenha sido a primeira de muitas celebrações por aqui. Até a próxima!`
    )
  }
  return (
    `${abertura} Será um prazer receber você e seus convidados ` +
    `no dia ${data.evento.data}, e esperamos que esta seja a primeira de muitas celebrações por aqui.`
  )
}

interface Props {
  data: QuitacaoData
}

export function QuitacaoPDFDocument({ data }: Props) {
  const { espaco, credor, cliente, contrato, evento, pagamentos } = data
  const clientePJ = isCNPJ(cliente.documento)
  const referencia = contrato.numero
    ? `Contrato de Locação nº ${contrato.numero}`
    : `Evento "${evento.titulo}"`
  const descricaoEvento = [evento.tipo, `${evento.jaRealizado ? 'realizado em' : 'previsto para'} ${evento.data}`]
    .filter(Boolean)
    .join(', ')
  const valorIntegral = Math.abs(data.totalRecebido - data.valorContratado) < 0.005

  return (
    <Document
      title={`Declaração de Quitação — ${contrato.numero ?? evento.titulo}`}
      author={espaco.nome}
      subject={referencia}
    >
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.brandName}>{espaco.nome}</Text>
          <Text style={styles.headerLine}>{espaco.endereco}</Text>
          {espaco.telefone ? <Text style={styles.headerLine}>Telefone: {espaco.telefone}</Text> : null}
        </View>

        <Text style={styles.title}>DECLARAÇÃO DE QUITAÇÃO</Text>
        <Text style={styles.subtitle}>{referencia} — {espaco.nome}</Text>

        {/* Partes e objeto */}
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Partes</Text>
          <Text style={styles.line}>
            <Text style={styles.label}>Credor (locador): </Text>
            {credor.nome}
            {credor.cpf ? `, CPF nº ${credor.cpf}` : ''}
            {credor.cnpj ? `, CNPJ nº ${credor.cnpj}` : ''}
            {` — ${espaco.nome}`}
          </Text>
          <Text style={styles.line}>
            <Text style={styles.label}>Devedor (contratante): </Text>
            {cliente.nome}
            {cliente.documento ? `, ${docLabel(cliente.documento)} nº ${cliente.documento}` : ''}
            {clientePJ && cliente.representante ? `, representada por ${cliente.representante}` : ''}
          </Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Objeto</Text>
          <Text style={styles.line}>
            <Text style={styles.label}>Instrumento: </Text>
            {referencia}
            {contrato.data ? `, celebrado em ${contrato.data}` : ''}
          </Text>
          <Text style={styles.line}>
            <Text style={styles.label}>Evento: </Text>
            {evento.titulo}
            {descricaoEvento ? ` (${descricaoEvento})` : ''}
            {` — ${espaco.nome}`}
          </Text>
        </View>

        {/* Declaração */}
        <Text style={styles.body}>
          <Text style={styles.strong}>{credor.nome}</Text>, acima qualificado(a), na condição de LOCADOR(A) do
          instrumento acima identificado, DECLARA, para os devidos fins de direito, que recebeu de{' '}
          <Text style={styles.strong}>{cliente.nome}</Text> a importância total de{' '}
          <Text style={styles.strong}>{formatCurrency(data.totalRecebido)}</Text> ({valorPorExtenso(data.totalRecebido)}),
          por meio dos pagamentos discriminados abaixo, em pagamento{' '}
          {valorIntegral ? 'integral' : 'total'} do preço ajustado no referido instrumento
          {valorIntegral ? '' : `, fixado em ${formatCurrency(data.valorContratado)}`}.
          Em razão disso, dá ao(à) CONTRATANTE a mais <Text style={styles.strong}>plena, geral e irrevogável quitação</Text>{' '}
          do valor acima, para nada mais reclamar a esse título, a qualquer tempo.
        </Text>

        {/* Pagamentos */}
        <Text style={styles.sectionTitle}>PAGAMENTOS RECEBIDOS</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <View style={[styles.cell, styles.cellFirst, styles.colNum]}><Text style={styles.headerCell}>Nº</Text></View>
            <View style={[styles.cell, styles.colDesc]}><Text style={styles.headerCell}>Descrição</Text></View>
            <View style={[styles.cell, styles.colDate]}><Text style={styles.headerCell}>Vencimento</Text></View>
            <View style={[styles.cell, styles.colDate]}><Text style={styles.headerCell}>Pagamento</Text></View>
            <View style={[styles.cell, styles.colMethod]}><Text style={styles.headerCell}>Forma</Text></View>
            <View style={[styles.cell, styles.colValue, styles.cellRight]}><Text style={styles.headerCell}>Valor recebido</Text></View>
          </View>
          {pagamentos.map((p, index) => (
            <View key={index} style={styles.tableRow} wrap={false}>
              <View style={[styles.cell, styles.cellFirst, styles.colNum]}><Text>{index + 1}</Text></View>
              <View style={[styles.cell, styles.colDesc]}><Text>{p.descricao}</Text></View>
              <View style={[styles.cell, styles.colDate]}><Text>{p.vencimento}</Text></View>
              <View style={[styles.cell, styles.colDate]}><Text>{p.pagamento}</Text></View>
              <View style={[styles.cell, styles.colMethod]}><Text>{p.forma}</Text></View>
              <View style={[styles.cell, styles.colValue, styles.cellRight]}><Text>{formatCurrency(p.valor)}</Text></View>
            </View>
          ))}
          <View style={styles.totalRow} wrap={false}>
            <View style={[styles.cell, styles.cellFirst, { width: '84%' }]}>
              <Text style={styles.headerCell}>Total recebido</Text>
            </View>
            <View style={[styles.cell, styles.colValue, styles.cellRight]}>
              <Text style={styles.headerCell}>{formatCurrency(data.totalRecebido)}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.summary}>
          Valor contratado: <Text style={styles.strong}>{formatCurrency(data.valorContratado)}</Text>
          {'   ·   '}Total recebido: <Text style={styles.strong}>{formatCurrency(data.totalRecebido)}</Text>
          {'   ·   '}Saldo devedor: <Text style={styles.strong}>{formatCurrency(0)}</Text>
        </Text>

        {/* Alcance */}
        <Text style={styles.sectionTitle}>ALCANCE DESTA QUITAÇÃO</Text>
        <Text style={styles.scope}>
          Esta quitação refere-se exclusivamente ao preço ajustado no instrumento acima identificado, nos valores
          aqui discriminados. Não estão abrangidos por ela, por serem apuráveis apenas após a realização do evento
          ou por serem contratados à parte: (i) a caução e eventuais valores relativos a avarias, faltas ou danos
          apurados na vistoria de saída, que seguem o regime próprio do contrato; (ii) serviços, itens, diárias ou
          horas adicionais contratados posteriormente e não incluídos no preço; e (iii) as demais obrigações
          previstas no contrato, que permanecem em vigor. Esta declaração não altera, renova nem extingue
          qualquer outra cláusula do instrumento.
        </Text>

        {/* Local, data e assinatura */}
        <View wrap={false}>
          <Text style={styles.dateLine}>{data.localEData}.</Text>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{credor.nome}</Text>
            <Text style={styles.signatureRole}>LOCADOR(A) — {espaco.nome}</Text>
          </View>
        </View>

        {/* Mensagem da equipe */}
        <View style={styles.thanks} wrap={false}>
          <Text style={styles.thanksText}>{mensagemAgradecimento(data)}</Text>
          <Text style={styles.thanksSign}>Equipe {espaco.nome}</Text>
        </View>

        {/* Rodapé */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Emitida em {data.emitidoEm} · Código de verificação {data.codigoVerificacao}
          </Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
