import { describe, expect, it } from 'vitest'
import type { EventoBase } from '../types'
import { marcadorDoAgora, progressoNoEvento } from './trilha'

function evento(id: string, inicio: string, fim: string): EventoBase {
  return { id, nome: id, categoria: 'trabalho', inicio, fim, deslocamento: 0 }
}

/** O dia da demonstração, simplificado: manhã, tarde e noite com vãos. */
const DIA = [
  evento('academia', '07:00', '08:00'),
  evento('trabalho', '09:00', '18:00'),
  evento('faculdade', '19:30', '22:30'),
]

describe('marcadorDoAgora', () => {
  it('põe o marcador dentro do evento em curso', () => {
    expect(marcadorDoAgora(DIA, 10 * 60)).toEqual({ tipo: 'durante', indice: 1 })
  })

  it('trata o início como parte do evento', () => {
    expect(marcadorDoAgora(DIA, 9 * 60)).toEqual({ tipo: 'durante', indice: 1 })
  })

  it('trata o fim como já fora: às 18:00 o trabalho acabou', () => {
    expect(marcadorDoAgora(DIA, 18 * 60)).toEqual({ tipo: 'entre', indice: 2 })
  })

  it('num vão, aponta para o próximo evento', () => {
    expect(marcadorDoAgora(DIA, 8 * 60 + 30)).toEqual({ tipo: 'entre', indice: 1 })
  })

  it('antes de tudo, aponta para o primeiro evento', () => {
    expect(marcadorDoAgora(DIA, 6 * 60)).toEqual({ tipo: 'entre', indice: 0 })
  })

  it('depois de tudo, aponta para o fim da lista', () => {
    expect(marcadorDoAgora(DIA, 23 * 60)).toEqual({ tipo: 'entre', indice: 3 })
  })

  it('num dia vazio, aponta para o fim da lista vazia', () => {
    expect(marcadorDoAgora([], 12 * 60)).toEqual({ tipo: 'entre', indice: 0 })
  })

  // O formulário avisa sobre sobreposição mas não proíbe. O marcador precisa
  // escolher um, e escolhe o que começou mais cedo.
  it('com eventos sobrepostos, fica no que começou primeiro', () => {
    const sobrepostos = [evento('longo', '09:00', '12:00'), evento('curto', '10:00', '11:00')]
    expect(marcadorDoAgora(sobrepostos, 10 * 60 + 30)).toEqual({
      tipo: 'durante',
      indice: 0,
    })
  })

  it('evento de duração zero nunca está em curso', () => {
    const instante = [evento('instante', '09:00', '09:00')]
    expect(marcadorDoAgora(instante, 9 * 60)).toEqual({ tipo: 'entre', indice: 1 })
  })
})

describe('progressoNoEvento', () => {
  it('devolve a fração já decorrida', () => {
    expect(progressoNoEvento(evento('a', '10:00', '12:00'), 11 * 60)).toBe(0.5)
  })

  it('devolve 0 no início e 1 no fim', () => {
    const e = evento('a', '10:00', '12:00')
    expect(progressoNoEvento(e, 10 * 60)).toBe(0)
    expect(progressoNoEvento(e, 12 * 60)).toBe(1)
  })

  it('não escapa de 0..1 fora do evento', () => {
    const e = evento('a', '10:00', '12:00')
    expect(progressoNoEvento(e, 8 * 60)).toBe(0)
    expect(progressoNoEvento(e, 20 * 60)).toBe(1)
  })

  it('não divide por zero em evento instantâneo', () => {
    expect(progressoNoEvento(evento('a', '09:00', '09:00'), 9 * 60)).toBe(0)
  })
})
