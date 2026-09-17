/**
 * Caso 9 da seção 8 do briefing: `eventosDoDia` respeita `excecoes`,
 * `validoDe`/`validoAte` e dia da semana.
 */

import { describe, expect, it } from 'vitest'
import type { EventoFixo, EventoPontual } from '../types'
import { eventosDoDia } from './seletor'

// 2026-09-17 é uma quinta-feira; 2026-09-19, um sábado.
const QUINTA = '2026-09-17'
const SEXTA = '2026-09-18'
const SABADO = '2026-09-19'

function pontual(props: {
  id?: string
  nome?: string
  data: string
  inicio: string
  fim: string
  deslocamento?: number
}): EventoPontual {
  return {
    tipo: 'pontual',
    id: props.id ?? `${props.nome ?? 'evento'}-${props.data}`,
    nome: props.nome ?? 'Compromisso',
    categoria: 'pessoal',
    inicio: props.inicio,
    fim: props.fim,
    deslocamento: props.deslocamento ?? 0,
    data: props.data,
  }
}

function fixo(props: {
  id?: string
  nome?: string
  inicio: string
  fim: string
  deslocamento?: number
  diasDaSemana: number[]
  validoDe?: string
  validoAte?: string
  excecoes?: string[]
}): EventoFixo {
  return {
    tipo: 'fixo',
    id: props.id ?? `${props.nome ?? 'fixo'}-${props.inicio}`,
    nome: props.nome ?? 'Aula',
    categoria: 'estudos',
    inicio: props.inicio,
    fim: props.fim,
    deslocamento: props.deslocamento ?? 0,
    diasDaSemana: props.diasDaSemana,
    validoDe: props.validoDe ?? '2026-08-01',
    validoAte: props.validoAte ?? '2026-12-15',
    excecoes: props.excecoes ?? [],
  }
}

describe('eventos pontuais', () => {
  it('entra na sua data', () => {
    const evento = pontual({ data: QUINTA, inicio: '14:00', fim: '15:00' })
    expect(eventosDoDia([evento], QUINTA)).toHaveLength(1)
  })

  it('não entra em outra data', () => {
    const evento = pontual({ data: QUINTA, inicio: '14:00', fim: '15:00' })
    expect(eventosDoDia([evento], SEXTA)).toEqual([])
  })
})

describe('eventos fixos — dia da semana', () => {
  it('entra no dia da semana marcado', () => {
    // 4 = quinta
    const aula = fixo({ inicio: '19:30', fim: '22:30', diasDaSemana: [2, 4] })
    expect(eventosDoDia([aula], QUINTA)).toHaveLength(1)
  })

  it('não entra em dia da semana não marcado', () => {
    const aula = fixo({ inicio: '19:30', fim: '22:30', diasDaSemana: [2, 4] })
    expect(eventosDoDia([aula], SABADO)).toEqual([])
  })
})

describe('eventos fixos — validade', () => {
  it('não aparece antes do início do semestre', () => {
    const aula = fixo({
      inicio: '19:30',
      fim: '22:30',
      diasDaSemana: [4],
      validoDe: '2026-09-18',
    })
    expect(eventosDoDia([aula], QUINTA)).toEqual([])
  })

  it('não aparece nas férias, depois do fim do semestre', () => {
    // É por isso que validoAte existe: a aula não pode aparecer em janeiro.
    const aula = fixo({
      inicio: '19:30',
      fim: '22:30',
      diasDaSemana: [4],
      validoAte: '2026-09-16',
    })
    expect(eventosDoDia([aula], QUINTA)).toEqual([])
  })

  it('a validade inclui as duas pontas', () => {
    const aula = fixo({
      inicio: '19:30',
      fim: '22:30',
      diasDaSemana: [4],
      validoDe: QUINTA,
      validoAte: QUINTA,
    })
    expect(eventosDoDia([aula], QUINTA)).toHaveLength(1)
  })
})

describe('eventos fixos — exceções', () => {
  it('a aula cancelada não acontece', () => {
    const aula = fixo({
      inicio: '19:30',
      fim: '22:30',
      diasDaSemana: [4],
      excecoes: [QUINTA],
    })
    expect(eventosDoDia([aula], QUINTA)).toEqual([])
  })

  it('a exceção vale só para a data cancelada', () => {
    const aula = fixo({
      inicio: '19:30',
      fim: '22:30',
      diasDaSemana: [4, 5],
      excecoes: [QUINTA],
    })
    expect(eventosDoDia([aula], SEXTA)).toHaveLength(1)
  })
})

describe('resultado', () => {
  it('sai ordenado por horário de início', () => {
    const eventos = [
      pontual({ nome: 'Faculdade', data: QUINTA, inicio: '19:30', fim: '22:30' }),
      pontual({ nome: 'Trabalho', data: QUINTA, inicio: '09:00', fim: '12:00' }),
      fixo({ nome: 'Academia', inicio: '18:00', fim: '19:00', diasDaSemana: [4] }),
    ]

    expect(eventosDoDia(eventos, QUINTA).map((e) => e.nome)).toEqual([
      'Trabalho',
      'Academia',
      'Faculdade',
    ])
  })

  it('achata o evento: a recorrência não vaza para o consumidor', () => {
    // Isto é o contrato com o motor de insights. Se `tipo` ou `diasDaSemana`
    // vazassem, alguém acabaria escrevendo regra de recorrência dentro do motor.
    const aula = fixo({ inicio: '19:30', fim: '22:30', diasDaSemana: [4] })
    const [achatado] = eventosDoDia([aula], QUINTA)

    expect(Object.keys(achatado).sort()).toEqual([
      'categoria',
      'deslocamento',
      'fim',
      'id',
      'inicio',
      'nome',
    ])
  })

  it('preserva o id, para a interface achar o evento original', () => {
    const aula = fixo({
      id: 'aula-web',
      inicio: '19:30',
      fim: '22:30',
      diasDaSemana: [4],
    })
    expect(eventosDoDia([aula], QUINTA)[0].id).toBe('aula-web')
  })

  it('devolve lista vazia quando não há nada', () => {
    expect(eventosDoDia([], QUINTA)).toEqual([])
  })

  it('mistura pontuais e fixos no mesmo dia', () => {
    const eventos = [
      fixo({ nome: 'Aula', inicio: '19:30', fim: '22:30', diasDaSemana: [4] }),
      pontual({ nome: 'Dentista', data: QUINTA, inicio: '15:00', fim: '16:00' }),
      pontual({ nome: 'Viagem', data: SABADO, inicio: '08:00', fim: '12:00' }),
    ]

    expect(eventosDoDia(eventos, QUINTA).map((e) => e.nome)).toEqual(['Dentista', 'Aula'])
  })
})
