// ── Valores por extenso (pt-BR) ────────────────────────────────────────────
// Usado em documentos com efeito jurídico (declaração de quitação), onde a
// praxe é escrever o valor em algarismos e por extenso, para evitar dúvida ou
// adulteração do número. Cobre até bilhões, que é mais do que o negócio precisa.

const UNIDADES = [
  '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete',
  'dezoito', 'dezenove',
]
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CENTENAS = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos',
  'setecentos', 'oitocentos', 'novecentos',
]
// [singular, plural] de cada grupo de três dígitos, do menor para o maior.
const ESCALAS: Array<[string, string]> = [
  ['', ''],
  ['mil', 'mil'],
  ['milhão', 'milhões'],
  ['bilhão', 'bilhões'],
]

/** 1..999 por extenso. */
function grupoPorExtenso(n: number): string {
  if (n === 100) return 'cem'
  const centena = Math.floor(n / 100)
  const resto = n % 100
  const partes: string[] = []
  if (centena) partes.push(CENTENAS[centena])
  if (resto) {
    if (resto < 20) {
      partes.push(UNIDADES[resto])
    } else {
      const dezena = Math.floor(resto / 10)
      const unidade = resto % 10
      partes.push(unidade ? `${DEZENAS[dezena]} e ${UNIDADES[unidade]}` : DEZENAS[dezena])
    }
  }
  return partes.join(' e ')
}

/** Inteiro não negativo por extenso ("mil duzentos e trinta e quatro"). */
export function inteiroPorExtenso(valor: number): string {
  let n = Math.floor(Math.abs(valor))
  if (n === 0) return 'zero'

  const grupos: number[] = []
  while (n > 0) {
    grupos.push(n % 1000)
    n = Math.floor(n / 1000)
  }

  const partes: Array<{ texto: string; grupo: number }> = []
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i]
    if (!g) continue
    let texto: string
    if (i === 0) texto = grupoPorExtenso(g)
    else if (i === 1 && g === 1) texto = 'mil' // "mil", nunca "um mil"
    else texto = `${grupoPorExtenso(g)} ${g === 1 ? ESCALAS[i][0] : ESCALAS[i][1]}`
    partes.push({ texto, grupo: g })
  }

  // Entre grupos usa-se vírgula; antes do último grupo usa-se "e" quando ele é
  // menor que cem ou uma centena exata ("dois mil e quinhentos", "um milhão e
  // dez"), e vírgula caso contrário ("dois mil, quinhentos e dez").
  let resultado = ''
  partes.forEach((parte, index) => {
    if (index === 0) {
      resultado = parte.texto
      return
    }
    const ultimo = index === partes.length - 1
    const liga = ultimo && (parte.grupo < 100 || parte.grupo % 100 === 0) ? ' e ' : ', '
    resultado += liga + parte.texto
  })
  return resultado
}

/** Valor em reais por extenso ("dois mil e quinhentos reais e dez centavos"). */
export function valorPorExtenso(valor: number): string {
  const totalCentavos = Math.round(Math.abs(valor) * 100)
  const reais = Math.floor(totalCentavos / 100)
  const centavos = totalCentavos % 100

  const partes: string[] = []
  if (reais > 0) {
    // "um milhão DE reais" quando o valor é um múltiplo exato de milhão.
    const milhaoExato = reais >= 1_000_000 && reais % 1_000_000 === 0
    partes.push(`${inteiroPorExtenso(reais)}${milhaoExato ? ' de' : ''} ${reais === 1 ? 'real' : 'reais'}`)
  }
  if (centavos > 0) {
    partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`)
  }
  if (partes.length === 0) return 'zero reais'
  return partes.join(' e ')
}
