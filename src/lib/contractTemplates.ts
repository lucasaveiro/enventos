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
  ownerRG: string
  ownerRole: string
  ownerAddress: string
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
    ownerRG: '14.471.121',
    ownerRole: 'Proprietário',
    ownerAddress: 'Estrada Municipal dos Aveiros, 530, Bairro Jardim Andorinhas, Campinas - SP, CEP: 13101-499',
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
    address: 'Estrada Rural, 456',
    city: 'Campinas',
    state: 'SP',
    ownerName: 'Edvaldo José Aveiro',
    ownerCPF: '068.786.648-02',
    ownerRG: '14.471.121',
    ownerRole: 'Proprietário',
    ownerAddress: 'Estrada Municipal dos Aveiros, 530, Bairro Jardim Andorinhas, Campinas - SP, CEP: 13101-499',
    spaceFullAddress: 'Estrada Rural, 456, Campinas - SP',
    color: '#9e6c14',
    bgColor: '#fef0d0',
    hoverBorderClass: 'hover:border-amber-700',
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
  const packageType = (formData.packageType || '').toLowerCase()
  const isSimplePackage = packageType === 'simples'
  const isCompletePackage = packageType === 'completo'

  return content
    .replace(/{spaceName}/g, space.displayName)
    .replace(/{spaceAddress}/g, space.address)
    .replace(/{spaceFullAddress}/g, space.spaceFullAddress)
    .replace(/{city}/g, space.city)
    .replace(/{state}/g, space.state)
    .replace(/{ownerName}/g, space.ownerName)
    .replace(/{ownerCPF}/g, space.ownerCPF)
    .replace(/{ownerRG}/g, space.ownerRG)
    .replace(/{ownerRole}/g, space.ownerRole)
    .replace(/{ownerAddress}/g, space.ownerAddress)
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

// ─── Cláusulas específicas da Estância Aveiro ────────────────────────────────

export const ESTANCIA_AVEIRO_CLAUSES: Omit<ContractClause, 'edited'>[] = [
  {
    id: 'partes',
    number: 'PREÂMBULO',
    title: 'IDENTIFICAÇÃO DAS PARTES',
    content:
      'Pelo presente instrumento de contrato particular de locação de espaço de lazer, que fazem entre si, por um lado, {clientName}, RG: {clientRG}, CPF: {clientCPF}, Contato: {clientPhone}, residente e domiciliado(a) à {clientAddress}, {clientCity} - {clientState}, E-mail: {clientEmail}, doravante denominado(a) simplesmente de LOCATÁRIO, e por outro {ownerName}, RG nº {ownerRG} e CPF nº {ownerCPF}, residente e domiciliado à {ownerAddress}, doravante denominado(a) simplesmente de LOCADOR, os quais têm por justo e acordado o que segue:',
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
      'O Locatário efetuará o pagamento das seguintes formas:\n\n50% do valor na assinatura do contrato a título de reserva, os outros 50% 10 (dez) dias antes de entrar na chácara.\n\nForma de pagamento: {paymentMethod}\n\nÀ vista: Transferência bancária, Depósito em conta, Pix ou Dinheiro.\n\nDados bancários:\nBanco Santander (033) — Agência: 0194 — C/C: 01003495-8\nNome: {ownerName} — CPF: {ownerCPF} (Pix: chave CPF)\n\nOu pessoalmente em dinheiro na Chácara {spaceName}.\n\nParágrafo Único: Se o Locatário desistir da locação ou não for possível acordar a alteração prevista neste contrato, o valor pago como sinal será retido pelo locador. E caso já tenha sido paga a totalidade do valor da locação, metade será devolvida ao locatário se a desistência se der até 90 (noventa) dias antes da data da locação.',
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
  if (spaceId === 'estancia-aveiro') return ESTANCIA_AVEIRO_CLAUSES
  return DEFAULT_CLAUSES
}

export function getInitialClauses(spaceId?: string): ContractClause[] {
  return getDefaultClauseTemplates(spaceId).map((clause) => ({ ...clause, edited: false }))
}
