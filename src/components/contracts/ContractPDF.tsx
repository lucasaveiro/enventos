'use client'

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import { ContractClause, ContractFormData, SpaceConfig, formatDate } from '@/lib/contractTemplates'

Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: '/fonts/Roboto-Regular.woff',
      fontWeight: 400,
    },
    {
      src: '/fonts/Roboto-Bold.woff',
      fontWeight: 700,
    },
    {
      src: '/fonts/Roboto-Italic.woff',
      fontStyle: 'italic',
    },
  ],
})

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 10,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 55,
    color: '#1a1a1a',
    lineHeight: 1.5,
  },
  // Header
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a1a',
    paddingBottom: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerLeft: {
    flex: 1,
  },
  spaceName: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  spaceAddress: {
    fontSize: 8.5,
    color: '#555',
  },
  contractMeta: {
    alignItems: 'flex-end',
  },
  contractNumberText: {
    fontSize: 9,
    fontWeight: 700,
    color: '#333',
  },
  contractDateText: {
    fontSize: 8.5,
    color: '#666',
    marginTop: 2,
  },
  // Title
  titleBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1,
    textAlign: 'center',
  },
  titleUnderline: {
    marginTop: 4,
    height: 1,
    backgroundColor: '#1a1a1a',
    width: 200,
  },
  // Parties section
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 14,
    color: '#1a1a1a',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    paddingBottom: 3,
  },
  partyBlock: {
    marginBottom: 4,
  },
  partyLabel: {
    fontWeight: 700,
    fontSize: 9,
    marginBottom: 2,
  },
  partyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 1.5,
  },
  fieldLabel: {
    fontWeight: 700,
    fontSize: 9,
    color: '#333',
    marginRight: 2,
  },
  fieldValue: {
    fontSize: 9,
    color: '#111',
  },
  // Event info grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  infoCell: {
    width: '30%',
    marginBottom: 3,
  },
  infoCellWide: {
    width: '65%',
    marginBottom: 3,
  },
  // Financial table
  finTable: {
    borderWidth: 0.5,
    borderColor: '#ccc',
    borderRadius: 3,
    marginBottom: 4,
  },
  finRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  finRowLast: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  finRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  finCol1: { flex: 2, fontSize: 9 },
  finCol2: { flex: 1.5, fontSize: 9, textAlign: 'center' },
  finCol3: { flex: 1, fontSize: 9, textAlign: 'right' },
  finHeaderText: { fontWeight: 700, fontSize: 8.5, color: '#444' },
  // Clauses
  clauseBlock: {
    marginBottom: 10,
  },
  clauseTitle: {
    fontWeight: 700,
    fontSize: 9.5,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  clauseContent: {
    fontSize: 9.5,
    textAlign: 'justify',
    lineHeight: 1.6,
    color: '#222',
  },
  // Observations
  obsBox: {
    borderWidth: 0.5,
    borderColor: '#ccc',
    borderRadius: 3,
    padding: 6,
    marginBottom: 4,
  },
  obsText: {
    fontSize: 9,
    color: '#333',
    lineHeight: 1.5,
  },
  // Signature
  signatureSection: {
    marginTop: 30,
  },
  signatureDate: {
    textAlign: 'center',
    fontSize: 9.5,
    marginBottom: 30,
    color: '#333',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  signatureBlock: {
    width: '44%',
    alignItems: 'center',
  },
  signatureLine: {
    borderTopWidth: 0.5,
    borderTopColor: '#1a1a1a',
    width: '100%',
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 8.5,
    textAlign: 'center',
    color: '#333',
  },
  signatureName: {
    fontSize: 8,
    textAlign: 'center',
    color: '#555',
    marginTop: 1,
  },
  witnessTitle: {
    textAlign: 'center',
    fontSize: 8.5,
    fontWeight: 700,
    marginBottom: 20,
    color: '#444',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 55,
    right: 55,
    borderTopWidth: 0.5,
    borderTopColor: '#ccc',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7.5,
    color: '#888',
  },
  pageNumber: {
    fontSize: 7.5,
    color: '#888',
  },
})

interface Props {
  formData: ContractFormData
  clauses: ContractClause[]
  space: SpaceConfig
}

