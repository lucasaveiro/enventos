export interface ContractFormData {
  contractNumber: string
  contractDate: string
  // Client data
  clientName: string
  clientCPF: string
  clientRG: string
  clientAddress: string
  clientCity: string
  clientState: string
  clientPhone: string
  clientEmail: string
  // Event data
  eventDate: string
  eventStartTime: string
  eventEndTime: string
  eventType: string
  guestCount: string
  // Financial
  totalValue: string
  depositValue: string
  depositDueDate: string
  remainingValue: string
  remainingDueDate: string
  paymentMethod: string
  // General
  observations: string
}

export interface ContractClause {
  id: string
  number: string
  title: string
  content: string
  edited: boolean
}

export interface SpaceConfig {
  id: string
  displayName: string
  address: string
  city: string
  state: string
  ownerName: string
  ownerCPF: string
  ownerRole: string
  color: string
  bgColor: string
  hoverBorderClass: string
  description: string
  prefix: string
}

export const SPACES: Record<string, SpaceConfig> = {
  'estancia-aveiro': {
    id: 'estancia-aveiro',
    displayName: 'Estância Aveiro',
    address: 'Rua das Flores, 123',
    city: 'Cidade',
    state: 'SP',
    ownerName: 'Lucas Aveiro',
    ownerCPF: '000.000.000-00',
    ownerRole: 'Sócio-Proprietário',
    color: '#10B981',
    bgColor: '#ECFDF5',
    hoverBorderClass: 'hover:border-emerald-500',
    description: 'Espaço elegante para eventos exclusivos com infraestrutura completa',
    prefix: 'EST',
  },
  'rancho-aveiro': {
    id: 'rancho-aveiro',
    displayName: 'Rancho Aveiro',
    address: 'Estrada Rural, 456',
    city: 'Cidade',
    state: 'SP',
    ownerName: 'Lucas Aveiro',
    ownerCPF: '000.000.000-00',
    ownerRole: 'Sócio-Proprietário',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    hoverBorderClass: 'hover:border-amber-400',
    description: 'Espaço rústico ao ar livre para festas e confraternizações',
    prefix: 'RAN',
  },
}

export function formatCurrency(value: string): string {
  const num = parseFloat((value || '').replace(',', '.'))
  if (isNaN(num) || !value) return ''
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  if (!year || !month || !day) return dateStr
  return `${day}/${month}/${year}`
}

