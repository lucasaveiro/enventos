'use client'

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import { ContractClause, ContractFormData, SpaceConfig, formatDate, isCNPJ } from '@/lib/contractTemplates'

Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.woff', fontWeight: 400 },
    { src: '/fonts/Roboto-Bold.woff', fontWeight: 700 },
    { src: '/fonts/Roboto-Italic.woff', fontStyle: 'italic' },
  ],
})

// ─── Color Palette ──────────────────────────────────────────────────────────
const C = {
  black: '#111111',
  dark: '#1a1a1a',
  text: '#222222',
  label: '#444444',
  muted: '#666666',
  light: '#999999',
  border: '#cccccc',
  borderLight: '#e0e0e0',
  bgSubtle: '#f7f7f7',
  bgHeader: '#f0f0f0',
  accent: '#1a1a1a',
  white: '#ffffff',
} as const

const styles = StyleSheet.create({
  // ─── Page ───────────────────────────────────────────────────────────────────
  page: {
    fontFamily: 'Roboto',
    fontSize: 9.5,
    paddingTop: 50,
    paddingBottom: 65,
    paddingHorizontal: 55,
    color: C.text,
    lineHeight: 1.55,
  },

  // ─── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.accent,
    marginBottom: 16,
  },
  headerLeft: { flex: 1 },
  spaceName: {
    fontSize: 16,
    fontWeight: 700,
    color: C.dark,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  spaceAddress: { fontSize: 8, color: C.muted, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  contractLabel: { fontSize: 7.5, color: C.light, textTransform: 'uppercase', letterSpacing: 0.5 },
  contractNumberText: { fontSize: 10, fontWeight: 700, color: C.dark },
  contractDateText: { fontSize: 8, color: C.muted, marginTop: 1 },

  // ─── Title ──────────────────────────────────────────────────────────────────
  titleBlock: { alignItems: 'center', marginBottom: 18 },
  title: {
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: 1.2,
    textAlign: 'center',
    color: C.dark,
    textTransform: 'uppercase',
  },
  titleRule: { marginTop: 5, height: 0.8, backgroundColor: C.border, width: 180 },

  // ─── Section Titles ─────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 8.5,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: C.label,
    marginTop: 16,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderLight,
  },

  // ─── Party Boxes ────────────────────────────────────────────────────────────
  partyBox: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 3,
    padding: 10,
    marginBottom: 6,
    backgroundColor: C.bgSubtle,
  },
  partyLabel: {
    fontSize: 8,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: C.label,
    marginBottom: 6,
  },
  partyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  partyField: {
    width: '50%',
    marginBottom: 4,
  },
  partyFieldWide: {
    width: '100%',
    marginBottom: 4,
  },
  fieldLabel: { fontSize: 7.5, color: C.muted, marginBottom: 1 },
  fieldValue: { fontSize: 9, color: C.dark, fontWeight: 700 },
  fieldValueNormal: { fontSize: 9, color: C.dark },

  // ─── Info Grid ──────────────────────────────────────────────────────────────
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  infoCell: { width: '33.33%', marginBottom: 6, paddingRight: 8 },
  infoCellWide: { width: '66.66%', marginBottom: 6, paddingRight: 8 },

  // ─── Financial Table ────────────────────────────────────────────────────────
  finTable: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  finRowHeader: {
    flexDirection: 'row',
    backgroundColor: C.accent,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  finHeaderText: { fontWeight: 700, fontSize: 8, color: C.white, textTransform: 'uppercase', letterSpacing: 0.5 },
  finRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  finRowTotal: {
    flexDirection: 'row',
    backgroundColor: C.bgSubtle,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  finCol1: { flex: 2.5, fontSize: 9 },
  finCol2: { flex: 1.5, fontSize: 9, textAlign: 'center' },
  finCol3: { flex: 1.2, fontSize: 9, textAlign: 'right' },

  // ─── Clauses ────────────────────────────────────────────────────────────────
  clauseBlock: { marginBottom: 8 },
  clauseTitle: {
    fontWeight: 700,
    fontSize: 9,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    color: C.dark,
  },
  clauseContent: {
    fontSize: 9,
    textAlign: 'justify',
    lineHeight: 1.6,
    color: C.text,
  },

  // ─── Observations ───────────────────────────────────────────────────────────
  obsBox: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 3,
    padding: 8,
    marginBottom: 6,
    backgroundColor: C.bgSubtle,
  },
  obsText: { fontSize: 8.5, color: C.text, lineHeight: 1.5 },

  // ─── Signatures ─────────────────────────────────────────────────────────────
  signatureSection: { marginTop: 30 },
  signatureDate: { textAlign: 'center', fontSize: 9.5, marginBottom: 30, color: C.text },
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  signatureBlock: { width: '44%', alignItems: 'center' },
  signatureLine: { borderTopWidth: 0.8, borderTopColor: C.dark, width: '100%', marginBottom: 4 },
  signatureLabel: { fontSize: 8, fontWeight: 700, textAlign: 'center', color: C.dark, textTransform: 'uppercase', letterSpacing: 0.5 },
  signatureName: { fontSize: 7.5, textAlign: 'center', color: C.muted, marginTop: 1 },
  witnessTitle: { textAlign: 'center', fontSize: 8, fontWeight: 700, marginBottom: 20, color: C.label, textTransform: 'uppercase', letterSpacing: 0.5 },

  // ─── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 55,
    right: 55,
    borderTopWidth: 0.5,
    borderTopColor: C.borderLight,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: C.light },

  // ─── Rancho-specific ────────────────────────────────────────────────────────
  ranchoPage: {
    fontFamily: 'Roboto',
    fontSize: 9.5,
    paddingTop: 50,
    paddingBottom: 65,
    paddingHorizontal: 50,
    color: C.text,
    lineHeight: 1.5,
  },
  ranchoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.accent,
    marginBottom: 16,
  },
  ranchoTitle: {
    fontSize: 11,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 14,
    color: C.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ranchoIntro: {
    fontSize: 9.2,
    textAlign: 'justify',
    lineHeight: 1.55,
    marginBottom: 10,
    color: C.text,
  },
  ranchoClauseBlock: { marginTop: 6 },
  ranchoClauseTitle: { fontSize: 9.2, fontWeight: 700, marginBottom: 2, color: C.dark },
  ranchoClauseText: { fontSize: 9.2, textAlign: 'justify', lineHeight: 1.55, color: C.text },
  ranchoEventData: { marginTop: 14 },
  ranchoEventLine: { fontSize: 9, marginBottom: 4, color: C.text },
  ranchoDate: { fontSize: 9.2, textAlign: 'right', marginTop: 20, marginBottom: 28, color: C.text },
  ranchoSignatureSection: { marginTop: 6 },
  ranchoSignatureRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 26 },
  ranchoSignatureBlock: { width: '44%', alignItems: 'center' },
  ranchoSignatureName: { fontSize: 8.5, textAlign: 'center', color: C.dark },
  ranchoSignatureRole: { fontSize: 8.5, textAlign: 'center', marginTop: 2, fontWeight: 700, color: C.dark },
  ranchoWitnessHeading: { fontSize: 8.5, fontWeight: 700, marginBottom: 16, textAlign: 'center', color: C.label, textTransform: 'uppercase', letterSpacing: 0.5 },
  ranchoWitnessText: { fontSize: 8, textAlign: 'center', marginTop: 2, color: C.muted },
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

