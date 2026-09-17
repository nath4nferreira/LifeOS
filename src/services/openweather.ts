/**
 * Tradução do formato da OpenWeather para o `Previsao` do LifeOS.
 *
 * Mora sozinho num arquivo sem `fetch` de propósito: é a única parte do clima
 * que é lógica pura, e é a única que precisa ser importada dos dois lados — a
 * rota serverless em `api/clima.ts` normaliza antes de responder, e o teste
 * aqui garante que o formato não escorregue.
 *
 * O plano gratuito da OpenWeather devolve faixas de 3 em 3 horas, não hora a
 * hora. Nada aqui inventa os horários intermediários: o motor sabe tratar cada
 * faixa como cobrindo 3h, e afirmar mais do que a API afirmou seria mentir num
 * produto cujo trunfo é justamente mostrar de onde veio cada número.
 */

import type { Previsao } from '../types'

/** O recorte do `/data/2.5/forecast` que realmente usamos. */
export interface RespostaOpenWeather {
  city?: { name?: string }
  list?: FaixaOpenWeather[]
}

interface FaixaOpenWeather {
  dt_txt?: string // "2026-09-17 19:00:00", em hora local da cidade
  main?: { temp?: number }
  weather?: { description?: string }[]
  pop?: number // probabilidade de precipitação, já de 0 a 1
}

const MEIO_DIA_EM_MINUTOS = 12 * 60

/**
 * As faixas da data pedida, normalizadas.
 *
 * Devolve `null` quando a data está fora do alcance da API (cerca de 5 dias) —
 * que é o mesmo `null` de "a API falhou". Para quem chama, não há diferença:
 * os dois casos significam "sem contexto de clima", e o app segue analisando
 * conflito, margem, carga e janela.
 */
export function normalizarPrevisao(
  bruto: RespostaOpenWeather,
  data: string,
): Previsao | null {
  const doDia = (bruto.list ?? []).filter((faixa) => ehDoDia(faixa, data))
  if (doDia.length === 0) return null

  // "Agora" não existe para um dia futuro, e a API só fala em faixas de 3h.
  // A faixa mais próxima do meio-dia é a leitura mais representativa do dia —
  // e continua sendo honesta para hoje, porque é a faixa, não o instante.
  const referencia = doDia.reduce((melhor, atual) =>
    distanciaDoMeioDia(atual) < distanciaDoMeioDia(melhor) ? atual : melhor,
  )

  return {
    local: bruto.city?.name ?? 'seu local',
    tempAtual: Math.round(referencia.main?.temp ?? 0),
    condicaoAtual: referencia.weather?.[0]?.description ?? 'sem descrição',
    horas: doDia.map((faixa) => ({
      // "2026-09-17 19:00:00" → "19:00"
      hora: horaDe(faixa),
      temp: Math.round(faixa.main?.temp ?? 0),
      // `pop` ausente significa que a API não previu chuva nenhuma.
      chuva: faixa.pop ?? 0,
    })),
  }
}

function ehDoDia(faixa: FaixaOpenWeather, data: string): boolean {
  return typeof faixa.dt_txt === 'string' && faixa.dt_txt.startsWith(`${data} `)
}

function horaDe(faixa: FaixaOpenWeather): string {
  return (faixa.dt_txt ?? '').slice(11, 16)
}

function distanciaDoMeioDia(faixa: FaixaOpenWeather): number {
  const [horas, minutos] = horaDe(faixa).split(':').map(Number)
  return Math.abs(horas * 60 + minutos - MEIO_DIA_EM_MINUTOS)
}
