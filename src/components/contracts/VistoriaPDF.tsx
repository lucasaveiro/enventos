'use client'

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import { ContractFormData, SpaceConfig, formatDate } from '@/lib/contractTemplates'

Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.woff', fontWeight: 400 },
    { src: '/fonts/Roboto-Bold.woff', fontWeight: 700 },
    { src: '/fonts/Roboto-Italic.woff', fontStyle: 'italic' },
  ],
})

export interface VistoriaItem {
  quantity: number
  name: string
  package: string | null
}

const BORDER = '#444'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 9,
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 40,
    color: '#111',
    lineHeight: 1.4,
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 9.5,
    textAlign: 'center',
    color: '#333',
    marginTop: 2,
    marginBottom: 10,
  },
  infoBox: {
    borderWidth: 0.8,
    borderColor: BORDER,
    borderRadius: 3,
    padding: 8,
    marginBottom: 8,
  },
  infoLine: {
    fontSize: 9,
    marginBottom: 2,
  },
  infoLabel: {
    fontWeight: 700,
  },
  legalText: {
    fontSize: 7.8,
    textAlign: 'justify',
    color: '#222',
    lineHeight: 1.35,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: 700,
    marginTop: 6,
    marginBottom: 4,
  },
  // Tabela do inventário
  table: {
    borderWidth: 0.8,
    borderColor: BORDER,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 0.6,
    borderTopColor: BORDER,
    minHeight: 16,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#e8e8e8',
    minHeight: 16,
  },
  cell: {
    paddingVertical: 2.5,
    paddingHorizontal: 4,
    borderLeftWidth: 0.6,
    borderLeftColor: BORDER,
    fontSize: 8.4,
    justifyContent: 'center',
  },
  cellFirst: {
    borderLeftWidth: 0,
  },
  headerCell: {
    fontWeight: 700,
    fontSize: 8.2,
  },
  colNum: { width: '6%' },
  colQty: { width: '8%' },
  colItem: { width: '34%' },
  colState: { width: '13%' },
  colObs: { width: '26%' },
  legend: {
    fontSize: 7.6,
    color: '#333',
    marginBottom: 10,
  },
  // Ressalvas
  ressalvasBox: {
    borderWidth: 0.8,
    borderColor: BORDER,
    borderRadius: 3,
    padding: 8,
    marginBottom: 12,
  },
  ressalvasLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#666',
    height: 14,
    marginTop: 6,
  },
  // Assinaturas
  signatureSection: {
    borderWidth: 0.8,
    borderColor: BORDER,
    borderRadius: 3,
    padding: 10,
    marginBottom: 12,
  },
  signatureSectionTitle: {
    fontSize: 9.5,
    fontWeight: 700,
    marginBottom: 2,
  },
  signatureDateLine: {
    fontSize: 9,
    marginBottom: 18,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: '44%',
    alignItems: 'center',
  },
  signatureLine: {
    borderTopWidth: 0.5,
    borderTopColor: '#111',
    width: '100%',
    marginBottom: 3,
  },
  signatureName: {
    fontSize: 8.2,
    textAlign: 'center',
  },
  signatureRole: {
    fontSize: 7.6,
    color: '#444',
    textAlign: 'center',
  },
  footerNote: {
    fontSize: 7.4,
    color: '#555',
    textAlign: 'center',
    marginTop: 2,
  },
})

interface Props {
  formData: ContractFormData
  space: SpaceConfig
  items: VistoriaItem[]
}

const BLANK_ROWS = 6

function packageShortLabel(packageType: string): string {
  const pkg = (packageType || '').toLowerCase()
  if (pkg === 'simples') return 'Pacote Simples'
  if (pkg === 'completo') return 'Pacote Completo'
  return '________________'
}

function StateCells() {
  return (
    <>
      <View style={[styles.cell, styles.colState]} />
      <View style={[styles.cell, styles.colState]} />
      <View style={[styles.cell, styles.colObs]} />
    </>
  )
}

