/**
 * Onde o "agora" cai dentro do dia desenhado.
 *
 * RESTRIÇÃO DE PORTABILIDADE: lógica pura. Não importa React, não toca em DOM
 * e não lê o relógio — recebe `agora` em minutos desde a meia-noite. Quem sabe
 * que horas são é `services/relogio`. Os testes daqui servem de especificação
 * para um port futuro em Dart.
 */

import type { EventoBase } from '../types'
import { paraMinutos } from '../utils/tempo'

/**
 * `durante`: o agora cai dentro de `eventos[indice]`.
 * `entre`: o agora cai num vão, e o marcador entra logo antes de
 * `eventos[indice]`. `indice === eventos.length` significa depois do último —
 * o dia já acabou.
 */
export type MarcadorDoAgora =
  | { tipo: 'durante'; indice: number }
  | { tipo: 'entre'; indice: number }

/**
 * Sempre devolve uma posição: todo minuto do dia está dentro de um evento ou
 * entre dois. Lista vazia devolve `entre 0`, que a trilha simplesmente não
 * desenha por já estar no estado vazio.
 *
 * O fim é exclusivo: às 10:00 em ponto um evento que termina às 10:00 já
 * acabou, e o marcador passa para o vão seguinte. É o que a pessoa espera de
 * "já saí da aula".
 *
 * Com eventos sobrepostos — que o formulário avisa mas não proíbe — vence o
 * primeiro da lista, que é o que começou mais cedo.
 */
export function marcadorDoAgora(
  eventos: EventoBase[],
  agora: number,
): MarcadorDoAgora {
  const durante = eventos.findIndex(
    (evento) => paraMinutos(evento.inicio) <= agora && agora < paraMinutos(evento.fim),
  )
  if (durante !== -1) return { tipo: 'durante', indice: durante }

  const proximo = eventos.findIndex((evento) => paraMinutos(evento.inicio) > agora)
  return { tipo: 'entre', indice: proximo === -1 ? eventos.length : proximo }
}

/**
 * Quanto do evento já passou, de 0 a 1. É o que posiciona a linha do agora
 * dentro do bloco — a trilha é em escala, então a linha precisa cair no ponto
 * proporcional, não no meio.
 *
 * Evento de duração zero devolve 0 em vez de dividir por zero.
 */
export function progressoNoEvento(evento: EventoBase, agora: number): number {
  const inicio = paraMinutos(evento.inicio)
  const total = paraMinutos(evento.fim) - inicio
  if (total <= 0) return 0
  return Math.min(1, Math.max(0, (agora - inicio) / total))
}
