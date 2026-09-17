/**
 * Rota serverless de clima.
 *
 * Existe por um motivo só: a chave da OpenWeather não pode ir para o
 * navegador. Qualquer `fetch` direto do cliente publicaria a chave no bundle,
 * onde qualquer pessoa a lê com o inspetor aberto. Aqui ela fica em
 * `process.env`, na Vercel, e nunca cruza a rede em direção ao usuário.
 *
 * A rota também normaliza antes de responder, então o cliente nunca vê o
 * formato da OpenWeather. Trocar de provedor de clima é reescrever este
 * arquivo — nenhuma tela muda.
 */

import { normalizarPrevisao, type RespostaOpenWeather } from '../src/services/openweather'

/** Meia hora: a previsão da OpenWeather não muda de minuto em minuto. */
const CACHE_EM_SEGUNDOS = 30 * 60

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/

/**
 * O mínimo da assinatura da Vercel que usamos, escrito à mão para não
 * carregar `@vercel/node` só por dois tipos.
 */
interface Requisicao {
  query: Record<string, string | string[] | undefined>
}

interface Resposta {
  status(codigo: number): Resposta
  json(corpo: unknown): void
  setHeader(nome: string, valor: string): void
}

export default async function handler(req: Requisicao, res: Resposta) {
  const lat = primeiro(req.query.lat)
  const lon = primeiro(req.query.lon)
  const data = primeiro(req.query.data)

  // Os parâmetros entram numa URL, então são validados antes de serem usados:
  // sem isto, `lat` seria um ponto de injeção na query da OpenWeather.
  if (!ehCoordenada(lat) || !ehCoordenada(lon) || !FORMATO_DATA.test(data)) {
    res.status(400).json({ erro: 'Informe lat, lon e data no formato AAAA-MM-DD.' })
    return
  }

  const chave = process.env.OPENWEATHER_KEY
  if (!chave) {
    // 503 e não 500: o serviço está indisponível por configuração, e o cliente
    // trata isso como "sem contexto de clima" em vez de erro do usuário.
    res.status(503).json({ erro: 'Clima indisponível: a chave não está configurada.' })
    return
  }

  const url =
    `https://api.openweathermap.org/data/2.5/forecast` +
    `?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}` +
    `&units=metric&lang=pt_br&appid=${encodeURIComponent(chave)}`

  try {
    const resposta = await fetch(url)
    if (!resposta.ok) {
      res.status(502).json({ erro: 'O serviço de clima não respondeu.' })
      return
    }

    const previsao = normalizarPrevisao((await resposta.json()) as RespostaOpenWeather, data)
    if (!previsao) {
      // Dia fora do alcance da API. Não é erro: é ausência de informação.
      res.status(404).json({ erro: 'Sem previsão para esse dia.' })
      return
    }

    res.setHeader('Cache-Control', `public, s-maxage=${CACHE_EM_SEGUNDOS}`)
    res.status(200).json(previsao)
  } catch {
    res.status(502).json({ erro: 'O serviço de clima não respondeu.' })
  }
}

function primeiro(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? ''
}

function ehCoordenada(valor: string): boolean {
  return valor !== '' && Number.isFinite(Number(valor))
}
