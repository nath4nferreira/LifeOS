import { describe, expect, it } from 'vitest'
import type { EventoBase } from '../types'
import {
  minutosDeDeslocamento,
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
