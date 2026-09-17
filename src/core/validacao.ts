/**
 * Validação de evento — prevenção de erros (heurística 5).
 *
 * Mora em `core/` porque é regra de negócio: "o término vem depois do início"
 * não é detalhe de formulário, é uma verdade sobre evento. O componente só
 * mostra as mensagens que esta função devolve.
 *
 * RESTRIÇÃO DE PORTABILIDADE: função pura, sem React, DOM ou I/O.
 */

import type { Categoria, EventoBase } from '../types'
import { CATEGORIAS } from '../types'
import { dataValida, duracao, horarioValido, paraMinutos } from '../utils/tempo'

/** Um deslocamento maior que isso é erro de digitação, não uma viagem. */
const DESLOCAMENTO_MAXIMO = 8 * 60

/**
 * O formulário em texto, antes de virar evento.
 *
 * Os campos são `string` porque é isso que um `<input>` devolve — inclusive o
 * deslocamento. Validar o texto cru é o que permite distinguir "vazio" de
 * "zero", que num campo numérico significam coisas bem diferentes.
 */
export interface RascunhoEvento {
  nome: string
  categoria: string
  data: string
  inicio: string
  fim: string
  deslocamento: string
}

export type CampoDeEvento = keyof RascunhoEvento

export type ErrosDoRascunho = Partial<Record<CampoDeEvento, string>>

export function rascunhoVazio(data: string): RascunhoEvento {
  return {
    nome: '',
    categoria: 'pessoal',
    data,
    inicio: '',
    fim: '',
    // Zero é o padrão honesto: a maioria dos eventos de quem estuda e
    // trabalha de casa não tem deslocamento nenhum.
    deslocamento: '0',
  }
}

/**
 * Os erros que impedem salvar. Objeto vazio significa que está tudo certo.
 *
 * Sobreposição com outro evento NÃO está aqui de propósito — é aviso, não
 * erro. Ver `sobreposicoesDe`.
 */
export function validarRascunho(rascunho: RascunhoEvento): ErrosDoRascunho {
  const erros: ErrosDoRascunho = {}

  if (rascunho.nome.trim() === '') {
    erros.nome = 'Dê um nome ao evento — é como ele vai aparecer na sua trilha.'
  }

  if (!ehCategoria(rascunho.categoria)) {
    erros.categoria = 'Escolha uma categoria.'
  }

  if (!dataValida(rascunho.data)) {
    erros.data = 'Informe uma data válida.'
  }

  if (!horarioValido(rascunho.inicio)) {
    erros.inicio = 'Informe um horário de início, como 19:30.'
  }

  if (!horarioValido(rascunho.fim)) {
    erros.fim = 'Informe um horário de término, como 22:30.'
  } else if (horarioValido(rascunho.inicio) && duracao(rascunho.inicio, rascunho.fim) <= 0) {
    // Eventos que atravessam a meia-noite não existem no modelo: o dia é a
    // unidade do produto. Recusar é melhor que aceitar e calcular errado.
    erros.fim = `O término precisa vir depois de ${rascunho.inicio}.`
  }

  const deslocamento = minutosDeDeslocamento(rascunho.deslocamento)
  if (deslocamento === null) {
    erros.deslocamento = 'Informe os minutos de caminho — 0 se for em casa ou remoto.'
  } else if (deslocamento > DESLOCAMENTO_MAXIMO) {
    erros.deslocamento = `${DESLOCAMENTO_MAXIMO} minutos já é o limite. Confira o número.`
  }

  return erros
}

/**
 * Os eventos do dia que se cruzam com o rascunho.
 *
 * Isto é aviso, não impedimento: o usuário pode ter mesmo dois compromissos
 * sobrepostos, e o motor já trata isso como um insight crítico. Bloquear
 * seria o app decidindo pelo usuário, que é justamente o que o LifeOS não faz.
 */
export function sobreposicoesDe(
  rascunho: RascunhoEvento,
  doDia: EventoBase[],
  /** Ao editar, o próprio evento não conta como conflito consigo mesmo. */
  ignorarId?: string,
): EventoBase[] {
  if (!horarioValido(rascunho.inicio) || !horarioValido(rascunho.fim)) return []

  const inicio = paraMinutos(rascunho.inicio)
  const fim = paraMinutos(rascunho.fim)
  if (fim <= inicio) return []

  return doDia.filter((evento) => {
    if (evento.id === ignorarId) return false
    // Encostar não é sobrepor: almoço 12:00–13:00 e reunião 13:00–14:00 convivem.
    return paraMinutos(evento.inicio) < fim && paraMinutos(evento.fim) > inicio
  })
}

/** Minutos de deslocamento, ou `null` se o texto não for um inteiro não negativo. */
export function minutosDeDeslocamento(texto: string): number | null {
  const limpo = texto.trim()
  if (limpo === '' || !/^\d+$/.test(limpo)) return null
  return Number(limpo)
}

export function ehCategoria(valor: string): valor is Categoria {
  return (CATEGORIAS as readonly string[]).includes(valor)
}
