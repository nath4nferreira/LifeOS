/**
 * O seletor — a costura do projeto.
 *
 * Recorrência é problema de seleção, não de motor. Este módulo é o único
 * lugar do sistema que sabe que `EventoFixo` existe: ele resolve quais
 * eventos realmente acontecem numa data e entrega uma lista plana.
 * `core/insights.ts` recebe `EventoBase[]` e nunca vê recorrência.
 *
 * RESTRIÇÃO DE PORTABILIDADE: função pura, sem React, DOM ou I/O.
 */

import type { Evento, EventoBase, EventoFixo } from '../types'
import { diaDaSemana, paraMinutos } from '../utils/tempo'

/**
 * Devolve os eventos que efetivamente acontecem na data informada, já
 * achatados e ordenados por horário de início.
 */
export function eventosDoDia(eventos: Evento[], data: string): EventoBase[] {
  const dia = diaDaSemana(data)

  return eventos
    .filter((evento) =>
      evento.tipo === 'pontual' ? evento.data === data : ocorreEm(evento, data, dia),
    )
    .map(achatar)
    .sort((a, b) => paraMinutos(a.inicio) - paraMinutos(b.inicio))
}

/**
 * Um evento fixo acontece na data se ela está dentro da validade, cai em um
 * dos dias da semana marcados e não foi cancelada.
 */
function ocorreEm(evento: EventoFixo, data: string, dia: number): boolean {
  // Datas ISO AAAA-MM-DD têm largura fixa e zeros à esquerda, então comparar
  // como texto dá a mesma ordem que comparar como data — sem criar objetos.
  const dentroDaValidade = data >= evento.validoDe && data <= evento.validoAte
  if (!dentroDaValidade) return false

  if (!evento.diasDaSemana.includes(dia)) return false

  // Cancelar uma ocorrência é adicionar a data aqui. Resolve "hoje a aula foi
  // cancelada" sem um sistema de edição de instância de recorrência.
  return !evento.excecoes.includes(data)
}

/**
 * Descarta o que era específico da recorrência. O achatamento é de verdade,
 * não só de tipo: quem recebe o resultado não tem como descobrir que o
 * evento se repete, nem por acidente nem por conversão de tipo.
 */
function achatar(evento: Evento): EventoBase {
  const { id, nome, categoria, inicio, fim, deslocamento } = evento
  return { id, nome, categoria, inicio, fim, deslocamento }
}
