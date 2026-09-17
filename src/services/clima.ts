/**
 * Cliente da rota de clima.
 *
 * Fala só com `/api/clima`, nunca com a OpenWeather: a chave mora no servidor
 * e o formato da API externa nunca chega aqui. Trocar de provedor de clima
 * não toca neste arquivo.
 */

import type { Previsao } from '../types'

/**
 * Coordenadas padrão: São Paulo.
 *
 * Não pedimos geolocalização. A permissão do navegador é um diálogo que
 * interrompe o primeiro uso para um dado que o produto usa como contexto
 * secundário — e um app de clima que abre pedindo permissão é exatamente a
 * fricção que o LifeOS existe para não ter. Deixar a localização configurável
 * é um passo natural depois do MVP.
 */
const LOCAL_PADRAO = { lat: -23.5505, lon: -46.6333 }

/**
 * A previsão de um dia, ou `null` quando não há.
 *
 * `null` é resposta legítima, não exceção: a API cobre uns 5 dias, pode falhar,
 * pode estar sem chave. Nos três casos o app segue funcionando — conflito,
 * margem, carga e janela não dependem de clima. Por isso esta função não
 * lança: quem chama não tem o que fazer com a diferença entre os motivos.
 */
export async function buscarPrevisao(
  data: string,
  sinal?: AbortSignal,
): Promise<Previsao | null> {
  const parametros = new URLSearchParams({
    lat: String(LOCAL_PADRAO.lat),
    lon: String(LOCAL_PADRAO.lon),
    data,
  })

  try {
    const resposta = await fetch(`/api/clima?${parametros}`, { signal: sinal })
    if (!resposta.ok) return null

    const corpo: unknown = await resposta.json()
    return ehPrevisao(corpo) ? corpo : null
  } catch {
    return null
  }
}

/**
 * O corpo chegou no formato esperado?
 *
 * Validar a resposta de um serviço externo não é paranoia: uma rota que
 * responde 200 com HTML de erro é um caso real, e sem esta checagem o app
 * renderizaria `undefined°` em vez de dizer honestamente que não sabe.
 */
function ehPrevisao(corpo: unknown): corpo is Previsao {
  if (typeof corpo !== 'object' || corpo === null) return false
  const candidato = corpo as Record<string, unknown>

  return (
    typeof candidato.local === 'string' &&
    typeof candidato.tempAtual === 'number' &&
    typeof candidato.condicaoAtual === 'string' &&
    Array.isArray(candidato.horas) &&
    candidato.horas.every(ehHora)
  )
}

function ehHora(valor: unknown): boolean {
  if (typeof valor !== 'object' || valor === null) return false
  const hora = valor as Record<string, unknown>
  return (
    typeof hora.hora === 'string' &&
    typeof hora.temp === 'number' &&
    typeof hora.chuva === 'number'
  )
}
