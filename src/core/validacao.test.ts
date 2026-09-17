import { describe, expect, it } from 'vitest'
import type { EventoBase } from '../types'
import {
  minutosDeDeslocamento,
  montarEvento,
  rascunhoVazio,
  sobreposicoesDe,
  validarRascunho,
  type RascunhoEvento,
} from './validacao'

function rascunho(alteracoes: Partial<RascunhoEvento> = {}): RascunhoEvento {
  return {
    ...rascunhoVazio('2026-09-17'),
    nome: 'Aula',
    inicio: '19:30',
    fim: '22:30',
    deslocamento: '25',
    ...alteracoes,
  }
}

describe('validarRascunho', () => {
  it('aceita um rascunho completo', () => {
    expect(validarRascunho(rascunho())).toEqual({})
  })

  it('exige nome de verdade, não só espaços', () => {
    expect(validarRascunho(rascunho({ nome: '   ' })).nome).toBeDefined()
  })

  it('recusa categoria inventada', () => {
    expect(validarRascunho(rascunho({ categoria: 'astrologia' })).categoria).toBeDefined()
  })

  it('recusa data que não existe', () => {
    expect(validarRascunho(rascunho({ data: '2026-02-30' })).data).toBeDefined()
  })

  it('ignora a data quando o evento é fixo, e a recorrência quando é pontual', () => {
    // Um rascunho carrega os campos dos dois tipos ao mesmo tempo para não
    // perder o que foi digitado ao alternar; só os do tipo escolhido valem.
    const comoFixo = validarRascunho(
      rascunho({ tipo: 'fixo', data: 'lixo', diasDaSemana: [2] }),
    )
    expect(comoFixo).toEqual({})

    const comoPontual = validarRascunho(rascunho({ tipo: 'pontual', diasDaSemana: [] }))
    expect(comoPontual).toEqual({})
  })

  it('recusa horário fora do formato', () => {
    expect(validarRascunho(rascunho({ inicio: '25:00' })).inicio).toBeDefined()
    expect(validarRascunho(rascunho({ fim: 'meio-dia' })).fim).toBeDefined()
  })

  it('exige término depois do início', () => {
    expect(validarRascunho(rascunho({ inicio: '22:00', fim: '19:00' })).fim).toBeDefined()
    expect(validarRascunho(rascunho({ inicio: '19:00', fim: '19:00' })).fim).toBeDefined()
  })

  it('não reclama do término quando o início já está inválido', () => {
    // Dois erros para o mesmo engano seria ruído: conserte o início primeiro.
    const erros = validarRascunho(rascunho({ inicio: 'xx', fim: '10:00' }))
    expect(erros.inicio).toBeDefined()
    expect(erros.fim).toBeUndefined()
  })

  it('aceita deslocamento 0 e recusa vazio, negativo ou absurdo', () => {
    expect(validarRascunho(rascunho({ deslocamento: '0' })).deslocamento).toBeUndefined()
    expect(validarRascunho(rascunho({ deslocamento: '' })).deslocamento).toBeDefined()
    expect(validarRascunho(rascunho({ deslocamento: '-5' })).deslocamento).toBeDefined()
    expect(validarRascunho(rascunho({ deslocamento: '1,5' })).deslocamento).toBeDefined()
    expect(validarRascunho(rascunho({ deslocamento: '600' })).deslocamento).toBeDefined()
  })
})

describe('validarRascunho de evento fixo', () => {
  function fixo(alteracoes: Partial<RascunhoEvento> = {}) {
    return rascunho({ tipo: 'fixo', ...alteracoes })
  }

  it('exige pelo menos um dia da semana', () => {
    expect(validarRascunho(fixo({ diasDaSemana: [] })).diasDaSemana).toBeDefined()
    expect(validarRascunho(fixo({ diasDaSemana: [1, 3] })).diasDaSemana).toBeUndefined()
  })

  it('exige validade coerente', () => {
    expect(validarRascunho(fixo({ validoDe: 'nunca' })).validoDe).toBeDefined()
    expect(
      validarRascunho(fixo({ validoDe: '2026-12-01', validoAte: '2026-09-01' })).validoAte,
    ).toBeDefined()
    // Um único dia de validade é válido: um semestre de uma aula só.
    expect(
      validarRascunho(fixo({ validoDe: '2026-09-01', validoAte: '2026-09-01' })).validoAte,
    ).toBeUndefined()
  })
})