function formatDateLong(dateStr: string): string {
  if (!dateStr) return '____ de ____________ de ______'
  const [year, month, day] = dateStr.split('-')
  if (!year || !month || !day) return dateStr
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]
  const monthName = monthNames[Number(month) - 1]
  if (!monthName) return formatDate(dateStr)
  return `${day} de ${monthName} de ${year}`
}

// ─── Rancho Aveiro Contract ─────────────────────────────────────────────────

function RanchoContractPage({ formData, clauses, space }: Props) {
  const preamble = clauses.find((clause) => clause.number === 'PREÂMBULO')
  const legalClauses = clauses.filter((clause) => clause.id !== preamble?.id)

  return (
    <Page size="A4" style={styles.ranchoPage}>
      {/* Header */}
      <View style={styles.ranchoHeader} fixed>
        <View style={styles.headerLeft}>
          <Text style={styles.spaceName}>{space.displayName}</Text>
          <Text style={styles.spaceAddress}>{space.address}, Campinas-SP CEP 13101-499</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.contractLabel}>Contrato</Text>
          <Text style={styles.contractNumberText}>Nº {formData.contractNumber}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.ranchoTitle}>
        Contrato de Locação de Imóvel por Tempo Pré-Determinado
      </Text>

      {/* Preamble */}
      {preamble ? <Text style={styles.ranchoIntro}>{preamble.content}</Text> : null}

      {/* Clauses */}
      {legalClauses.map((clause) => (
        <View key={clause.id} style={styles.ranchoClauseBlock}>
          <Text style={styles.ranchoClauseTitle}>CLÁUSULA {clause.number}: {clause.title}</Text>
          <Text style={styles.ranchoClauseText}>{clause.content}</Text>
        </View>
      ))}

      {/* Event Data */}
      <View style={styles.ranchoEventData} wrap={false}>
        <Text style={styles.ranchoEventLine}>Locação para {formData.guestCount || '___'} convidados</Text>
        <Text style={styles.ranchoEventLine}>Local da cerimônia: {space.displayName}</Text>
        <Text style={styles.ranchoEventLine}>
          Tipo de evento: {formData.eventType || '______________________'} às {formData.eventStartTime || '__:__'} horas.
        </Text>
        <Text style={styles.ranchoEventLine}>Buffet: ______________________________________________________________________________________</Text>
        <Text style={styles.ranchoEventLine}>Cerimonial: __________________________________________________________________________________</Text>
        <Text style={styles.ranchoEventLine}>Decoração: __________________________________________________________________________________</Text>
        <Text style={styles.ranchoEventLine}>Som: ________________________________________________________________________________________</Text>
        <Text style={styles.ranchoEventLine}>Fotografia: ___________________________________________________________________________________</Text>
        <Text style={styles.ranchoEventLine}>Bartender: ___________________________________________________________________________________</Text>
        <Text style={styles.ranchoEventLine}>Outros: ______________________________________________________________________________________</Text>
      </View>

      {/* Signatures */}
      <View style={styles.ranchoSignatureSection} wrap={false}>
        <Text style={styles.ranchoDate}>Campinas, {formatDateLong(formData.contractDate)}.</Text>

        <View style={styles.ranchoSignatureRow}>
          <View style={styles.ranchoSignatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.ranchoSignatureName}>{space.ownerName}</Text>
            <Text style={styles.ranchoSignatureRole}>LOCADOR</Text>
          </View>
          <View style={styles.ranchoSignatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.ranchoSignatureName}>{formData.clientName || '________________________________'}</Text>
            <Text style={styles.ranchoSignatureRole}>LOCATÁRIO</Text>
          </View>
        </View>

        <Text style={styles.ranchoWitnessHeading}>Testemunhas</Text>
        <View style={styles.ranchoSignatureRow}>
          <View style={styles.ranchoSignatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.ranchoWitnessText}>Nome: ____________________________</Text>
            <Text style={styles.ranchoWitnessText}>CPF: _____________________________</Text>
          </View>
          <View style={styles.ranchoSignatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.ranchoWitnessText}>Nome: ____________________________</Text>
            <Text style={styles.ranchoWitnessText}>CPF: _____________________________</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>{space.displayName} — Contrato Nº {formData.contractNumber}</Text>
        <Text
          style={styles.footerText}
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
        />
      </View>
    </Page>
  )
}

