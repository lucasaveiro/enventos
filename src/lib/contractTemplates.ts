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
  dailyCount: string
  packageType: string
  eventCheckoutDate: string
  // Financial
  totalValue: string
  depositValue: string
  depositDueDate: string
  remainingValue: string
  remainingDueDate: string
  paymentMethod: string
  cautionValue: string
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
  ownerCNPJ: string
  ownerEmail: string
  ownerPhone: string
  ownerRG: string
  ownerRole: string
  ownerAddress: string
  bankName: string
  bankCode: string
  bankAgency: string
  bankAccount: string
  bankHolder: string
  bankHolderDoc: string
  spaceFullAddress: string
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
    address: 'Estrada Municipal dos Aveiros, 530',
    city: 'Campinas',
    state: 'SP',
    ownerName: 'Edvaldo José Aveiro',
    ownerCPF: '068.786.648-02',
    ownerCNPJ: '',
    ownerEmail: '',
    ownerPhone: '19996231666',
    ownerRG: '14.471.121',
    ownerRole: 'Proprietário',
    ownerAddress: 'Estrada Municipal dos Aveiros, 530, Bairro Jardim Andorinhas, Campinas - SP, CEP: 13101-499',
    bankName: 'Santander',
    bankCode: '033',
    bankAgency: '0194',
    bankAccount: '01003495-8',
    bankHolder: 'Edvaldo José Aveiro',
    bankHolderDoc: '068.786.648-02',
    spaceFullAddress: 'Estrada Municipal dos Aveiros, SN, Jardim Andorinhas, Campinas - SP, CEP: 13101-499',
    color: '#1e7a4e',
    bgColor: '#e4f5ec',
    hoverBorderClass: 'hover:border-green-700',
    description: 'Espaço elegante para eventos exclusivos com infraestrutura completa',
    prefix: 'EST',
  },
  'rancho-aveiro': {
    id: 'rancho-aveiro',
    displayName: 'Rancho Aveiro',
    address: 'Estrada Municipal dos Aveiros, 650',
    city: 'Campinas',
    state: 'SP',
    ownerName: 'Lucas Nogueira Aveiro',
    ownerCPF: '420.893.258-95',
    ownerCNPJ: '65.318.213/0001-01',
    ownerEmail: 'contato@ranchoaveiro.com.br',
    ownerPhone: '19996231666',
    ownerRG: '',
    ownerRole: 'Locador',
    ownerAddress:
      'Estrada Municipal dos Aveiros, 300, Jardim Andorinhas - Campinas / SP CEP: 13101-499',
    bankName: 'Santander',
    bankCode: '033',
    bankAgency: '0194',
    bankAccount: '01003495-8',
    bankHolder: 'Lucas Nogueira Aveiro',
    bankHolderDoc: '420.893.258-95',
    spaceFullAddress:
      'Estrada Municipal dos Aveiros, 650 - Chácaras Aveiro / Jd. Andorinhas, Campinas-SP CEP: 13101-499',
    color: '#9e6c14',
    bgColor: '#fef0d0',
    hoverBorderClass: 'hover:border-amber-700',
    description: 'Espaço rústico ao ar livre para festas e confraternizações',
    prefix: 'RAN',
  },
}