function toCurrency(value: string): string {
  if (!value) return '-'
  const parsed = Number(value.replace(',', '.'))
  if (Number.isNaN(parsed)) return '-'
  return parsed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function getPackageLabel(packageType: string): string {
  if (packageType === 'simples') return 'Pacote Simples'
  if (packageType === 'completo') return 'Pacote Completo'
  return '-'
}

export function ContractPDFDocument({ formData, clauses, space }: Props) {
  return (
    <Document title={`Contrato ${formData.contractNumber} - ${space.displayName}`} author={space.ownerName}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Text style={styles.spaceName}>{space.displayName}</Text>
            <Text style={styles.spaceAddress}>{space.address} — {space.city}/{space.state}</Text>
          </View>
          <View style={styles.contractMeta}>
            <Text style={styles.contractNumberText}>Contrato Nº {formData.contractNumber}</Text>
            <Text style={styles.contractDateText}>{formatDate(formData.contractDate)}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>CONTRATO DE LOCAÇÃO DE ESPAÇO PARA EVENTOS</Text>
          <View style={styles.titleUnderline} />
        </View>

        {/* CONTRATADA */}
        <Text style={styles.sectionTitle}>Dados da Contratada</Text>
        <View style={styles.partyBlock}>
          <Text style={styles.partyLabel}>CONTRATADA:</Text>
          <View style={styles.partyRow}>
            <Text style={styles.fieldLabel}>Razão Social / Nome: </Text>
            <Text style={styles.fieldValue}>{space.displayName}</Text>
          </View>
          <View style={styles.partyRow}>
            <Text style={styles.fieldLabel}>Representante: </Text>
            <Text style={styles.fieldValue}>{space.ownerName} ({space.ownerRole})</Text>
            <Text style={styles.fieldLabel}>   CPF: </Text>
            <Text style={styles.fieldValue}>{space.ownerCPF}</Text>
          </View>
          <View style={styles.partyRow}>
            <Text style={styles.fieldLabel}>Endereço: </Text>
            <Text style={styles.fieldValue}>{space.address}, {space.city}/{space.state}</Text>
          </View>
        </View>

        {/* CONTRATANTE */}
        <Text style={styles.sectionTitle}>Dados do(a) Contratante</Text>
        <View style={styles.partyBlock}>
          <Text style={styles.partyLabel}>CONTRATANTE:</Text>
          <View style={styles.partyRow}>
            <Text style={styles.fieldLabel}>Nome Completo: </Text>
            <Text style={styles.fieldValue}>{formData.clientName}</Text>
          </View>
          <View style={styles.partyRow}>
            <Text style={styles.fieldLabel}>CPF: </Text>
            <Text style={styles.fieldValue}>{formData.clientCPF}</Text>
            {formData.clientRG ? (
              <>
                <Text style={styles.fieldLabel}>   RG: </Text>
                <Text style={styles.fieldValue}>{formData.clientRG}</Text>
              </>
            ) : null}
          </View>
          <View style={styles.partyRow}>
            <Text style={styles.fieldLabel}>Endereço: </Text>
            <Text style={styles.fieldValue}>{formData.clientAddress}</Text>
            {formData.clientCity ? (
              <>
                <Text style={styles.fieldLabel}>   Cidade/UF: </Text>
                <Text style={styles.fieldValue}>{formData.clientCity}{formData.clientState ? `/${formData.clientState}` : ''}</Text>
              </>
            ) : null}
          </View>
          <View style={styles.partyRow}>
            <Text style={styles.fieldLabel}>Telefone: </Text>
            <Text style={styles.fieldValue}>{formData.clientPhone}</Text>
            {formData.clientEmail ? (
              <>
                <Text style={styles.fieldLabel}>   E-mail: </Text>
                <Text style={styles.fieldValue}>{formData.clientEmail}</Text>
              </>
            ) : null}
          </View>
        </View>

        {/* Event Details */}
        <Text style={styles.sectionTitle}>Dados do Evento</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Text style={styles.fieldLabel}>Data do Evento:</Text>
            <Text style={styles.fieldValue}>{formatDate(formData.eventDate)}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.fieldLabel}>Horário:</Text>
            <Text style={styles.fieldValue}>{formData.eventStartTime} às {formData.eventEndTime}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.fieldLabel}>Nº de Convidados:</Text>
            <Text style={styles.fieldValue}>{formData.guestCount} pessoas</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.fieldLabel}>Diárias:</Text>
            <Text style={styles.fieldValue}>{formData.dailyCount || '-'}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.fieldLabel}>Data de Saída:</Text>
            <Text style={styles.fieldValue}>{formatDate(formData.eventCheckoutDate) || '-'}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.fieldLabel}>Pacote:</Text>
            <Text style={styles.fieldValue}>{getPackageLabel(formData.packageType)}</Text>
          </View>
          <View style={styles.infoCellWide}>
            <Text style={styles.fieldLabel}>Tipo do Evento:</Text>
            <Text style={styles.fieldValue}>{formData.eventType}</Text>
          </View>
        </View>

        {/* Financial */}
        <Text style={styles.sectionTitle}>Condições Financeiras</Text>
        <View style={styles.finTable}>
          <View style={styles.finRowHeader}>
            <Text style={[styles.finCol1, styles.finHeaderText]}>Descrição</Text>
            <Text style={[styles.finCol2, styles.finHeaderText]}>Vencimento</Text>
            <Text style={[styles.finCol3, styles.finHeaderText]}>Valor</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finCol1}>Entrada / Sinal</Text>
            <Text style={styles.finCol2}>{formatDate(formData.depositDueDate)}</Text>
            <Text style={[styles.finCol3, { fontWeight: 700 }]}>{toCurrency(formData.depositValue)}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finCol1}>Valor Restante</Text>
            <Text style={styles.finCol2}>{formatDate(formData.remainingDueDate)}</Text>
            <Text style={[styles.finCol3, { fontWeight: 700 }]}>{toCurrency(formData.remainingValue)}</Text>
          </View>
          {formData.cautionValue ? (
            <View style={styles.finRow}>
              <Text style={styles.finCol1}>Cheque Caução</Text>
              <Text style={styles.finCol2}>-</Text>
              <Text style={[styles.finCol3, { fontWeight: 700 }]}>{toCurrency(formData.cautionValue)}</Text>
            </View>
          ) : null}
          <View style={styles.finRowLast}>
            <Text style={[styles.finCol1, { fontWeight: 700 }]}>TOTAL</Text>
            <Text style={styles.finCol2}>{formData.paymentMethod}</Text>
            <Text style={[styles.finCol3, { fontWeight: 700, fontSize: 10 }]}>{toCurrency(formData.totalValue)}</Text>
          </View>
        </View>

        {/* Clauses */}
        <Text style={styles.sectionTitle}>Cláusulas Contratuais</Text>
        {clauses.map((clause) => (
          <View key={clause.id} style={styles.clauseBlock} wrap={false}>
            <Text style={styles.clauseTitle}>
              Cláusula {clause.number} – {clause.title}
            </Text>
            <Text style={styles.clauseContent}>{clause.content}</Text>
          </View>
        ))}

        {/* Observations */}
        {formData.observations ? (
          <>
            <Text style={styles.sectionTitle}>Observações Gerais</Text>
            <View style={styles.obsBox}>
              <Text style={styles.obsText}>{formData.observations}</Text>
            </View>
          </>
        ) : null}

        {/* Signatures */}
        <View style={styles.signatureSection} wrap={false}>
          <Text style={styles.signatureDate}>
            {space.city}/{space.state}, {formatDate(formData.contractDate)}.
          </Text>

          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>CONTRATADA</Text>
              <Text style={styles.signatureName}>{space.ownerName}</Text>
              <Text style={styles.signatureName}>{space.displayName}</Text>
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>CONTRATANTE</Text>
              <Text style={styles.signatureName}>{formData.clientName}</Text>
              <Text style={styles.signatureName}>CPF: {formData.clientCPF}</Text>
            </View>
          </View>

          <Text style={styles.witnessTitle}>TESTEMUNHAS</Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Testemunha 1</Text>
              <Text style={styles.signatureName}>Nome: ____________________________</Text>
              <Text style={styles.signatureName}>CPF: _____________________________</Text>
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Testemunha 2</Text>
              <Text style={styles.signatureName}>Nome: ____________________________</Text>
              <Text style={styles.signatureName}>CPF: _____________________________</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{space.displayName} — Contrato Nº {formData.contractNumber}</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
