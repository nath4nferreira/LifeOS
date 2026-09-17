import { useEffect, useState } from 'react'
import type { Previsao } from '../types'
import { buscarPrevisao } from '../services/clima'

export type EstadoDoClima = 'carregando' | 'pronto' | 'indisponivel'

interface ResultadoDaPrevisao {
  previsao: Previsao | null
  estado: EstadoDoClima
}

/**
 * A previsão do dia que está na tela.
 *
 * Nunca lança e nunca deixa o app pendurado: o pior caso é `indisponivel`, que
 * a faixa de status mostra e o motor trata como ausência de contexto. As
 * regras 3 e 4 somem, as outras cinco continuam — é o que a degradação
 * graciosa significa aqui.
 *
 * Trocar de dia cancela a busca anterior. Sem isso, duas respostas fora de
 * ordem fariam a previsão de ontem sobrescrever a de hoje na tela.
 */
export function usePrevisao(data: string): ResultadoDaPrevisao {
  // A resposta carrega o dia a que pertence. É isso que permite derivar
  // "carregando" em vez de escrevê-lo no efeito: enquanto a resposta guardada
  // for de outro dia, ainda não sabemos o clima deste.
  const [resposta, setResposta] = useState<{
    data: string
    previsao: Previsao | null
  } | null>(null)

  useEffect(() => {
    const controle = new AbortController()

    void buscarPrevisao(data, controle.signal).then((previsao) => {
      if (controle.signal.aborted) return
      setResposta({ data, previsao })
    })

    return () => controle.abort()
  }, [data])

  if (resposta?.data !== data) return { previsao: null, estado: 'carregando' }
  return {
    previsao: resposta.previsao,
    estado: resposta.previsao ? 'pronto' : 'indisponivel',
  }
}