export function isCNPJ(doc: string): boolean {
  const digits = (doc || '').replace(/\D/g, '')
  return digits.length >= 14 || doc.includes('/')
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
  const packageType = (formData.packageType || '').toLowerCase()
  const isSimplePackage = packageType === 'simples'
  const isCompletePackage = packageType === 'completo'
  const clientIsCNPJ = isCNPJ(formData.clientCPF || '')

  // Build client qualification text (PF vs PJ)
  let clientQualification: string
  if (clientIsCNPJ) {
    // Pessoa Jurídica
    const parts = [formData.clientName || '[RAZÃO SOCIAL]']
    parts.push(`inscrita no CNPJ nº ${formData.clientCPF || '[CNPJ]'}`)
    if (formData.clientAddress) {
      parts.push(`com sede em ${formData.clientAddress}`)
      if (formData.clientCity) {
        parts[parts.length - 1] += `, ${formData.clientCity}`
        if (formData.clientState) parts[parts.length - 1] += ` - ${formData.clientState}`
      }
    }
    clientQualification = parts.join(', ')
  } else {
    // Pessoa Física — Rancho style
    if (space.id === 'rancho-aveiro') {
      const parts = [`o(a) Sr(a): ${formData.clientName || '[NOME DO LOCATÁRIO]'}`]
      parts.push('nacionalidade: [NACIONALIDADE], estado civil: [ESTADO CIVIL], profissão: [PROFISSÃO]')
      if (formData.clientRG) parts.push(`portador(a) da CI/RG nº ${formData.clientRG}`)
      parts.push(`CPF/MF nº ${formData.clientCPF || '[CPF]'}`)
      parts.push(`residente e domiciliado(a) à ${formData.clientAddress || '[ENDEREÇO]'}`)
      if (formData.clientCity) {
        parts[parts.length - 1] += `, ${formData.clientCity}`
        if (formData.clientState) parts[parts.length - 1] += ` - ${formData.clientState}`
      }
      clientQualification = parts.join(', ')
    } else {
      // Estância style
      const parts = [formData.clientName || '[NOME DO LOCATÁRIO]']
      if (formData.clientRG) parts.push(`RG: ${formData.clientRG}`)
      parts.push(`CPF: ${formData.clientCPF || '[CPF]'}`)
      parts.push(`residente e domiciliado(a) à ${formData.clientAddress || '[ENDEREÇO]'}`)
      if (formData.clientCity) {
        parts[parts.length - 1] += `, ${formData.clientCity}`
        if (formData.clientState) parts[parts.length - 1] += ` - ${formData.clientState}`
      }
      clientQualification = parts.join(', ')
    }
  }

  return content
    .replace(/{spaceName}/g, space.displayName)
    .replace(/{spaceAddress}/g, space.address)
    .replace(/{spaceFullAddress}/g, space.spaceFullAddress)
    .replace(/{city}/g, space.city)
    .replace(/{state}/g, space.state)
    .replace(/{ownerName}/g, space.ownerName)
    .replace(/{ownerCPF}/g, space.ownerCPF)
    .replace(/{ownerCNPJ}/g, space.ownerCNPJ || '[CNPJ]')
    .replace(/{ownerEmail}/g, space.ownerEmail || '[EMAIL]')
    .replace(/{ownerRG}/g, space.ownerRG)
    .replace(/{ownerRole}/g, space.ownerRole)
    .replace(/{ownerAddress}/g, space.ownerAddress)
    .replace(/{bankName}/g, space.bankName || '[BANCO]')
    .replace(/{bankCode}/g, space.bankCode || '[CÓD]')
    .replace(/{bankAgency}/g, space.bankAgency || '[AGÊNCIA]')
    .replace(/{bankAccount}/g, space.bankAccount || '[CONTA]')
    .replace(/{bankHolder}/g, space.bankHolder || space.ownerName)
    .replace(/{bankHolderDoc}/g, space.bankHolderDoc || space.ownerCPF)
    .replace(/{clientQualification}/g, clientQualification)
    .replace(/{contractNumber}/g, formData.contractNumber || '[Nº DO CONTRATO]')
    .replace(/{contractDate}/g, formatDate(formData.contractDate || '') || '[DATA DO CONTRATO]')
    .replace(/{clientName}/g, formData.clientName || '[NOME DO LOCATÁRIO]')
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
    .replace(/{dailyCount}/g, formData.dailyCount || '[TOTAL DE DIÁRIAS]')
    .replace(/{eventCheckoutDate}/g, formatDate(formData.eventCheckoutDate || '') || '[DATA DE SAÍDA]')
    .replace(/{packageSimpleMark}/g, isSimplePackage ? 'X' : ' ')
    .replace(/{packageCompleteMark}/g, isCompletePackage ? 'X' : ' ')
    .replace(
      /{packageType}/g,
      isSimplePackage ? 'Pacote Simples' : isCompletePackage ? 'Pacote Completo' : '[PACOTE]'
    )
    .replace(/{totalValue}/g, formatCurrency(formData.totalValue || '') || '[VALOR TOTAL]')
    .replace(/{depositValue}/g, formatCurrency(formData.depositValue || '') || '[VALOR ENTRADA]')
    .replace(/{depositDueDate}/g, formatDate(formData.depositDueDate || '') || '[DATA ENTRADA]')
    .replace(/{remainingValue}/g, formatCurrency(formData.remainingValue || '') || '[VALOR RESTANTE]')
    .replace(/{remainingDueDate}/g, formatDate(formData.remainingDueDate || '') || '[DATA RESTANTE]')
    .replace(/{paymentMethod}/g, formData.paymentMethod || '[FORMA DE PAGAMENTO]')
    .replace(/{cautionValue}/g, formatCurrency(formData.cautionValue || '') || '[VALOR DO CAUÇÃO]')
    .replace(/{observations}/g, formData.observations || '')
}