export function VistoriaPDFDocument({ formData, space, items }: Props) {
  const contractNumber = formData.contractNumber || '________'
  const clientName = formData.clientName || '________________________________'
  const clientDoc = formData.clientCPF || '____________________'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <Text style={styles.title}>TERMO DE VISTORIA E INVENTÁRIO</Text>
        <Text style={styles.subtitle}>
          Anexo I do Contrato de Locação nº {contractNumber} — {space.displayName}
        </Text>

        {/* Identificação */}
        <View style={styles.infoBox}>
          <Text style={styles.infoLine}>
            <Text style={styles.infoLabel}>Locatário(a): </Text>{clientName}
            <Text style={styles.infoLabel}>   CPF/CNPJ: </Text>{clientDoc}
          </Text>
          <Text style={styles.infoLine}>
            <Text style={styles.infoLabel}>Telefone: </Text>{formData.clientPhone || '____________________'}
            <Text style={styles.infoLabel}>   Pacote: </Text>{packageShortLabel(formData.packageType)}
          </Text>
          <Text style={styles.infoLine}>
            <Text style={styles.infoLabel}>Entrada: </Text>
            {formatDate(formData.eventDate) || '____/____/______'} às {formData.eventStartTime || '____:____'}
            <Text style={styles.infoLabel}>   Saída: </Text>
            {formatDate(formData.eventCheckoutDate) || '____/____/______'} às {formData.eventEndTime || '____:____'}
          </Text>
          <Text style={styles.infoLine}>
            <Text style={styles.infoLabel}>Imóvel: </Text>{space.spaceFullAddress}
          </Text>
        </View>

        {/* Regime jurídico do termo (espelha a Cláusula Primeira, §§ 1º a 4º, e a Cláusula Quinta) */}
        <Text style={styles.legalText}>
          Este termo integra o contrato de locação acima identificado (Anexo I). A vistoria é realizada em dois
          momentos — entrada e saída —, com registro fotográfico datado, devendo este termo ser assinado por ambas
          as partes em cada momento, em sinal de ciência das condições do imóvel e de seus pertences. O(A)
          LOCATÁRIO(A) pode apontar ressalvas (avarias ou faltas pré-existentes não anotadas) em até 2 (duas) horas
          do início da ocupação, por escrito, WhatsApp ou e-mail, com fotos. Se qualquer das partes não comparecer
          à vistoria ou se recusar a assinar, prevalece a vistoria realizada pela parte presente, documentada com
          registro fotográfico datado, presumindo-se aceita pela parte ausente, que poderá contestá-la, por escrito
          e com evidências, em até 48 (quarenta e oito) horas do recebimento deste termo; sem contestação nesse
          prazo, a vistoria considera-se definitivamente aceita. As divergências entre a vistoria de entrada e a de
          saída constituem prova das avarias e faltas ocorridas na locação, cobradas na forma da Cláusula Quinta do
          contrato (caução).
        </Text>

        {/* Inventário */}
        <Text style={styles.sectionTitle}>INVENTÁRIO E ESTADO DE CONSERVAÇÃO</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <View style={[styles.cell, styles.cellFirst, styles.colNum]}>
              <Text style={styles.headerCell}>Nº</Text>
            </View>
            <View style={[styles.cell, styles.colQty]}>
              <Text style={styles.headerCell}>Qtd</Text>
            </View>
            <View style={[styles.cell, styles.colItem]}>
              <Text style={styles.headerCell}>Item</Text>
            </View>
            <View style={[styles.cell, styles.colState]}>
              <Text style={styles.headerCell}>Entrada</Text>
            </View>
            <View style={[styles.cell, styles.colState]}>
              <Text style={styles.headerCell}>Saída</Text>
            </View>
            <View style={[styles.cell, styles.colObs]}>
              <Text style={styles.headerCell}>Observações</Text>
            </View>
          </View>

          {items.map((item, index) => (
            <View key={`item-${index}`} style={styles.tableRow} wrap={false}>
              <View style={[styles.cell, styles.cellFirst, styles.colNum]}>
                <Text>{index + 1}</Text>
              </View>
              <View style={[styles.cell, styles.colQty]}>
                <Text>{item.quantity}</Text>
              </View>
              <View style={[styles.cell, styles.colItem]}>
                <Text>{item.name}</Text>
              </View>
              <StateCells />
            </View>
          ))}

          {Array.from({ length: BLANK_ROWS }, (_, index) => (
            <View key={`blank-${index}`} style={styles.tableRow} wrap={false}>
              <View style={[styles.cell, styles.cellFirst, styles.colNum]}>
                <Text>{items.length + index + 1}</Text>
              </View>
              <View style={[styles.cell, styles.colQty]} />
              <View style={[styles.cell, styles.colItem]} />
              <StateCells />
            </View>
          ))}
        </View>
        <Text style={styles.legend}>
          Estado: B = Bom · R = Regular · A = Avariado/Faltante — detalhar avarias e faltas em Observações,
          sempre com foto datada.
        </Text>

        {/* Ressalvas */}
        <View style={styles.ressalvasBox} wrap={false}>
          <Text style={styles.sectionTitle}>RESSALVAS DO(A) LOCATÁRIO(A) (até 2 horas após a entrada)</Text>
          <View style={styles.ressalvasLine} />
          <View style={styles.ressalvasLine} />
          <View style={styles.ressalvasLine} />
        </View>

        {/* Assinaturas — entrada */}
        <View style={styles.signatureSection} wrap={false}>
          <Text style={styles.signatureSectionTitle}>VISTORIA DE ENTRADA</Text>
          <Text style={styles.signatureDateLine}>Data: ____/____/______   Hora: ____:____</Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>{space.ownerName}</Text>
              <Text style={styles.signatureRole}>LOCADOR (ou representante)</Text>
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>{clientName}</Text>
              <Text style={styles.signatureRole}>LOCATÁRIO(A)</Text>
            </View>
          </View>
        </View>

        {/* Assinaturas — saída */}
        <View style={styles.signatureSection} wrap={false}>
          <Text style={styles.signatureSectionTitle}>VISTORIA DE SAÍDA</Text>
          <Text style={styles.signatureDateLine}>Data: ____/____/______   Hora: ____:____</Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>{space.ownerName}</Text>
              <Text style={styles.signatureRole}>LOCADOR (ou representante)</Text>
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>{clientName}</Text>
              <Text style={styles.signatureRole}>LOCATÁRIO(A)</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footerNote}>
          Termo de Vistoria e Inventário — Anexo I do Contrato nº {contractNumber} · {space.displayName} ·
          Documento em 2 (duas) vias de igual teor.
        </Text>
      </Page>
    </Document>
  )
}
