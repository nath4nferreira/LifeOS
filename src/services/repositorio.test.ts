import { describe, expect, it } from 'vitest'
import type { Evento } from '../types'
import {
  ArmazenamentoEmMemoria,
  ErroDeArmazenamento,
  RepositorioLocal,
} from './repositorio'

function evento(id: string, inicio = '09:00'): Evento {
  return {
    tipo: 'pontual',
    id,
    nome: 'Reunião',
    categoria: 'trabalho',
    data: '2026-09-17',
    inicio,
    fim: '10:00',
    deslocamento: 0,
  }
}

function novoRepositorio() {
  return new RepositorioLocal(new ArmazenamentoEmMemoria())
}

describe('RepositorioLocal', () => {
  it('começa vazio e sem nunca ter gravado', async () => {
    const repo = novoRepositorio()
    expect(await repo.listar()).toEqual([])
    expect(await repo.nuncaGravado()).toBe(true)
  })

  it('deixa de ser "nunca gravado" depois da primeira escrita, mesmo esvaziando tudo', async () => {
    const repo = novoRepositorio()
    await repo.criar(evento('a'))
    await repo.remover('a')

    // Quem apagou os próprios eventos não deve receber a demonstração de volta.
    expect(await repo.listar()).toEqual([])
    expect(await repo.nuncaGravado()).toBe(false)
  })

  it('cria, atualiza e remove', async () => {
    const repo = novoRepositorio()
    await repo.criar(evento('a'))
    await repo.criar(evento('b'))
    expect(await repo.listar()).toHaveLength(2)

    await repo.atualizar({ ...evento('a'), nome: 'Outro nome' } as Evento)
    const depois = await repo.listar()
    expect(depois.find((e) => e.id === 'a')?.nome).toBe('Outro nome')
    // Atualizar preserva a posição na lista.
    expect(depois.map((e) => e.id)).toEqual(['a', 'b'])

    await repo.remover('a')
    expect((await repo.listar()).map((e) => e.id)).toEqual(['b'])
  })

  it('recusa id repetido', async () => {
    const repo = novoRepositorio()
    await repo.criar(evento('a'))
    await expect(repo.criar(evento('a'))).rejects.toBeInstanceOf(ErroDeArmazenamento)
  })

  it('recusa atualizar evento que não existe', async () => {
    const repo = novoRepositorio()
    await expect(repo.atualizar(evento('fantasma'))).rejects.toBeInstanceOf(
      ErroDeArmazenamento,
    )
  })

  it('remover id inexistente não quebra nem apaga o resto', async () => {
    const repo = novoRepositorio()
    await repo.criar(evento('a'))
    await repo.remover('fantasma')
    expect((await repo.listar()).map((e) => e.id)).toEqual(['a'])
  })

  it('avisa em vez de apagar em silêncio quando o dado salvo está corrompido', async () => {
    const armazenamento = new ArmazenamentoEmMemoria()
    armazenamento.setItem('lifeos.eventos', '{isso não é json')
    const repo = new RepositorioLocal(armazenamento)

    await expect(repo.listar()).rejects.toBeInstanceOf(ErroDeArmazenamento)
  })

  it('avisa quando o dado salvo não é uma lista', async () => {
    const armazenamento = new ArmazenamentoEmMemoria()
    armazenamento.setItem('lifeos.eventos', '{"eventos":[]}')
    const repo = new RepositorioLocal(armazenamento)

    await expect(repo.listar()).rejects.toBeInstanceOf(ErroDeArmazenamento)
  })
})