// ─── Cláusulas padrão (Rancho Aveiro e outros espaços) ───────────────────────

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

// ─── Cláusulas específicas do Rancho Aveiro ──────────────────────────────────

export const RANCHO_AVEIRO_CLAUSES: Omit<ContractClause, 'edited'>[] = [
  {
    id: 'partes',
    number: 'PREÂMBULO',
    title: 'QUALIFICAÇÃO DAS PARTES',
    content:
      '{ownerName}, brasileiro, empresário, portador do CPF nº {ownerCPF} e do CNPJ nº {ownerCNPJ}, neste ato denominado LOCADOR, tem justo e contratado com {clientQualification}, contato: {clientPhone}, E-Mail: {clientEmail}, aqui denominado(a) LOCATÁRIO, a locação das dependências da chácara "{spaceName}", sito à {spaceFullAddress}, compreendendo, a presente locação: um hall de entrada, salão com capacidade máxima para 300 pessoas, varanda, escada, sala de suporte, cozinha, área coberta para churrasqueira, uma câmara fria, geladeiras, freezer, fogões, banheiros masculino e feminino, estacionamento para 120 veículos, área coberta para embarque e desembarque e jardim. O presente contrato de locação será regido pelas leis vigentes e mediante as cláusulas e condições abaixo, as quais as partes contratantes se obrigam mutuamente.',
  },
  {
    id: 'primeira',
    number: 'PRIMEIRA',
    title: 'DO PRAZO DA LOCAÇÃO',
    content:
      'O prazo previsto para a locação à partir {eventStartTime} do dia {eventDate} à {eventEndTime} do dia {eventCheckoutDate}, com tolerância máxima e improrrogável de 15 (quinze) minutos. A partir desse horário o LOCATÁRIO compromete-se a pagar a diferença do preço de R$ 1.000,00 (mil reais) por hora de atraso, cessando de pleno direito, depois de completas 03 (três) horas adicionais, independentes de notificação ou aviso, devendo o LOCATÁRIO entregar ao LOCADOR o imóvel desta locação, completamente desocupado e nas condições que o recebeu. O locatário ou profissionais contratados poderão adentrar no salão somente na data e horário estipulado acima e deverão retirar todo o material usado após o término do evento, no prazo máximo de duas horas (objetos de decoração, utensílios de cozinha, tendas e outros). No caso da não retirada no prazo estipulado será cobrada uma multa diária de R$ 1.000,00.\n\nParágrafo primeiro: O prazo previsto no caput poderá ser alterado, no prazo de 07 (sete) dias, a contar da assinatura do presente contrato, desde que, em comum acordo entre as partes; para data disponível e ainda não contratada com outrem pelo locador; porém, referida alteração não poderá ultrapassar 90 (noventa) dias da data originalmente contratada, sob pena de ser considerado desistente e não cumprido o contrato por parte do locatário.\n\nParágrafo segundo: Alteração do prazo previsto no caput que ultrapasse 90 (noventa) dias caberá ao LOCADOR, se assim lhe convier, alterar a data originalmente contratada para data disponível, ainda não contratada com outrem pelo locador e com a anuência do LOCATÁRIO, incidindo correção no valor da locação pelo Índice Geral de Preços ao Mercado (IGP-M), usando como base o acumulado da quantidade de meses da referida alteração e com percentual não inferior a 10% (dez por cento).',
  },
  {
    id: 'segunda',
    number: 'SEGUNDA',
    title: 'DO VALOR E FORMA DE PAGAMENTO',
    content:
      'O LOCATÁRIO se compromete a pagar ao LOCADOR um aluguel pelo período acima no valor de: {totalValue}. Que serão pagos da seguinte forma: Entrada/sinal de {depositValue}, com vencimento inicial em {depositDueDate}, e saldo remanescente de {remainingValue}, com vencimento em {remainingDueDate}.\n\nForma de pagamento: {paymentMethod}\n\nConta corrente no banco {bankName} ({bankCode}) — agência {bankAgency} — C/C {bankAccount}\nNome: {bankHolder}. CPF: {bankHolderDoc} (Pix)\n\nOs comprovantes deverão ser enviados com identificação (data do evento) no e-mail: {ownerEmail}.\n\nParágrafo primeiro: Se o LOCATÁRIO desistir da locação ou não for possível acordar a alteração prevista no parágrafo único da cláusula primeira, o valor pago como sinal será retido pelo LOCADOR. E caso já tenha sido paga a totalidade do valor da locação, metade será devolvida ao LOCATÁRIO se a desistência se der até 90 (noventa) dias antes da data da locação; se depois deste prazo, a devolução será pela quarta parte.\n\nParágrafo segundo: Fica acordado entre as partes que caso não seja possível a utilização do imóvel locado na data estabelecida na cláusula primeira, por motivo imputável ao LOCADOR, o LOCADOR fará a devolução do valor pago pelo LOCATÁRIO estabelecido no caput desta cláusula.\n\nParágrafo terceiro: É permitido ao LOCATÁRIO, ou preposto seu com procuração e firma reconhecida, desde a véspera até duas horas antes do início da locação, vistoriar o imóvel, para efeitos do parágrafo anterior e cláusula terceira.',
  },
  {
    id: 'terceira',
    number: 'TERCEIRA',
    title: 'DA CONSERVAÇÃO DO IMÓVEL',
    content:
      'Recebendo as dependências do imóvel em perfeitas condições de serem ocupadas, na mais perfeita ordem, torneiras, pias, lâmpadas e demais acessórios, instalações elétricas e hidráulicas, acessórios, equipamentos, utensílios, jardim e plantas, obriga-se o LOCATÁRIO a manter tudo como recebe e a sua própria custa, de forma a restituir tudo na mais perfeita ordem e no mesmo estado de conservação e perfeito funcionamento, quando findo ou rescindido o presente contrato, de modo que possa ser imediatamente utilizado, sem que isso dependa de qualquer conserto, reparo ou pintura.\n\nNo caso de exceder a capacidade máxima de 300 pessoas, será cobrado o valor de R$ 50,00 por cada pessoa excedente.',
  },
  {
    id: 'quarta',
    number: 'QUARTA',
    title: 'DA CIRCULAÇÃO NAS ADJACÊNCIAS',
    content:
      'É expressamente proibida a circulação de pessoas e veículos nas ruas, alamedas, caminhos e adjacências do imóvel objeto desta locação, exceto o trajeto da portaria ao imóvel e vice-versa.',
  },
  {
    id: 'quinta',
    number: 'QUINTA',
    title: 'DA VEDAÇÃO À TRANSFERÊNCIA',
    content:
      'Não é permitida a transferência deste contrato, no todo ou em parte, nem a sublocação ou empréstimo do imóvel locado, sem o prévio consentimento por escrito do LOCADOR, mesmo que a transferência, a sublocação e/ou o empréstimo parcial sejam para firmas oriundas de alterações contratuais, bem como sociedade formada pelo LOCATÁRIO e terceiros.',
  },
  {
    id: 'sexta',
    number: 'SEXTA',
    title: 'DA DESTINAÇÃO DO IMÓVEL',
    content:
      'O LOCATÁRIO não poderá destinar o imóvel deste contrato para fins comerciais, não podendo em hipótese alguma alterar sua destinação sem prévio consentimento por escrito do LOCADOR. O não cumprimento desta obrigação implicará na rescisão contratual.',
  },
  {
    id: 'setima',
    number: 'SÉTIMA',
    title: 'DA RESCISÃO E DA MULTA',
    content:
      'Ocorrerá também a rescisão do presente contrato se o LOCATÁRIO infringir obrigação legal ou cometer infração a qualquer cláusula deste instrumento, sujeitando-se cumulativa ou alternativamente à multa equivalente ao valor de uma locação, sem prejuízo da exigência de valores por eventuais perdas e danos.',
  },
  {
    id: 'oitava',
    number: 'OITAVA',
    title: 'DAS RESPONSABILIDADES DO LOCATÁRIO',
    content:
      'Fica o LOCATÁRIO responsável por atos e fatos próprios, de seus prepostos, fornecedores, visitantes, convidados e demais pessoas a que permitir ou não impedir de adentrar ou permanecer no imóvel, respondendo administrativa ou judicialmente, ficando o LOCADOR livre de qualquer responsabilidade de natureza civil ou criminal, durante o período que durar a locação. Autoriza, desde já, o LOCATÁRIO, até a apuração de eventual responsabilização, a dedução pelo LOCADOR da quantia necessária.\n\nParágrafo único: Também é responsável o LOCATÁRIO pela adequação do uso às normas legais vigentes, bem como pelos danos e riscos da utilização do imóvel, devendo observar a compatibilidade das instalações com o número de pessoas, capacidade elétrica e equipamentos que serão utilizados, equipamentos de segurança e emergência, desobstrução de acessos e saídas e demais cuidados relativos às condições peculiares do evento que realizar, ficando autorizado, desde a assinatura do presente instrumento, realizar vistoria prévia.',
  },
  {
    id: 'nona',
    number: 'NONA',
    title: 'DO USO DE SOM E DIREITOS AUTORAIS',
    content:
      'O LOCATÁRIO compromete-se, no caso de uso de aparelho de som, a observar a legislação pertinente e manter o mesmo em um nível que não incomode os vizinhos, para que seja mantida uma harmonia entre os moradores das chácaras vizinhas. É proibido o uso do gramado para pista de dança, palco e DJ, ao menos que seja colocado algum tipo de proteção que não machuque o gramado.\n\nParágrafo único: É de total responsabilidade do LOCATÁRIO, no uso do imóvel, a observância da legislação em vigor, seja ela federal, estadual ou municipal e, dentre todas, fica aqui advertido, em especial, o disposto na Lei 9.610/98, que cuida da proteção aos direitos autorais, à qual o LOCATÁRIO declara estar ciente e concorda, sendo o caso, em recolher eventuais valores que lhes sejam devidos pela utilização de obras teatrais, composições musicais ou lítero-musicais e fonogramas, em representações e execuções públicas.',
  },
  {
    id: 'decima',
    number: 'DÉCIMA',
    title: 'DAS PROIBIÇÕES E MULTA',
    content:
      'É expressamente proibido: o uso de ski paper (chuva de papel picado) e qualquer outro tipo de papel, sendo laminado ou não; queima de fogos de artifício ou indoor, com barulho ou não, em qualquer local das dependências do Rancho Aveiro (sob penas da lei).\n\nParágrafo único: No caso de descumprimento será gerada multa no valor de R$ 5.000,00 (cinco mil reais).',
  },
  {
    id: 'decima-primeira',
    number: 'DÉCIMA PRIMEIRA',
    title: 'DOS ITENS INCLUSOS E SERVIÇOS NÃO INCLUSOS',
    content:
      'Findo o prazo convencionado, a renovação não será automática, sendo necessária para tanto a assinatura de novo contrato, sem prejuízo do previsto na cláusula primeira quanto à multa por atraso, bem como a extensão de todas as responsabilidades do LOCATÁRIO previstas neste contrato.\n\nEstão incluídos na locação:\n1. Estacionamento para 120 veículos.\n2. Hall de entrada.\n3. Salão para 300 pessoas.\n4. Varanda coberta com fechamento de toldos.\n5. Pergolado.\n6. Conjunto de bancos de madeira para lounge (2 bancos de um lugar e 1 banco de dois lugares).\n7. Banheiros masculinos com papel higiênico, sabonete líquido e papel toalha.\n8. Banheiros femininos com papel higiênico, sabonete líquido e papel toalha.\n9. Sala de suporte.\n10. Cozinha com pias, dois fogões industriais, forno e gás encanado.\n11. Área externa coberta com churrasqueira, pias, geladeiras, câmara fria e freezer.\n12. Banheiro externo com chuveiro.\n13. Limpeza pré e pós evento.\n14. Iluminação do jardim.\n15. Auxiliar de estacionamento.\n16. Bancos para cerimônia, quantidade de 0 (zero).\n17. Mesas redondas de 1,45 cm, quantidade de 38 (trinta e oito).\n18. Cadeiras almofadadas de rattan, quantidade de 280 (duzentos e oitenta).\n\nParágrafo primeiro: O presente contrato de locação de imóvel não contempla nenhum tipo de prestação de serviço; ficando a cargo e total responsabilidade do LOCATÁRIO a eventual contratação dos serviços que entender necessários, tipo: recepcionistas, manobristas, segurança, vigilância ou qualquer outro.',
  },
  {
    id: 'decima-segunda',
    number: 'DÉCIMA SEGUNDA',
    title: 'DA RESPONSABILIDADE SANITÁRIA E CUMPRIMENTO DE DECRETOS',
    content:
      'É de responsabilidade integral do LOCATÁRIO e de seus profissionais contratados respeitar e cumprir os requisitos de acordo com os decretos estaduais e municipais vigentes, seguindo rigorosamente as medidas preventivas e o protocolo de distanciamento e limitação de capacidade, as regras de uso de EPIs, álcool em gel, máscaras e todos os equipamentos e procedimentos necessários para a proteção dentro das dependências da chácara "{spaceName}".\n\nParágrafo único: O LOCATÁRIO, neste ato, isenta o LOCADOR de quaisquer responsabilidades e obrigações relacionadas ao cumprimento dos requisitos de acordo com os decretos estaduais e municipais vigentes e demais obrigações legais, além de responsabilizar-se também por qualquer demanda administrativa e/ou judicial proveniente do não cumprimento do disposto no caput.',
  },
  {
    id: 'decima-terceira',
    number: 'DÉCIMA TERCEIRA',
    title: 'DOS CASOS FORTUITOS E FORÇA MAIOR',
    content:
      'Os casos fortuitos ou motivos de força maior serão excludentes de responsabilidade, na forma do parágrafo único do artigo 393 do Código Civil Brasileiro.\n\nParágrafo primeiro: A parte que for afetada ("PARTE AFETADA") por caso fortuito ou motivo de força maior deverá notificar a outra, de imediato, da extensão do fato e do prazo estimado durante o qual estará inabilitada a cumprir, ou pelo qual será obrigada a atrasar o cumprimento de suas obrigações decorrentes deste contrato.\n\nParágrafo segundo: Cessados os efeitos de caso fortuito ou motivo de força maior, a PARTE AFETADA deverá, de imediato, notificar a outra para conhecimento deste fato, restabelecendo a situação imediatamente anterior à ocorrência do caso fortuito ou do motivo de força maior, no menor tempo possível.\n\nParágrafo terceiro: Se a ocorrência de caso fortuito ou motivo de força maior prejudicar apenas parcialmente a execução das obrigações oriundas deste contrato por uma das partes, a PARTE AFETADA deverá cumprir as obrigações que não tiverem sido afetadas pela ocorrência.\n\nParágrafo quarto: Na ocorrência das hipóteses de caso fortuito ou força maior, inclusive quando haja situação extrema que demande providências e determinações de órgãos públicos e autoridades governamentais, que impeçam e/ou inviabilizem a realização do evento ora programado, o LOCADOR poderá ajustar a realização do evento em outra data, que deverá ser previamente estabelecida entre as partes em comum acordo, a partir da cessação dos efeitos de caso fortuito ou força maior ou do impeditivo, em prazo que não poderá ser superior a 12 (doze) meses.\n\nParágrafo quinto: Ocorrendo o reagendamento da data para a realização do evento, conforme acima disposto, o pagamento do saldo remanescente da remuneração acordada nos termos deste instrumento, se houver, ficará condicionado à realização do evento na nova data, sem a incidência de qualquer acréscimo, correção e/ou penalidade.\n\nParágrafo sexto: Não poderão ser considerados eventos de força maior ou caso fortuito: (i) greves promovidas pelos contratados do LOCATÁRIO, de suas subcontratadas ou de terceiros trabalhando sob sua responsabilidade ou supervisão; (ii) interrupções ou anormalidades no tráfego de veículos; (iii) condições climáticas e meteorológicas que possam ser consideradas dentro da normalidade para a época e local do evento.\n\nE por estarem de comum acordo, assinam o presente contrato em 02 (duas) vias de igual teor e forma, na presença das testemunhas abaixo, elegendo o foro da comarca de {city}-{state} para dirimir todas e quaisquer questões oriundas deste instrumento, com renúncia de qualquer outro, por mais privilegiado que seja.',
  },
]

