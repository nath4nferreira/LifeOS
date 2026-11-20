import type { Evento, EventoBase, Insight, Previsao } from '../types'
import {
  gerarInsights,
  insightsDeTransicao,
  resumoDoDia,
  vereditoDoDia,
} from './insights'
import { eventosDoDia } from './seletor'
import { somarDias } from '../utils/tempo'

export interface VisaoDoDia {
  eventos: EventoBase[]
  dataSeguinte: string
  insights: Insight[]
  insightsDeTransicao: Insight[]
  comprometido: number
  emAberto: number
  veredito: string
}

/** Compõe as regras do dia em dados prontos para a interface. */
export function criarVisaoDoDia(
  eventos: Evento[],
  data: string,
  previsao: Previsao | null,
): VisaoDoDia {
  const eventosDoDiaSelecionado = eventosDoDia(eventos, data)
  const dataSeguinte = somarDias(data, 1)
  const insights = gerarInsights(eventosDoDiaSelecionado, previsao)
  const { comprometido, emAberto } = resumoDoDia(eventosDoDiaSelecionado)

  return {
    eventos: eventosDoDiaSelecionado,
    dataSeguinte,
    insights,
    insightsDeTransicao: insightsDeTransicao(
      eventosDoDiaSelecionado,
      eventosDoDia(eventos, dataSeguinte),
    ),
    comprometido,
    emAberto,
    veredito: vereditoDoDia(insights, comprometido),
  }
}
