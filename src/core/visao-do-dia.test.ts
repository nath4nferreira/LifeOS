import { describe, expect, it } from 'vitest'
import type { Evento } from '../types'
import { criarVisaoDoDia } from './visao-do-dia'

const DATA = '2026-09-17'

function evento(data: string, inicio: string, fim: string): Evento {
  return {
    tipo: 'pontual',
    id: `${data}-${inicio}`,
    nome: 'Compromisso',
    categoria: 'pessoal',
    data,
    inicio,
    fim,
    deslocamento: 0,
  }
}

describe('criarVisaoDoDia', () => {
  it('centraliza a seleção, o resumo e o veredito do dia', () => {
    const visao = criarVisaoDoDia(
      [evento(DATA, '09:00', '10:00'), evento('2026-09-18', '14:00', '15:00')],
      DATA,
      null,
    )

    expect(visao.eventos).toHaveLength(1)
    expect(visao.dataSeguinte).toBe('2026-09-18')
    expect(visao.comprometido).toBe(60)
    expect(visao.emAberto).toBe(0)
    expect(visao.veredito).toBe('Seu dia está tranquilo.')
  })

  it('inclui o insight de transição sem misturá-lo aos insights do dia', () => {
    const visao = criarVisaoDoDia(
      [evento(DATA, '20:00', '23:30'), evento('2026-09-18', '06:00', '07:00')],
      DATA,
      null,
    )

    expect(visao.insights).toEqual([])
    expect(visao.insightsDeTransicao.map((insight) => insight.tipo)).toEqual(['sono'])
  })
})
