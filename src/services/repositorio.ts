/**
 * Persistência de eventos.
 *
 * A interface é assíncrona desde o primeiro dia mesmo com `localStorage`
 * sendo síncrono. É de propósito: quando `RepositorioSupabase` entrar, ele
 * implementa a mesma interface e nenhum componente muda. Trocar de síncrono
 * para assíncrono depois obrigaria a reescrever todo consumidor.
 */

import type { Evento } from '../types'

export interface RepositorioEventos {
  listar(): Promise<Evento[]>
  criar(e: Evento): Promise<Evento>
  atualizar(e: Evento): Promise<Evento>
  remover(id: string): Promise<void>
}

/**
 * O pedaço de `localStorage` que este módulo usa.
 *
 * Declarado como interface para o repositório poder ser testado sem
 * navegador — os testes passam um objeto em memória.
 */
export interface ArmazenamentoSimples {
  getItem(chave: string): string | null
  setItem(chave: string, valor: string): void
}

const CHAVE = 'lifeos.eventos'

/** Erro de leitura do armazenamento, distinguível de um erro de programação. */
export class ErroDeArmazenamento extends Error {
  constructor(mensagem: string, opcoes?: { cause?: unknown }) {
    super(mensagem, opcoes)
    this.name = 'ErroDeArmazenamento'
  }
}

export class RepositorioLocal implements RepositorioEventos {
  private readonly armazenamento: ArmazenamentoSimples

  constructor(armazenamento: ArmazenamentoSimples) {
    this.armazenamento = armazenamento
  }

  async listar(): Promise<Evento[]> {
    const cru = this.armazenamento.getItem(CHAVE)
    if (cru === null) return []

    let lido: unknown
    try {
      lido = JSON.parse(cru)
    } catch (causa) {
      // Dado corrompido não é apagado em silêncio: a interface precisa poder
      // dizer ao usuário que algo deu errado com o que estava salvo.
      throw new ErroDeArmazenamento('Não foi possível ler os eventos salvos.', {
        cause: causa,
      })
    }

    if (!Array.isArray(lido)) {
      throw new ErroDeArmazenamento('Os eventos salvos estão em um formato inesperado.')
    }
    return lido as Evento[]
  }

  async criar(evento: Evento): Promise<Evento> {
    const eventos = await this.listar()
    if (eventos.some((e) => e.id === evento.id)) {
      throw new ErroDeArmazenamento(`Já existe um evento com o id "${evento.id}".`)
    }
    this.gravar([...eventos, evento])
    return evento
  }

  async atualizar(evento: Evento): Promise<Evento> {
    const eventos = await this.listar()
    const indice = eventos.findIndex((e) => e.id === evento.id)
    if (indice === -1) {
      throw new ErroDeArmazenamento(`Evento "${evento.id}" não encontrado.`)
    }
    const atualizados = [...eventos]
    atualizados[indice] = evento
    this.gravar(atualizados)
    return evento
  }

  async remover(id: string): Promise<void> {
    const eventos = await this.listar()
    this.gravar(eventos.filter((e) => e.id !== id))
  }

  /**
   * `true` enquanto nada tiver sido gravado — primeira visita.
   *
   * Distinto de "lista vazia": quem apagou todos os eventos de propósito não
   * deve receber o dia de demonstração de volta na próxima abertura.
   */
  async nuncaGravado(): Promise<boolean> {
    return this.armazenamento.getItem(CHAVE) === null
  }

  /** Substitui tudo de uma vez. É o que o botão "recarregar o dia de demonstração" usa. */
  async substituirTudo(eventos: Evento[]): Promise<Evento[]> {
    this.gravar(eventos)
    return eventos
  }

  private gravar(eventos: Evento[]): void {
    try {
      this.armazenamento.setItem(CHAVE, JSON.stringify(eventos))
    } catch (causa) {
      // Acontece de verdade: cota cheia, ou navegação privada no Safari.
      throw new ErroDeArmazenamento('Não foi possível salvar. O armazenamento recusou.', {
        cause: causa,
      })
    }
  }
}

/**
 * Armazenamento em memória, usado quando o navegador nega `localStorage`
 * (navegação privada, cookies bloqueados). O app continua funcionando na
 * sessão atual em vez de mostrar uma tela quebrada — só não lembra depois.
 */
export class ArmazenamentoEmMemoria implements ArmazenamentoSimples {
  private readonly dados = new Map<string, string>()

  getItem(chave: string): string | null {
    return this.dados.get(chave) ?? null
  }

  setItem(chave: string, valor: string): void {
    this.dados.set(chave, valor)
  }
}

/** `localStorage` quando existe, memória quando o navegador o recusa. */
export function armazenamentoDisponivel(): ArmazenamentoSimples {
  try {
    const teste = '__lifeos__'
    window.localStorage.setItem(teste, teste)
    window.localStorage.removeItem(teste)
    return window.localStorage
  } catch {
    return new ArmazenamentoEmMemoria()
  }
}
