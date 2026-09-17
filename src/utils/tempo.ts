/**
 * Conversão e formatação de horários e datas.
 *
 * RESTRIÇÃO DE PORTABILIDADE: este módulo é lógica pura. Não importa React,
 * não toca em DOM, `window`, `localStorage` nem `fetch`, e não lê o relógio
 * do sistema — quem sabe que horas são é a interface, que passa a data como
 * argumento. Os testes deste arquivo servem de especificação para um port
 * futuro em Dart.
 */

const MINUTOS_POR_HORA = 60
const MINUTOS_POR_DIA = 24 * MINUTOS_POR_HORA

const FORMATO_HORARIO = /^([01]\d|2[0-3]):([0-5]\d)$/
const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Nomes em pt-BR escritos à mão em vez de `Intl`: a saída de `Intl` muda
 * conforme o ICU do ambiente, o que quebraria os testes e a portabilidade.
 */
const DIAS_DA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MESES = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
]

function doisDigitos(n: number): string {
  return String(n).padStart(2, '0')
}

/** `true` se a string é um horário HH:MM de 24 horas. Usado na validação do formulário. */
export function horarioValido(horario: string): boolean {
  return FORMATO_HORARIO.test(horario)
}

/**
 * `true` se a string é uma data ISO AAAA-MM-DD que existe de fato.
 * O teste de ida e volta descarta casos como "2026-02-30".
 */
export function dataValida(data: string): boolean {
  if (!FORMATO_DATA.test(data)) return false
  const [ano, mes, dia] = data.split('-').map(Number)
  const d = new Date(Date.UTC(ano, mes - 1, dia))
  return (
    d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia
  )
}

/** "19:30" → 1170. Minutos desde a meia-noite. */
export function paraMinutos(horario: string): number {
  if (!horarioValido(horario)) {
    throw new Error(`Horário inválido: "${horario}". Esperado HH:MM.`)
  }
  const [horas, minutos] = horario.split(':').map(Number)
  return horas * MINUTOS_POR_HORA + minutos
}

/**
 * 1170 → "19:30". Minutos fora do dia dão a volta (1500 → "01:00"), o que
 * mantém a função total mesmo quando um cálculo atravessa a meia-noite.
 */
export function paraHorario(minutos: number): string {
  const doDia =
    ((Math.round(minutos) % MINUTOS_POR_DIA) + MINUTOS_POR_DIA) % MINUTOS_POR_DIA
  return `${doisDigitos(Math.floor(doDia / MINUTOS_POR_HORA))}:${doisDigitos(doDia % MINUTOS_POR_HORA)}`
}

/** Minutos entre dois horários do mesmo dia. Negativo se `fim` vier antes de `inicio`. */
export function duracao(inicio: string, fim: string): number {
  return paraMinutos(fim) - paraMinutos(inicio)
}

/** 45 → "45min", 180 → "3h", 90 → "1h30", -15 → "-15min". */
export function formatarDuracao(minutos: number): string {
  const total = Math.round(minutos)
  if (total < 0) return `-${formatarDuracao(-total)}`

  const horas = Math.floor(total / MINUTOS_POR_HORA)
  const resto = total % MINUTOS_POR_HORA
  if (horas === 0) return `${resto}min`
  if (resto === 0) return `${horas}h`
  return `${horas}h${doisDigitos(resto)}`
}

/**
 * Data ISO como `Date` em UTC.
 *
 * O UTC é intencional: `new Date("2026-09-17").getDay()` depende do fuso de
 * quem executa e pode devolver o dia anterior. Aqui o resultado é o mesmo em
 * qualquer máquina.
 */
function paraDataUTC(data: string): Date {
  if (!dataValida(data)) {
    throw new Error(`Data inválida: "${data}". Esperado AAAA-MM-DD.`)
  }
  const [ano, mes, dia] = data.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia))
}

/** Dia da semana de uma data ISO: 0=domingo … 6=sábado. */
export function diaDaSemana(data: string): number {
  return paraDataUTC(data).getUTCDay()
}

/** Soma (ou subtrai, com `dias` negativo) dias a uma data ISO. */
export function somarDias(data: string, dias: number): string {
  const d = paraDataUTC(data)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** "2026-09-17" → "qui 17 set". Formato da faixa de status. */
export function formatarDataCurta(data: string): string {
  const d = paraDataUTC(data)
  return `${DIAS_DA_SEMANA[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`
}

/**
 * Como a pessoa chamaria esse dia: "Hoje", "Amanhã", "Ontem" ou a data curta.
 *
 * Correspondência com o mundo real (heurística 2): ninguém diz "estou vendo
 * qui 17 set", diz "estou vendo hoje". Os três dias vizinhos ganham nome
 * porque são os únicos que se contam a partir de hoje sem pensar.
 */
export function rotuloDoDia(data: string, hoje: string): string {
  if (data === hoje) return 'Hoje'
  if (data === somarDias(hoje, 1)) return 'Amanhã'
  if (data === somarDias(hoje, -1)) return 'Ontem'
  return formatarDataCurta(data)
}
