/**
 * O dia de demonstração da seção 15 do briefing.
 *
 * Existe por um motivo prático: se o app abrir vazio no vídeo, nenhum insight
 * aparece — e o insight é o produto. Os ajustes têm um botão para recarregar
 * este dia a qualquer momento.
 *
 * A montagem é relativa à data informada, não a datas fixas no código: o dia
 * de demonstração precisa ser hoje em qualquer dia que o app for aberto.
 */

import type { Evento, EventoFixo, Previsao } from '../types'
import { diaDaSemana, somarDias } from '../utils/tempo'

/** Meses de validade do semestre fictício dos eventos fixos. */
const DIAS_DE_VALIDADE = 120

/**
 * Previsão fixa da seção 15, usada quando a API real não está disponível.
 * Os números são o que produz os 4 insights esperados: a chuva das 19:00
 * (82%) cai sobre a saída para a faculdade, e a mínima de 15° às 21:00 é a
 * queda térmica de 8° partindo dos 23° da saída.
 */
export const PREVISAO_DE_DEMONSTRACAO: Previsao = {
  local: 'São Paulo',
  tempAtual: 22,
  condicaoAtual: 'nublado',
  horas: [
    { hora: '08:00', temp: 17, chuva: 0.05 },
    { hora: '11:00', temp: 21, chuva: 0.1 },
    { hora: '14:00', temp: 24, chuva: 0.15 },
    { hora: '17:00', temp: 23, chuva: 0.35 },
    { hora: '19:00', temp: 19, chuva: 0.82 },
    { hora: '21:00', temp: 15, chuva: 0.55 },
  ],
}

/**
 * A rotina da seção 15 como eventos fixos, mais um evento pontual amanhã.
 *
 * Os quatro compromissos da rotina são `fixo` porque é o que eles são na
 * vida real — trabalho e faculdade se repetem — e porque é assim que o
 * seletor tem o que achatar na demonstração.
 *
 * O voo de amanhã é `pontual`, cobre o outro tipo do modelo e aciona a
 * Regra 7: chegando em casa às 22:55 e saindo às 05:00, sobram 6h05 de
 * janela, abaixo do mínimo de 7h.
 */
export function eventosDeDemonstracao(hoje: string): Evento[] {
  // Dias úteis, mais o dia de hoje: sem isso a demonstração abriria vazia se
  // o app fosse aberto num sábado, que é exatamente quando alguém testa.
  const diasUteis = [1, 2, 3, 4, 5]
  const dias = diasUteis.includes(diaDaSemana(hoje))
    ? diasUteis
    : [...diasUteis, diaDaSemana(hoje)]

  // Função e não objeto compartilhado: cada evento precisa da própria lista de
  // exceções, senão cancelar uma aula cancelaria o trabalho junto.
  const rotina = (): Pick<
    EventoFixo,
    'tipo' | 'diasDaSemana' | 'validoDe' | 'validoAte' | 'excecoes'
  > => ({
    tipo: 'fixo',
    diasDaSemana: [...dias],
    validoDe: hoje,
    validoAte: somarDias(hoje, DIAS_DE_VALIDADE),
    excecoes: [],
  })

  return [
    {
      ...rotina(),
      id: 'demo-trabalho-manha',
      nome: 'Trabalho',
      categoria: 'trabalho',
      inicio: '09:00',
      fim: '12:00',
      deslocamento: 0,
    },
    {
      ...rotina(),
      id: 'demo-almoco',
      nome: 'Almoço',
      categoria: 'pessoal',
      inicio: '12:00',
      fim: '13:00',
      deslocamento: 0,
    },
    {
      ...rotina(),
      id: 'demo-trabalho-tarde',
      nome: 'Trabalho',
      categoria: 'trabalho',
      inicio: '14:30',
      fim: '17:30',
      deslocamento: 0,
    },
    {
      ...rotina(),
      id: 'demo-academia',
      nome: 'Academia',
      categoria: 'saude',
      inicio: '18:00',
      fim: '19:00',
      deslocamento: 15,
    },
    {
      ...rotina(),
      id: 'demo-faculdade',
      nome: 'Faculdade',
      categoria: 'estudos',
      inicio: '19:30',
      fim: '22:30',
      deslocamento: 25,
    },
    {
      tipo: 'pontual',
      id: 'demo-voo',
      nome: 'Voo para Recife',
      categoria: 'pessoal',
      data: somarDias(hoje, 1),
      inicio: '06:00',
      fim: '08:00',
      deslocamento: 60,
    },
  ]
}