describe('montarEvento', () => {
  it('descarta os campos do outro tipo', () => {
    const pontual = montarEvento(rascunho({ nome: '  Aula  ' }), 'x')
    expect(pontual).toEqual({
      tipo: 'pontual',
      id: 'x',
      nome: 'Aula',
      categoria: 'pessoal',
      data: '2026-09-17',
      inicio: '19:30',
      fim: '22:30',
      deslocamento: 25,
    })
    expect(pontual).not.toHaveProperty('diasDaSemana')
  })

  it('ordena dias e exceções, e não guarda a data do rascunho', () => {
    const fixo = montarEvento(
      rascunho({
        tipo: 'fixo',
        diasDaSemana: [4, 1, 2],
        excecoes: ['2026-12-25', '2026-10-12'],
      }),
      'y',
    )
    expect(fixo).toMatchObject({
      tipo: 'fixo',
      diasDaSemana: [1, 2, 4],
      excecoes: ['2026-10-12', '2026-12-25'],
    })
    expect(fixo).not.toHaveProperty('data')
  })

  it('copia as listas em vez de compartilhá-las com o rascunho', () => {
    const original = rascunho({ tipo: 'fixo', diasDaSemana: [3], excecoes: ['2026-10-12'] })
    const evento = montarEvento(original, 'z')

    original.diasDaSemana.push(5)
    original.excecoes.push('2026-11-02')

    expect(evento).toMatchObject({ diasDaSemana: [3], excecoes: ['2026-10-12'] })
  })
})

describe('minutosDeDeslocamento', () => {
  it('distingue vazio de zero', () => {
    expect(minutosDeDeslocamento('0')).toBe(0)
    expect(minutosDeDeslocamento('')).toBeNull()
    expect(minutosDeDeslocamento('  ')).toBeNull()
    expect(minutosDeDeslocamento(' 25 ')).toBe(25)
  })
})

describe('sobreposicoesDe', () => {
  const doDia: EventoBase[] = [
    { id: 'almoco', nome: 'Almoço', categoria: 'pessoal', inicio: '12:00', fim: '13:00', deslocamento: 0 },
    { id: 'aula', nome: 'Aula', categoria: 'estudos', inicio: '19:30', fim: '22:30', deslocamento: 25 },
  ]

  it('encosta não é sobrepor', () => {
    expect(sobreposicoesDe(rascunho({ inicio: '13:00', fim: '14:00' }), doDia)).toEqual([])
  })

  it('aponta quem se cruza', () => {
    const conflitos = sobreposicoesDe(rascunho({ inicio: '12:30', fim: '13:30' }), doDia)
    expect(conflitos.map((e) => e.id)).toEqual(['almoco'])
  })

  it('um evento que engloba outro também conta', () => {
    const conflitos = sobreposicoesDe(rascunho({ inicio: '08:00', fim: '23:00' }), doDia)
    expect(conflitos.map((e) => e.id)).toEqual(['almoco', 'aula'])
  })

  it('ao editar, o evento não conflita consigo mesmo', () => {
    const conflitos = sobreposicoesDe(rascunho({ inicio: '19:30', fim: '22:30' }), doDia, 'aula')
    expect(conflitos).toEqual([])
  })

  it('não tenta comparar horário inválido', () => {
    expect(sobreposicoesDe(rascunho({ inicio: 'xx' }), doDia)).toEqual([])
  })
})