export function generateContractNumber(space: SpaceConfig): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${space.prefix}-${y}${m}${d}`
}

export function substituteClause(
  content: string,
  formData: Partial<ContractFormData>,
  space: SpaceConfig
): string {
  return content
    .replace(/{spaceName}/g, space.displayName)
    .replace(/{spaceAddress}/g, space.address)
    .replace(/{city}/g, space.city)
    .replace(/{state}/g, space.state)
    .replace(/{ownerName}/g, space.ownerName)
    .replace(/{ownerCPF}/g, space.ownerCPF)
    .replace(/{ownerRole}/g, space.ownerRole)
    .replace(/{contractNumber}/g, formData.contractNumber || '[Nº DO CONTRATO]')
    .replace(/{contractDate}/g, formatDate(formData.contractDate || '') || '[DATA DO CONTRATO]')
    .replace(/{clientName}/g, formData.clientName || '[NOME DO CONTRATANTE]')
    .replace(/{clientCPF}/g, formData.clientCPF || '[CPF]')
    .replace(/{clientRG}/g, formData.clientRG || '[RG]')
    .replace(/{clientAddress}/g, formData.clientAddress || '[ENDEREÇO]')
    .replace(/{clientCity}/g, formData.clientCity || '[CIDADE]')
    .replace(/{clientState}/g, formData.clientState || '[ESTADO]')
    .replace(/{clientPhone}/g, formData.clientPhone || '[TELEFONE]')
    .replace(/{clientEmail}/g, formData.clientEmail || '[EMAIL]')
    .replace(/{eventDate}/g, formatDate(formData.eventDate || '') || '[DATA DO EVENTO]')
    .replace(/{eventStartTime}/g, formData.eventStartTime || '[HORA INÍCIO]')
    .replace(/{eventEndTime}/g, formData.eventEndTime || '[HORA FIM]')
    .replace(/{eventType}/g, formData.eventType || '[TIPO DO EVENTO]')
    .replace(/{guestCount}/g, formData.guestCount || '[Nº DE CONVIDADOS]')
    .replace(/{totalValue}/g, formatCurrency(formData.totalValue || '') || '[VALOR TOTAL]')
    .replace(/{depositValue}/g, formatCurrency(formData.depositValue || '') || '[VALOR ENTRADA]')
    .replace(/{depositDueDate}/g, formatDate(formData.depositDueDate || '') || '[DATA ENTRADA]')
    .replace(/{remainingValue}/g, formatCurrency(formData.remainingValue || '') || '[VALOR RESTANTE]')
    .replace(/{remainingDueDate}/g, formatDate(formData.remainingDueDate || '') || '[DATA RESTANTE]')
    .replace(/{paymentMethod}/g, formData.paymentMethod || '[FORMA DE PAGAMENTO]')
}

export const DEFAULT_CLAUSES: Omit<ContractClause, 'edited'>[] = [
  {
    id: 'objeto',
    number: 'PRIMEIRA',
    title: 'DO OBJETO',
    content:
      'O presente instrumento tem por objeto a locação do espaço denominado {spaceName}, localizado em {spaceAddress}, para a realização do evento especificado neste contrato, nas datas, horários e condições aqui estabelecidos.',
  },
  {
    id: 'periodo',
    number: 'SEGUNDA',
    title: 'DO PERÍODO E HORÁRIO DE UTILIZAÇÃO',
    content:
      'O(A) CONTRATANTE terá direito ao uso do espaço no dia {eventDate}, das {eventStartTime} às {eventEndTime} horas. O horário de encerramento deverá ser rigorosamente respeitado, sendo vedada qualquer prorrogação sem prévio acordo escrito e pagamento de taxa adicional estipulada pela CONTRATADA.',
  },
  {
    id: 'valor',
    number: 'TERCEIRA',
    title: 'DO VALOR CONTRATADO',
    content:
      'O valor total contratado pela locação do espaço é de {totalValue}, conforme as condições de pagamento estabelecidas neste contrato.',
  },
  {
    id: 'pagamento',
    number: 'QUARTA',
    title: 'DAS CONDIÇÕES DE PAGAMENTO',
    content:
      'O pagamento será realizado da seguinte forma:\n\na) Entrada/Sinal: {depositValue}, com vencimento em {depositDueDate};\nb) Valor Restante: {remainingValue}, com vencimento em {remainingDueDate};\nc) Forma de pagamento: {paymentMethod}.\n\nO não pagamento nas datas acordadas ensejará a aplicação de multa de 2% (dois por cento) sobre o valor em atraso, acrescida de juros de 1% (um por cento) ao mês.',
  },
  {
    id: 'sinal',
    number: 'QUINTA',
    title: 'DO SINAL E DA RESERVA DE DATA',
    content:
      'Para a efetiva reserva da data do evento, o(a) CONTRATANTE deverá realizar o pagamento do sinal no valor e prazo estipulados neste contrato. O sinal é irrestituível em caso de desistência ou cancelamento por iniciativa do(a) CONTRATANTE, conforme previsto na Cláusula Oitava deste instrumento.',
  },
  {
    id: 'obrigacoes_contratante',
    number: 'SEXTA',
    title: 'DAS OBRIGAÇÕES DO(A) CONTRATANTE',
    content:
      'São obrigações do(a) CONTRATANTE:\n\na) Efetuar os pagamentos nas datas e formas acordadas;\nb) Zelar pelo espaço e por todos os equipamentos e instalações disponibilizados, responsabilizando-se por danos causados por si, seus convidados ou prestadores de serviço;\nc) Respeitar a capacidade máxima de convidados permitida para o espaço;\nd) Não realizar obras, fixações ou alterações no espaço sem autorização prévia e por escrito da CONTRATADA;\ne) Retirar todos os pertences, decorações e equipamentos ao término do evento;\nf) Responsabilizar-se pelo comportamento de todos os presentes no evento;\ng) Apresentar este contrato sempre que solicitado pela CONTRATADA.',
  },
  {
    id: 'obrigacoes_contratada',
    number: 'SÉTIMA',
    title: 'DAS OBRIGAÇÕES DA CONTRATADA',
    content:
      'São obrigações da CONTRATADA:\n\na) Disponibilizar o espaço limpo, organizado e em perfeitas condições de uso;\nb) Garantir o funcionamento de todas as instalações e equipamentos incluídos na locação;\nc) Prestar suporte e orientação ao(à) CONTRATANTE durante o período contratado;\nd) Manter sigilo sobre os dados pessoais do(a) CONTRATANTE;\ne) Comunicar previamente ao(à) CONTRATANTE qualquer situação que possa afetar a realização do evento.',
  },
  {
    id: 'cancelamento',
    number: 'OITAVA',
    title: 'DO CANCELAMENTO E DA RESCISÃO',
    content:
      'Em caso de cancelamento pelo(a) CONTRATANTE:\n\na) Com mais de 60 (sessenta) dias de antecedência: restituição de 50% do sinal pago;\nb) Entre 30 (trinta) e 60 (sessenta) dias de antecedência: perda de 75% do sinal pago;\nc) Com menos de 30 (trinta) dias de antecedência: perda integral do sinal pago.\n\nEm caso de cancelamento pela CONTRATADA sem motivo justificado: restituição integral dos valores pagos, acrescidos de multa correspondente a 20% (vinte por cento) do valor total do contrato.',
  },
  {
    id: 'capacidade',
    number: 'NONA',
    title: 'DA CAPACIDADE E DA SEGURANÇA',
    content:
      'O(A) CONTRATANTE declara ter ciência da capacidade máxima de convidados permitida para o espaço contratado e compromete-se a respeitá-la rigorosamente. É expressamente vedada a entrada de número de pessoas além do limite estabelecido. A contratação de profissionais de segurança, quando julgada necessária, é de inteira responsabilidade do(a) CONTRATANTE.',
  },
  {
    id: 'penalidades',
    number: 'DÉCIMA',
    title: 'DAS PENALIDADES',
    content:
      'O descumprimento de qualquer cláusula deste contrato pela parte infratora sujeitará ao pagamento de multa no valor equivalente a 10% (dez por cento) sobre o valor total do contrato, sem prejuízo da reparação de eventuais danos materiais e morais comprovados.',
  },
  {
    id: 'disposicoes',
    number: 'DÉCIMA PRIMEIRA',
    title: 'DAS DISPOSIÇÕES GERAIS',
    content:
      'O presente contrato constitui o único e integral acordo entre as partes relativamente ao objeto aqui descrito, substituindo todos os entendimentos anteriores, verbais ou escritos. Qualquer alteração somente terá validade se realizada por escrito e assinada por ambas as partes. O contrato obriga as partes e seus herdeiros e sucessores a qualquer título.',
  },
  {
    id: 'foro',
    number: 'DÉCIMA SEGUNDA',
    title: 'DO FORO',
    content:
      'As partes elegem o foro da Comarca de {city}/{state} para dirimir quaisquer dúvidas ou litígios decorrentes do presente contrato, com expressa renúncia a qualquer outro, por mais privilegiado que seja.\n\nE por estarem assim justos e contratados, assinam o presente instrumento em 2 (duas) vias de igual teor e forma, na presença das testemunhas abaixo identificadas.',
  },
]

export function getInitialClauses(): ContractClause[] {
  return DEFAULT_CLAUSES.map((clause) => ({ ...clause, edited: false }))
}
