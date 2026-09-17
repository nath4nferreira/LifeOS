import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Evento } from '../types'
import {
  ErroDeArmazenamento,
  RepositorioLocal,
  armazenamentoDisponivel,
} from '../services/repositorio'
import { eventosDeDemonstracao } from '../services/demonstracao'
import { hojeISO } from '../services/relogio'

interface EstadoDosEventos {
  eventos: Evento[]
  carregando: boolean
  /** Mensagem pronta para a tela, `null` quando está tudo certo. */
  erro: string | null
  criar: (evento: Evento) => Promise<void>
  atualizar: (evento: Evento) => Promise<void>
  remover: (id: string) => Promise<void>
  recarregarDemonstracao: () => Promise<void>
}

/**
 * Os eventos do usuário e as operações sobre eles.
 *
 * Todo componente fala com este hook, nunca com o repositório — é isso que
 * permite trocar `RepositorioLocal` por `RepositorioSupabase` sem tocar em
 * nenhuma tela.
 *
 * O estado de carregamento e de erro é real, não decorativo: alimenta a
 * heurística 1 (visibilidade do estado do sistema) e as mensagens de erro
 * que a WCAG exige.
 */
export function useEventos(): EstadoDosEventos {
  const repositorio = useMemo(() => new RepositorioLocal(armazenamentoDisponivel()), [])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // O StrictMode monta o componente duas vezes em desenvolvimento; sem esta
  // trava a demonstração seria semeada duas vezes e os ids colidiriam.
  const jaCarregou = useRef(false)

  useEffect(() => {
    if (jaCarregou.current) return
    jaCarregou.current = true

    void (async () => {
      try {
        // Primeira visita recebe o dia de demonstração. Quem apagou os
        // próprios eventos de propósito não recebe nada de volta.
        if (await repositorio.nuncaGravado()) {
          setEventos(await repositorio.substituirTudo(eventosDeDemonstracao(hojeISO())))
        } else {
          setEventos(await repositorio.listar())
        }
      } catch (causa) {
        setErro(mensagemDe(causa))
      } finally {
        setCarregando(false)
      }
    })()
  }, [repositorio])

  /**
   * Toda operação de escrita segue o mesmo roteiro: limpa o erro anterior,
   * grava, recarrega a lista do repositório. Recarregar em vez de remendar o
   * array em memória mantém a tela igual ao que está salvo de verdade.
   */
  const escrever = useCallback(
    async (operacao: () => Promise<unknown>) => {
      setErro(null)
      try {
        await operacao()
        setEventos(await repositorio.listar())
      } catch (causa) {
        setErro(mensagemDe(causa))
        throw causa
      }
    },
    [repositorio],
  )

  return {
    eventos,
    carregando,
    erro,
    criar: useCallback(
      (evento) => escrever(() => repositorio.criar(evento)),
      [escrever, repositorio],
    ),
    atualizar: useCallback(
      (evento) => escrever(() => repositorio.atualizar(evento)),
      [escrever, repositorio],
    ),
    remover: useCallback(
      (id) => escrever(() => repositorio.remover(id)),
      [escrever, repositorio],
    ),
    recarregarDemonstracao: useCallback(
      () => escrever(() => repositorio.substituirTudo(eventosDeDemonstracao(hojeISO()))),
      [escrever, repositorio],
    ),
  }
}

function mensagemDe(causa: unknown): string {
  if (causa instanceof ErroDeArmazenamento) return causa.message
  return 'Algo deu errado ao acessar seus eventos. Tente de novo.'
}