// ─── Estância / Default Contract ────────────────────────────────────────────

export function ContractPDFDocument({ formData, clauses, space }: Props) {
  if (space.id === 'rancho-aveiro') {
    return (
      <Document title={`Contrato ${formData.contractNumber} - ${space.displayName}`} author={space.ownerName}>
        <RanchoContractPage formData={formData} clauses={clauses} space={space} />
      </Document>
    )
  }

  const clientIsCNPJ = isCNPJ(formData.clientCPF)
  const clientDocLabel = clientIsCNPJ ? 'CNPJ' : 'CPF'
  const isEstancia = space.id === 'estancia-aveiro'

  return (
    <Document title={`Contrato ${formData.contractNumber} - ${space.displayName}`} author={space.ownerName}>
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Text style={styles.spaceName}>{space.displayName}</Text>
            <Text style={styles.spaceAddress}>{space.address} — {space.city}/{space.state}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.contractLabel}>Contrato</Text>
            <Text style={styles.contractNumberText}>Nº {formData.contractNumber}</Text>
            <Text style={styles.contractDateText}>{formatDate(formData.contractDate)}</Text>
          </View>
        </View>

        {/* ── Title ── */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Contrato de Locação de Espaço para Eventos</Text>
          <View style={styles.titleRule} />
        </View>

        {/* ── CONTRATADA ── */}
        <Text style={styles.sectionTitle}>Contratada</Text>
        <View style={styles.partyBox}>
          <View style={styles.partyGrid}>
            <View style={styles.partyFieldWide}>
              <Text style={styles.fieldLabel}>Razão Social / Nome</Text>
              <Text style={styles.fieldValue}>{space.displayName}</Text>
            </View>
            <View style={styles.partyField}>
              <Text style={styles.fieldLabel}>Representante</Text>
              <Text style={styles.fieldValueNormal}>{space.ownerName} ({space.ownerRole})</Text>
            </View>
            <View style={styles.partyField}>
              <Text style={styles.fieldLabel}>CPF</Text>
              <Text style={styles.fieldValueNormal}>{space.ownerCPF}</Text>
            </View>
            {space.ownerCNPJ ? (
              <View style={styles.partyField}>
                <Text style={styles.fieldLabel}>CNPJ</Text>
                <Text style={styles.fieldValueNormal}>{space.ownerCNPJ}</Text>
              </View>
            ) : null}
            {space.ownerRG ? (
              <View style={styles.partyField}>
                <Text style={styles.fieldLabel}>RG</Text>
                <Text style={styles.fieldValueNormal}>{space.ownerRG}</Text>
              </View>
            ) : null}
            <View style={styles.partyFieldWide}>
              <Text style={styles.fieldLabel}>Endereço</Text>
              <Text style={styles.fieldValueNormal}>{space.ownerAddress || `${space.address}, ${space.city}/${space.state}`}</Text>
            </View>
          </View>
        </View>

        {/* ── CONTRATANTE ── */}
        <Text style={styles.sectionTitle}>Contratante</Text>
        <View style={styles.partyBox}>
          <View style={styles.partyGrid}>
            <View style={clientIsCNPJ ? styles.partyField : styles.partyFieldWide}>
              <Text style={styles.fieldLabel}>{clientIsCNPJ ? 'Razão Social' : 'Nome Completo'}</Text>
              <Text style={styles.fieldValue}>{formData.clientName}</Text>
            </View>
            <View style={styles.partyField}>
              <Text style={styles.fieldLabel}>{clientDocLabel}</Text>
              <Text style={styles.fieldValueNormal}>{formData.clientCPF}</Text>
            </View>
            {!clientIsCNPJ && formData.clientRG ? (
              <View style={styles.partyField}>
                <Text style={styles.fieldLabel}>RG</Text>
                <Text style={styles.fieldValueNormal}>{formData.clientRG}</Text>
              </View>
            ) : null}
            <View style={styles.partyFieldWide}>
              <Text style={styles.fieldLabel}>{clientIsCNPJ ? 'Sede' : 'Endereço'}</Text>
              <Text style={styles.fieldValueNormal}>
                {formData.clientAddress}
                {formData.clientCity ? `, ${formData.clientCity}` : ''}
                {formData.clientState ? `/${formData.clientState}` : ''}
              </Text>
            </View>
            <View style={styles.partyField}>
              <Text style={styles.fieldLabel}>Telefone</Text>
              <Text style={styles.fieldValueNormal}>{formData.clientPhone}</Text>
            </View>
            {formData.clientEmail ? (
              <View style={styles.partyField}>
                <Text style={styles.fieldLabel}>E-mail</Text>
                <Text style={styles.fieldValueNormal}>{formData.clientEmail}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Event Details ── */}
        <Text style={styles.sectionTitle}>Dados do Evento</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Text style={styles.fieldLabel}>Data do Evento</Text>
            <Text style={styles.fieldValue}>{formatDate(formData.eventDate)}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.fieldLabel}>Horário</Text>
            <Text style={styles.fieldValueNormal}>{formData.eventStartTime} às {formData.eventEndTime}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.fieldLabel}>Nº de Convidados</Text>
            <Text style={styles.fieldValueNormal}>{formData.guestCount} pessoas</Text>
          </View>
          {isEstancia && (
            <>
              <View style={styles.infoCell}>
                <Text style={styles.fieldLabel}>Diárias</Text>
                <Text style={styles.fieldValueNormal}>{formData.dailyCount || '-'}</Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.fieldLabel}>Data de Saída</Text>
                <Text style={styles.fieldValueNormal}>{formatDate(formData.eventCheckoutDate) || '-'}</Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.fieldLabel}>Pacote</Text>
                <Text style={styles.fieldValueNormal}>{getPackageLabel(formData.packageType)}</Text>
              </View>
            </>
          )}
          <View style={styles.infoCellWide}>
            <Text style={styles.fieldLabel}>Tipo do Evento</Text>
            <Text style={styles.fieldValueNormal}>{formData.eventType}</Text>
          </View>
        </View>

        {/* ── Financial ── */}
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
          <View style={styles.finRowTotal}>
            <Text style={[styles.finCol1, { fontWeight: 700, fontSize: 10 }]}>TOTAL</Text>
            <Text style={[styles.finCol2, { fontSize: 8.5, color: C.muted }]}>{formData.paymentMethod}</Text>
            <Text style={[styles.finCol3, { fontWeight: 700, fontSize: 10.5 }]}>{toCurrency(formData.totalValue)}</Text>
          </View>
        </View>

        {/* ── Clauses ── */}
        <Text style={styles.sectionTitle}>Cláusulas Contratuais</Text>
        {clauses.map((clause) => (
          <View key={clause.id} style={styles.clauseBlock} wrap={false}>
            <Text style={styles.clauseTitle}>
              Cláusula {clause.number} – {clause.title}
            </Text>
            <Text style={styles.clauseContent}>{clause.content}</Text>
          </View>
        ))}

        {/* ── Observations ── */}
        {formData.observations ? (
          <>
            <Text style={styles.sectionTitle}>Observações Gerais</Text>
            <View style={styles.obsBox}>
              <Text style={styles.obsText}>{formData.observations}</Text>
            </View>
          </>
        ) : null}

        {/* ── Signatures ── */}
        <View style={styles.signatureSection} wrap={false}>
          <Text style={styles.signatureDate}>
            {space.city}/{space.state}, {formatDateLong(formData.contractDate)}.
          </Text>

          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Contratada</Text>
              <Text style={styles.signatureName}>{space.ownerName}</Text>
              <Text style={styles.signatureName}>{space.displayName}</Text>
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Contratante</Text>
              <Text style={styles.signatureName}>{formData.clientName}</Text>
              <Text style={styles.signatureName}>{clientDocLabel}: {formData.clientCPF}</Text>
            </View>
          </View>

          <Text style={styles.witnessTitle}>Testemunhas</Text>
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

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{space.displayName} — Contrato Nº {formData.contractNumber}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