// ─── Cláusulas específicas da Estância Aveiro ────────────────────────────────

export const ESTANCIA_AVEIRO_CLAUSES: Omit<ContractClause, 'edited'>[] = [
  {
    id: 'partes',
    number: 'PREÂMBULO',
    title: 'IDENTIFICAÇÃO DAS PARTES',
    content:
      'Pelo presente instrumento de contrato particular de locação de espaço de lazer, que fazem entre si, por um lado, {clientQualification}, Contato: {clientPhone}, E-mail: {clientEmail}, doravante denominado(a) simplesmente de LOCATÁRIO, e por outro {ownerName}, RG nº {ownerRG} e CPF nº {ownerCPF}, residente e domiciliado à {ownerAddress}, doravante denominado(a) simplesmente de LOCADOR, os quais têm por justo e acordado o que segue:',
  },
  {
    id: 'objeto',
    number: 'PRIMEIRA',
    title: 'DO OBJETO',
    content:
      'O presente contrato tem por objeto a locação de uma chácara de lazer, situada na {spaceFullAddress}. Com direito a escolha de um dos nossos pacotes ({packageType}):\n\n({packageSimpleMark}) Pacote Simples: Cozinha externa equipada com cervejeira, geladeiras, fogão a gás, com gás incluso, churrasqueira, fogão a lenha, forno e ilha com pia. Dois banheiros com chuveiros sendo um para cadeirantes/feminino, e outro masculino (não incluso papel higiênico, sabonetes e papel toalha). O espaço disponibiliza também 13 (treze) mesas e 50 (cinquenta) cadeiras de madeira, guarda-sol para uso na piscina, campo de futebol e estacionamento.\n\n({packageCompleteMark}) Pacote Completo: Inclui todos os itens do pacote simples mais: Casa mobiliada com 3 (Três) salas, sendo uma com mesa de sinuca com 4 (Quatro) tacos, 3 (Três) quartos sendo uma suíte, 2 (Duas) cozinhas, uma copa e uma varanda fechada, 1 (Um) banheiro. A casa possui 23 (vinte e três) acomodações para dormir, sendo 8 (oito) colchões de casal e 7 (sete) de solteiro. A casa disponibiliza também mesas, cadeiras, poltronas, sofás, guarda-roupas, criado mudo, entre outros.\n\n*Chácara possui espaço para no máximo 150 pessoas*\n\nProibido: Tráfego nas propriedades vizinhas à chácara. Trafegar ou estacionar sobre a grama. Objetos cortantes, pontiagudos, copos, latas ou garrafas na região da piscina.\n\nParágrafo Único: O LOCATÁRIO deverá receber do LOCADOR, ao entrar no imóvel, um CHECK LIST com o inventário de todos os seus pertences da chácara, em caso do imóvel ser mobiliado, para que juntos possam conferir todos os bens do imóvel. Estando o LOCATÁRIO de acordo assinará este CHECK LIST em duas vias, responsabilizando-se totalmente por quaisquer danos que venha porventura a ocorrer no imóvel e seus pertences.',
  },
  {
    id: 'periodo',
    number: 'SEGUNDA',
    title: 'DO PERÍODO',
    content:
      'O presente contrato tem por finalidade acertar entre as partes a locação da {spaceName} para o dia {eventDate}, número total de {dailyCount} diárias. Número total de pessoas de {guestCount}, horário de entrada às {eventStartTime} e horário de saída às {eventEndTime} do dia {eventCheckoutDate}.',
  },
  {
    id: 'aluguel',
    number: 'TERCEIRA',
    title: 'DO ALUGUEL',
    content:
      'O valor do aluguel a ser pago como remuneração pelo uso do pacote escolhido na Cláusula Primeira, fica estipulado no valor de: {totalValue}, que será pago da seguinte forma:\n\nEntrada/Sinal: {depositValue} com vencimento em {depositDueDate}.\nValor Restante: {remainingValue} com vencimento em {remainingDueDate}.\n\n{observations}',
  },
  {
    id: 'pagamento',
    number: 'QUARTA',
    title: 'DO PAGAMENTO',
    content:
      'O Locatário efetuará o pagamento das seguintes formas:\n\n50% do valor na assinatura do contrato a título de reserva, os outros 50% 10 (dez) dias antes de entrar na chácara.\n\nForma de pagamento: {paymentMethod}\n\nÀ vista: Transferência bancária, Depósito em conta, Pix ou Dinheiro.\n\nDados bancários:\nBanco {bankName} ({bankCode}) — Agência: {bankAgency} — C/C: {bankAccount}\nNome: {bankHolder} — CPF: {bankHolderDoc} (Pix: chave CPF)\n\nOu pessoalmente em dinheiro na Chácara {spaceName}.\n\nParágrafo Único: Se o Locatário desistir da locação ou não for possível acordar a alteração prevista neste contrato, o valor pago como sinal será retido pelo locador. E caso já tenha sido paga a totalidade do valor da locação, metade será devolvida ao locatário se a desistência se der até 90 (noventa) dias antes da data da locação.',
  },
  {
    id: 'caucao',
    number: 'QUINTA',
    title: 'DO CHEQUE CAUÇÃO',
    content:
      'O LOCATÁRIO deixará com o LOCADOR (ou seu representante), no momento do recebimento das chaves do imóvel, um cheque caução de {cautionValue}, para a cobertura de eventuais prejuízos causados pelo LOCATÁRIO no imóvel ou aos seus pertences, e/ou alguma infração contratual cometida. Este cheque será emitido em nome do LOCADOR, o mesmo será devolvido ao LOCATÁRIO após a conferência do CHECK LIST, se não ocorrer qualquer dano ao imóvel ou aos seus pertences. Se houver algum dano ao imóvel ou seus pertences, o cheque somente será devolvido após a quitação dos prejuízos. Em caso de ausência do cheque, será emitido um boleto em nome do LOCADOR com o valor dos prejuízos causados ao LOCATÁRIO.',
  },
  {
    id: 'local',
    number: 'SEXTA',
    title: 'DO LOCAL',
    content:
      'O LOCADOR se obriga a liberar o local para o uso do LOCATÁRIO, no período estipulado na Cláusula Segunda, incluindo-se aí os equipamentos do pacote escolhido e delimitações citados na Cláusula Primeira.',
  },
  {
    id: 'responsabilidades',
    number: 'SÉTIMA',
    title: 'DAS RESPONSABILIDADES',
    content:
      'Fica, desde já, acordado que toda a responsabilidade sobre as pessoas que irão frequentar o local, é do LOCATÁRIO, tanto no que se refere a eventuais danos causados por estes ao local ou a seus equipamentos, quanto a eventuais acidentes.\n\nParágrafo Único: Assume ainda, o LOCATÁRIO, toda a responsabilidade com relação à guarda e assistência de menores desacompanhados dos pais, bem como quaisquer problemas com relação a estes ou ainda aos maiores. Isto devido a abranger, o presente contrato, somente a locação do espaço objeto da Cláusula Primeira.',
  },
  {
    id: 'uso',
    number: 'OITAVA',
    title: 'DO USO',
    content:
      'O LOCATÁRIO se compromete a utilizar o local, como área de lazer, de maneira a não causar transtornos ou danos ao meio ambiente, fauna, animais e aos moradores da região, comprometendo-se ainda a entregar o local devidamente limpo tal qual seu estado inicial.',
  },
  {
    id: 'piscina',
    number: 'NONA',
    title: 'DA PISCINA',
    content:
      'É expressamente proibido entrar na piscina com copo de vidro, garrafas, latas e qualquer outra coisa que possa a vir a danificar a piscina. Sendo de responsabilidade do Locatário arcar com os custos de manutenção se danificar a piscina no período de locação.',
  },
  {
    id: 'energia_agua',
    number: 'DÉCIMA',
    title: 'DA ENERGIA ELÉTRICA E ÁGUA',
    content:
      'Se houver falta de fornecimento de água e/ou fornecimento de energia elétrica no imóvel locado durante o período de ocupação, por motivo que não tenha causa no sistema hidráulico ou no sistema elétrico do imóvel, não caberá ao LOCATÁRIO o direito de fazer reclamação, pedir ressarcimento ou indenização, de qualquer natureza, ao LOCADOR (ou seu representante), e sim aos órgãos responsáveis.',
  },
  {
    id: 'gas',
    number: 'DÉCIMA PRIMEIRA',
    title: 'DO BOTIJÃO DE GÁS',
    content:
      'Se por acaso o botijão de gás vier a acabar, o Locatário deverá comprar um novo botijão, sendo devolvido pelo locador o dinheiro pago pelo botijão em até 15 (quinze) dias após a saída da chácara.',
  },
  {
    id: 'toldos',
    number: 'DÉCIMA SEGUNDA',
    title: 'DOS TOLDOS',
    content:
      'Os toldos sempre que forem manuseados utilizarão duas pessoas. Em caso de chuva, baixá-los para não fazer bolsa de água.',
  },
  {
    id: 'foro',
    number: 'DO FORO',
    title: 'DO FORO',
    content:
      'Para dirimir quaisquer dúvidas e litígios provenientes do presente contrato, fica eleito o foro da comarca de {city} - {state}, por mais privilegiado que outros possam ser.\n\nE por se encontrarem certos, justos e contratados, assinam o presente contrato, as partes na presença de duas testemunhas, em duas vias de igual forma e teor para que surta seus efeitos legais, tendo inclusive valor de título executivo extrajudicial.',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getDefaultClauseTemplates(spaceId?: string): Omit<ContractClause, 'edited'>[] {
  if (spaceId === 'rancho-aveiro') return RANCHO_AVEIRO_CLAUSES
  if (spaceId === 'estancia-aveiro') return ESTANCIA_AVEIRO_CLAUSES
  return DEFAULT_CLAUSES
}

export function getInitialClauses(spaceId?: string): ContractClause[] {
  return getDefaultClauseTemplates(spaceId).map((clause) => ({ ...clause, edited: false }))
}
