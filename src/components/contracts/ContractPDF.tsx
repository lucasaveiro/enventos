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

const styles = StyleSheet.create({
  // ─── Common Page ────────────────────────────────────────────────────────────
  page: {
    fontFamily: 'Roboto',
    fontSize: 9.5,
    paddingTop: 35,
    paddingBottom: 40,
    paddingHorizontal: 45,
    color: '#111',
    lineHeight: 1.5,
  },

  // ─── Header (Rancho) ───────────────────────────────────────────────────────
  headerCenter: {
    alignItems: 'center',
    marginBottom: 8,
  },
  brandName: {
    fontSize: 22,
    fontWeight: 700,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 10,
  },
  headerAddress: {
    fontSize: 8.5,
    textAlign: 'center',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 9,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#444',
    marginTop: 2,
  },
  headerPhone: {
    fontSize: 8.5,
    textAlign: 'center',
    color: '#333',
    marginTop: 1,
    marginBottom: 6,
  },

  // ─── Title ──────────────────────────────────────────────────────────────────
  contractTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
  },

  // ─── Body text ──────────────────────────────────────────────────────────────
  bodyText: {
    fontSize: 9.3,
    textAlign: 'justify',
    lineHeight: 1.55,
    marginBottom: 4,
  },

  // ─── Clauses ────────────────────────────────────────────────────────────────
  clauseBlock: {
    marginBottom: 4,
  },
  clauseTitleInline: {
    fontWeight: 700,
    fontSize: 9.3,
  },
  clauseText: {
    fontSize: 9.3,
    textAlign: 'justify',
    lineHeight: 1.5,
  },

  // ─── Event data lines ──────────────────────────────────────────────────────
  eventDataSection: {
    marginTop: 10,
  },
  eventLine: {
    fontSize: 9.2,
    marginBottom: 4,
  },

  // ─── Date ───────────────────────────────────────────────────────────────────
  dateRight: {
    fontSize: 9.2,
    textAlign: 'right',
    marginTop: 16,
    marginBottom: 24,
  },

  // ─── Signatures ─────────────────────────────────────────────────────────────
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  signatureBlock: {
    width: '44%',
    alignItems: 'center',
  },
  signatureLine: {
    borderTopWidth: 0.5,
    borderTopColor: '#111',
    width: '100%',
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 8.5,
    textAlign: 'center',
  },
  signatureRole: {
    fontSize: 8.5,
    textAlign: 'center',
    fontWeight: 700,
    marginTop: 1,
  },
  witnessHeading: {
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 12,
    textAlign: 'center',
  },
  witnessText: {
    fontSize: 8,
    textAlign: 'center',
    marginTop: 2,
    color: '#333',
  },

  // ─── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 45,
    right: 45,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  footerText: {
    fontSize: 7.5,
    color: '#888',
  },

  // ─── Estância Header ───────────────────────────────────────────────────────
  estanciaHeaderCenter: {
    alignItems: 'center',
    marginBottom: 8,
  },
  estanciaBrandName: {
    fontSize: 20,
    fontWeight: 700,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 6,
  },

  // ─── Section title (Estância) ──────────────────────────────────────────────
  sectionLabel: {
    fontSize: 9.3,
    fontWeight: 700,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 3,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  fieldLabel: {
    fontWeight: 700,
    fontSize: 9,
    color: '#333',
    marginRight: 3,
  },
  fieldValue: {
    fontSize: 9,
    color: '#111',
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

function getPackageLabel(packageType: string): string {
  if (packageType === 'simples') return 'Pacote Simples'
  if (packageType === 'completo') return 'Pacote Completo'
  return '-'
}

// ─── Rancho Aveiro Contract ─────────────────────────────────────────────────

function RanchoContractPage({ formData, clauses, space }: Props) {
  const preamble = clauses.find((clause) => clause.number === 'PREÂMBULO')
  const legalClauses = clauses.filter((clause) => clause.id !== preamble?.id)

  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.headerCenter}>
        <Text style={styles.brandName}>{space.displayName}</Text>
        <Text style={styles.headerAddress}>
          {space.spaceFullAddress || `${space.address}, ${space.city}-${space.state}`}
        </Text>
        <Text style={styles.headerSubtitle}>Espaço para eventos</Text>
        <Text style={styles.headerPhone}>(19) 99623-1666</Text>
      </View>

      {/* Title */}
      <Text style={styles.contractTitle}>
        Contrato de locação de imóvel por tempo pré-determinado N: {formData.contractNumber}
      </Text>

      {/* Preamble */}
      {preamble ? <Text style={styles.bodyText}>{preamble.content}</Text> : null}

      {/* Clauses */}
      {legalClauses.map((clause) => (
        <View key={clause.id} style={styles.clauseBlock} wrap={false}>
          <Text style={styles.clauseText}>
            <Text style={styles.clauseTitleInline}>CLÁUSULA {clause.number}: </Text>
            {clause.content}
          </Text>
        </View>
      ))}

      {/* Event Data */}
      <View style={styles.eventDataSection} wrap={false}>
        <Text style={styles.eventLine}>
          Locação para pessoas, {formData.guestCount || '___'} convidados.
        </Text>
        <Text style={styles.eventLine}>
          Tipo do evento: {formData.eventType || '________________________'} das {formData.eventStartTime || '__:__'} às {formData.eventEndTime || '__:__'}.
        </Text>
        <Text style={styles.eventLine}>Buffet:___________________________________________________________________________________________</Text>
        <Text style={styles.eventLine}>Decoração:_______________________________________________________________________________________</Text>
        <Text style={styles.eventLine}>Som:_____________________________________________________________________________________________</Text>
        <Text style={styles.eventLine}>Fotografia:________________________________________________________________________________________</Text>
        <Text style={styles.eventLine}>Cerimonial:_______________________________________________________________________________________</Text>
        <Text style={styles.eventLine}>Outros:___________________________________________________________________________________________</Text>
      </View>

      {/* Date & Signatures */}
      <View wrap={false}>
        <Text style={styles.dateRight}>Campinas, {formatDateLong(formData.contractDate)}.</Text>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{space.ownerName}</Text>
            <Text style={styles.signatureRole}>LOCADOR</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{formData.clientName || '________________________________'}</Text>
            <Text style={styles.signatureRole}>LOCATÁRIO</Text>
          </View>
        </View>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <Text style={styles.witnessHeading}>TESTEMUNHAS:</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.witnessText}>Nome:_____________________________</Text>
            <Text style={styles.witnessText}>CPF:______________________________</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.witnessHeading}>TESTEMUNHAS:</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.witnessText}>Nome:_____________________________</Text>
            <Text style={styles.witnessText}>CPF:______________________________</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer} fixed>
        <Text
          style={styles.footerText}
          render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`}
        />
      </View>
    </Page>
  )
}

// ─── Estância Aveiro Contract ───────────────────────────────────────────────

function EstanciaContractPage({ formData, clauses, space }: Props) {
  const preamble = clauses.find((clause) => clause.number === 'PREÂMBULO')
  const legalClauses = clauses.filter((clause) => clause.id !== preamble?.id)
  const clientIsCNPJ = isCNPJ(formData.clientCPF)
  const clientDocLabel = clientIsCNPJ ? 'CNPJ' : 'CPF'

  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.estanciaHeaderCenter}>
        <Text style={styles.estanciaBrandName}>{space.displayName}</Text>
        <Text style={styles.headerAddress}>
          {space.spaceFullAddress || `${space.address}, ${space.city}-${space.state}`}
        </Text>
        <Text style={styles.headerSubtitle}>Espaço para eventos</Text>
      </View>

      {/* Title */}
      <Text style={styles.contractTitle}>
        Contrato de Locação de Espaço para Eventos N: {formData.contractNumber}
      </Text>

      {/* Contract date */}
      <Text style={[styles.bodyText, { marginBottom: 10 }]}>
        Data do contrato: {formatDate(formData.contractDate)}
      </Text>

      {/* Preamble */}
      {preamble ? (
        <View style={styles.clauseBlock}>
          <Text style={styles.clauseText}>
            <Text style={styles.clauseTitleInline}>PREÂMBULO — {preamble.title}: </Text>
            {preamble.content}
          </Text>
        </View>
      ) : null}

      {/* Contratada info block */}
      <Text style={styles.sectionLabel}>Dados da Contratada</Text>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Nome/Razão Social: </Text>
        <Text style={styles.fieldValue}>{space.displayName}</Text>
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Representante: </Text>
        <Text style={styles.fieldValue}>{space.ownerName} ({space.ownerRole})</Text>
        <Text style={styles.fieldLabel}>   CPF: </Text>
        <Text style={styles.fieldValue}>{space.ownerCPF}</Text>
        {space.ownerRG ? (
          <>
            <Text style={styles.fieldLabel}>   RG: </Text>
            <Text style={styles.fieldValue}>{space.ownerRG}</Text>
          </>
        ) : null}
      </View>
      {space.ownerCNPJ ? (
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>CNPJ: </Text>
          <Text style={styles.fieldValue}>{space.ownerCNPJ}</Text>
        </View>
      ) : null}
      <View style={[styles.fieldRow, { marginBottom: 6 }]}>
        <Text style={styles.fieldLabel}>Endereço: </Text>
        <Text style={styles.fieldValue}>{space.ownerAddress || `${space.address}, ${space.city}/${space.state}`}</Text>
      </View>

      {/* Contratante info block */}
      <Text style={styles.sectionLabel}>Dados do(a) Contratante</Text>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>{clientIsCNPJ ? 'Razão Social' : 'Nome Completo'}: </Text>
        <Text style={styles.fieldValue}>{formData.clientName}</Text>
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>{clientDocLabel}: </Text>
        <Text style={styles.fieldValue}>{formData.clientCPF}</Text>
        {!clientIsCNPJ && formData.clientRG ? (
          <>
            <Text style={styles.fieldLabel}>   RG: </Text>
            <Text style={styles.fieldValue}>{formData.clientRG}</Text>
          </>
        ) : null}
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>{clientIsCNPJ ? 'Sede' : 'Endereço'}: </Text>
        <Text style={styles.fieldValue}>
          {formData.clientAddress}
          {formData.clientCity ? `, ${formData.clientCity}` : ''}
          {formData.clientState ? `/${formData.clientState}` : ''}
        </Text>
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Telefone: </Text>
        <Text style={styles.fieldValue}>{formData.clientPhone}</Text>
        {formData.clientEmail ? (
          <>
            <Text style={styles.fieldLabel}>   E-mail: </Text>
            <Text style={styles.fieldValue}>{formData.clientEmail}</Text>
          </>
        ) : null}
      </View>

      {/* Event info */}
      <Text style={styles.sectionLabel}>Dados do Evento</Text>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Data do Evento: </Text>
        <Text style={styles.fieldValue}>{formatDate(formData.eventDate)}</Text>
        <Text style={styles.fieldLabel}>   Horário: </Text>
        <Text style={styles.fieldValue}>{formData.eventStartTime} às {formData.eventEndTime}</Text>
        <Text style={styles.fieldLabel}>   Convidados: </Text>
        <Text style={styles.fieldValue}>{formData.guestCount}</Text>
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Tipo: </Text>
        <Text style={styles.fieldValue}>{formData.eventType}</Text>
        {formData.dailyCount ? (
          <>
            <Text style={styles.fieldLabel}>   Diárias: </Text>
            <Text style={styles.fieldValue}>{formData.dailyCount}</Text>
          </>
        ) : null}
        {formData.eventCheckoutDate ? (
          <>
            <Text style={styles.fieldLabel}>   Saída: </Text>
            <Text style={styles.fieldValue}>{formatDate(formData.eventCheckoutDate)}</Text>
          </>
        ) : null}
        {formData.packageType ? (
          <>
            <Text style={styles.fieldLabel}>   Pacote: </Text>
            <Text style={styles.fieldValue}>{getPackageLabel(formData.packageType)}</Text>
          </>
        ) : null}
      </View>

      {/* Financial */}
      <Text style={styles.sectionLabel}>Condições Financeiras</Text>
      <View style={[styles.fieldRow, { marginBottom: 1 }]}>
        <Text style={styles.fieldLabel}>Valor Total: </Text>
        <Text style={styles.fieldValue}>{toCurrency(formData.totalValue)}</Text>
        <Text style={styles.fieldLabel}>   Forma de pagamento: </Text>
        <Text style={styles.fieldValue}>{formData.paymentMethod}</Text>
      </View>
      <View style={[styles.fieldRow, { marginBottom: 1 }]}>
        <Text style={styles.fieldLabel}>Entrada/Sinal: </Text>
        <Text style={styles.fieldValue}>{toCurrency(formData.depositValue)}</Text>
        <Text style={styles.fieldLabel}>   Vencimento: </Text>
        <Text style={styles.fieldValue}>{formatDate(formData.depositDueDate)}</Text>
      </View>
      <View style={[styles.fieldRow, { marginBottom: 1 }]}>
        <Text style={styles.fieldLabel}>Valor Restante: </Text>
        <Text style={styles.fieldValue}>{toCurrency(formData.remainingValue)}</Text>
        <Text style={styles.fieldLabel}>   Vencimento: </Text>
        <Text style={styles.fieldValue}>{formatDate(formData.remainingDueDate)}</Text>
      </View>
      {formData.cautionValue ? (
        <View style={[styles.fieldRow, { marginBottom: 6 }]}>
          <Text style={styles.fieldLabel}>Cheque Caução: </Text>
          <Text style={styles.fieldValue}>{toCurrency(formData.cautionValue)}</Text>
        </View>
      ) : null}

      {/* Clauses */}
      {legalClauses.map((clause) => (
        <View key={clause.id} style={styles.clauseBlock} wrap={false}>
          <Text style={styles.clauseText}>
            <Text style={styles.clauseTitleInline}>CLÁUSULA {clause.number} — {clause.title}: </Text>
            {clause.content}
          </Text>
        </View>
      ))}

      {/* Observations */}
      {formData.observations ? (
        <View style={styles.clauseBlock}>
          <Text style={styles.clauseText}>
            <Text style={styles.clauseTitleInline}>OBSERVAÇÕES GERAIS: </Text>
            {formData.observations}
          </Text>
        </View>
      ) : null}

      {/* Date & Signatures */}
      <View wrap={false}>
        <Text style={styles.dateRight}>
          {space.city}/{space.state}, {formatDateLong(formData.contractDate)}.
        </Text>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{space.ownerName}</Text>
            <Text style={styles.signatureRole}>CONTRATADA</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{formData.clientName}</Text>
            <Text style={styles.signatureRole}>CONTRATANTE</Text>
          </View>
        </View>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <Text style={styles.witnessHeading}>TESTEMUNHAS:</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.witnessText}>Nome:_____________________________</Text>
            <Text style={styles.witnessText}>CPF:______________________________</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.witnessHeading}>TESTEMUNHAS:</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.witnessText}>Nome:_____________________________</Text>
            <Text style={styles.witnessText}>CPF:______________________________</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer} fixed>
        <Text
          style={styles.footerText}
          render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`}
        />
      </View>
    </Page>
  )
}

// ─── Document Router ────────────────────────────────────────────────────────

export function ContractPDFDocument({ formData, clauses, space }: Props) {
  const title = `Contrato ${formData.contractNumber} - ${space.displayName}`

  if (space.id === 'rancho-aveiro') {
    return (
      <Document title={title} author={space.ownerName}>
        <RanchoContractPage formData={formData} clauses={clauses} space={space} />
      </Document>
    )
  }

  return (
    <Document title={title} author={space.ownerName}>
      <EstanciaContractPage formData={formData} clauses={clauses} space={space} />
    </Document>
  )
}
