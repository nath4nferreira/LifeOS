/**
 * Estes testes são a especificação do motor de insights.
 *
 * Cobrem os dez casos da seção 8 do briefing mais o cenário de demonstração
 * da seção 15. Um port futuro para Dart deve passar exatamente nos mesmos
 * casos — por isso nada aqui depende de React, DOM ou relógio do sistema.
 */

import { describe, expect, it } from 'vitest'
import type { EventoBase, HoraPrevisao, Previsao } from '../types'
import {
  gerarInsights,
  insightsDeTransicao,
  resumoDoDia,
  vereditoDoDia,
} from './insights'

function evento(props: {
  nome?: string
  inicio: string
  fim: string
  deslocamento?: number
}): EventoBase {
  const nome = props.nome ?? 'Compromisso'
  return {
    id: `${nome}-${props.inicio}`,
    nome,
    categoria: 'pessoal',
    inicio: props.inicio,
    fim: props.fim,
    deslocamento: props.deslocamento ?? 0,
  }
}

function faixa(hora: string, temp: number, chuva: number): HoraPrevisao {
  return { hora, temp, chuva }
}

function previsao(horas: HoraPrevisao[]): Previsao {
  return {
    local: 'São Paulo',
    tempAtual: horas[0].temp,
    condicaoAtual: 'nublado',
    horas,
  }
}

/** Dados de demonstração da seção 15 do briefing. */
const DIA_DE_DEMONSTRACAO: EventoBase[] = [
  {
    ...evento({ nome: 'Trabalho', inicio: '09:00', fim: '12:00' }),
    id: 'trabalho-manha',
  },
  { ...evento({ nome: 'Almoço', inicio: '12:00', fim: '13:00' }), id: 'almoco' },
  {
    ...evento({ nome: 'Trabalho', inicio: '14:30', fim: '17:30' }),
    id: 'trabalho-tarde',
  },
  {
    ...evento({ nome: 'Academia', inicio: '18:00', fim: '19:00', deslocamento: 15 }),
    id: 'academia',
  },
  {
    ...evento({ nome: 'Faculdade', inicio: '19:30', fim: '22:30', deslocamento: 25 }),
    id: 'faculdade',
  },
]

const PREVISAO_DE_DEMONSTRACAO = previsao([
  faixa('08:00', 17, 0.05),
  faixa('11:00', 21, 0.1),
  faixa('14:00', 24, 0.15),
  faixa('17:00', 23, 0.35),
  faixa('19:00', 19, 0.82),
  faixa('21:00', 15, 0.55),
])

// 1 --------------------------------------------------------------------------
describe('regra 1 — sobreposição', () => {
  it('detecta dois eventos que se cruzam', () => {
    const insights = gerarInsights(
      [
        evento({ nome: 'Reunião', inicio: '14:00', fim: '16:00' }),
        evento({ nome: 'Consulta', inicio: '15:00', fim: '17:00' }),
      ],
      null,
    )

    const conflito = insights.find((i) => i.tipo === 'conflito')
    expect(conflito).toBeDefined()
    expect(conflito?.nivel).toBe('critico')
    expect(conflito?.base).toContain('1h de sobreposição')
    expect(conflito?.eventos).toHaveLength(2)
  })

  it('não calcula margem em cima de uma sobreposição', () => {
    // A sobreposição já é o problema. Dois cartões críticos para o mesmo par
    // seriam ruído, e a correção é a mesma nos dois casos.
    const insights = gerarInsights(
      [
        evento({ nome: 'Reunião', inicio: '14:00', fim: '16:00' }),
        evento({ nome: 'Aula', inicio: '15:00', fim: '17:00', deslocamento: 30 }),
      ],
      null,
    )

    expect(insights.filter((i) => i.nivel === 'critico')).toHaveLength(1)
    expect(insights.some((i) => i.tipo === 'margem')).toBe(false)
  })
})

// 2 --------------------------------------------------------------------------
describe('regra 2 — margem vs. deslocamento', () => {
  it('margem negativa é crítica e sugere o horário real de saída', () => {
    const insights = gerarInsights(
      [
        evento({ nome: 'Trabalho', inicio: '09:00', fim: '12:00' }),
        evento({ nome: 'Consulta', inicio: '12:10', fim: '13:00', deslocamento: 25 }),
      ],
      null,
    )

    const margem = insights.find((i) => i.tipo === 'margem')
    expect(margem?.nivel).toBe('critico')
    expect(margem?.titulo).toContain('Não dá para chegar')
    expect(margem?.base).toContain('15min de atraso')
    // 12:10 menos 25min de caminho
    expect(margem?.sugestao).toContain('11:45')
  })

  // 3 ------------------------------------------------------------------------
  it('margem de 5 minutos é atenção e informa a sobra exata', () => {
    const insights = gerarInsights(
      [
        evento({ nome: 'Academia', inicio: '18:00', fim: '19:00' }),
        evento({ nome: 'Faculdade', inicio: '19:30', fim: '22:30', deslocamento: 25 }),
      ],
      null,
    )

    const margem = insights.find((i) => i.tipo === 'margem')
    expect(margem?.nivel).toBe('atencao')
    expect(margem?.titulo).toBe('Só 5min de sobra antes de Faculdade')
    expect(margem?.base).toContain('5min de sobra')
    expect(margem?.etiqueta).toBe('apertado')
  })

  it('margem confortável não gera insight', () => {
    const insights = gerarInsights(
      [
        evento({ nome: 'Trabalho', inicio: '09:00', fim: '12:00' }),
        evento({ nome: 'Consulta', inicio: '13:00', fim: '13:40', deslocamento: 25 }),
      ],
      null,
    )

    expect(insights.some((i) => i.tipo === 'margem')).toBe(false)
  })

  // 4 ------------------------------------------------------------------------
  it('30 minutos de vão sem deslocamento não gera nenhum insight', () => {
    // Evento remoto ou em casa: não existe caminho para não dar tempo de fazer.
    const insights = gerarInsights(
      [
        evento({ nome: 'Estudo', inicio: '09:00', fim: '10:00' }),
        evento({ nome: 'Reunião', inicio: '10:30', fim: '11:00' }),
      ],
      null,
    )

    expect(insights).toEqual([])
  })
})

// 5, 6, 7, 8 ----------------------------------------------------------------
describe('regra 3 — o que levar ao sair de casa', () => {
  it('chuva na janela fora de casa pede guarda-chuva', () => {
    // Sai às 17:45 e a chuva chega às 19:00: o usuário está na rua às 19:00.
    const insights = gerarInsights(
      [evento({ nome: 'Academia', inicio: '18:00', fim: '19:00', deslocamento: 15 })],
      previsao([faixa('17:00', 23, 0.35), faixa('19:00', 19, 0.82)]),
    )

    const preparo = insights.find((i) => i.tipo === 'preparo')
    expect(preparo?.nivel).toBe('info')
    expect(preparo?.titulo).toBe('Leve guarda-chuva')
    expect(preparo?.itens).toEqual([
      { nome: 'guarda-chuva', motivo: '82% de chuva por volta das 19:00' },
    ])
  })

  // 6 ------------------------------------------------------------------------
  it('tarde quente e seca não gera nenhum item', () => {
    // Proteção contra falso positivo: silêncio é resposta válida.
    const insights = gerarInsights(
      [evento({ nome: 'Trabalho', inicio: '14:00', fim: '17:00', deslocamento: 20 })],
      previsao([faixa('12:00', 30, 0), faixa('15:00', 29, 0.05)]),
    )

    expect(insights.some((i) => i.tipo === 'preparo')).toBe(false)
  })

  // 7 ------------------------------------------------------------------------
  it('dia inteiro em casa não gera item de preparo, mesmo com chuva forte', () => {
    const insights = gerarInsights(
      [
        evento({ nome: 'Trabalho', inicio: '09:00', fim: '12:00' }),
        evento({ nome: 'Estudo', inicio: '14:00', fim: '17:00' }),
      ],
      previsao([faixa('09:00', 14, 0.9), faixa('15:00', 13, 0.95)]),
    )

    expect(insights.some((i) => i.tipo === 'preparo')).toBe(false)
    expect(insights.some((i) => i.tipo === 'clima')).toBe(false)
  })

  // 8 ------------------------------------------------------------------------
  it('queda térmica de 8° partindo de 23° pede casaco leve', () => {
    const insights = gerarInsights(
      [evento({ nome: 'Faculdade', inicio: '18:00', fim: '22:30', deslocamento: 25 })],
      previsao([faixa('17:00', 23, 0), faixa('21:00', 15, 0)]),
    )

    const preparo = insights.find((i) => i.tipo === 'preparo')
    expect(preparo?.itens).toEqual([
      { nome: 'casaco leve', motivo: 'sai com 23° e volta com 15°' },
    ])
  })

  it('avisa da queda térmica mesmo quando a mínima não é fria', () => {
    // 20° não aciona o limiar de frio (17°), mas sair com 28° e voltar com 20°
    // é uma queda de 8° — é o caso que a regra da queda existe para pegar.
    const insights = gerarInsights(
      [evento({ nome: 'Faculdade', inicio: '18:00', fim: '22:30', deslocamento: 25 })],
      previsao([faixa('17:00', 28, 0), faixa('21:00', 20, 0)]),
    )

    const preparo = insights.find((i) => i.tipo === 'preparo')
    expect(preparo?.itens).toEqual([
      { nome: 'casaco leve', motivo: 'sai com 28° e volta com 20°' },
    ])
  })

  it('frio intenso pede casaco, não casaco leve', () => {
    const insights = gerarInsights(
      [evento({ nome: 'Aula', inicio: '19:00', fim: '22:00', deslocamento: 20 })],
      previsao([faixa('18:00', 13, 0), faixa('21:00', 10, 0)]),
    )

    expect(insights.find((i) => i.tipo === 'preparo')?.itens?.[0].nome).toBe('casaco')
  })

  it('junta chuva e frio em um único insight com título dinâmico', () => {
    const insights = gerarInsights(
      [evento({ nome: 'Faculdade', inicio: '19:30', fim: '22:30', deslocamento: 25 })],
      previsao([faixa('19:00', 19, 0.82), faixa('22:00', 14, 0.6)]),
    )

    const preparo = insights.filter((i) => i.tipo === 'preparo')
    expect(preparo).toHaveLength(1)
    expect(preparo[0].titulo).toBe('Leve guarda-chuva e casaco leve')
    expect(preparo[0].itens).toHaveLength(2)
  })

  it('declara no corpo que a volta é estimativa', () => {
    const insights = gerarInsights(
      [evento({ nome: 'Academia', inicio: '18:00', fim: '19:00', deslocamento: 15 })],
      previsao([faixa('17:00', 23, 0.6)]),
    )

    expect(insights.find((i) => i.tipo === 'preparo')?.corpo).toContain(
      'a volta é estimada com o mesmo tempo da ida',
    )
  })
})

// Regra 4 -------------------------------------------------------------------
describe('regra 4 — chuva atrapalhando o deslocamento', () => {
  it('sugere margem extra e não menciona guarda-chuva', () => {
    const insights = gerarInsights(
      [
        evento({ nome: 'Trabalho', inicio: '09:00', fim: '12:00' }),
        evento({ nome: 'Consulta', inicio: '14:00', fim: '16:00', deslocamento: 30 }),
      ],
      previsao([faixa('12:00', 20, 0.7)]),
    )

    const clima = insights.find((i) => i.tipo === 'clima')
    expect(clima?.nivel).toBe('info')
    expect(clima?.sugestao).toContain('10min mais cedo')
    expect(`${clima?.titulo} ${clima?.corpo} ${clima?.sugestao}`).not.toContain(
      'guarda-chuva',
    )
  })

  it('não repete o aviso quando a regra 2 já questionou a chegada', () => {
    // O usuário já tem um cartão dizendo que o trecho está apertado, e a
    // correção é a mesma: sair mais cedo.
    const insights = gerarInsights(
      [
        evento({ nome: 'Academia', inicio: '18:00', fim: '19:00' }),
        evento({ nome: 'Faculdade', inicio: '19:30', fim: '22:30', deslocamento: 25 }),
      ],
      previsao([faixa('19:00', 19, 0.82)]),
    )

    expect(insights.some((i) => i.tipo === 'margem')).toBe(true)
    expect(insights.some((i) => i.tipo === 'clima')).toBe(false)
  })
})

// Regra 5 -------------------------------------------------------------------
describe('regra 5 — carga do dia', () => {
  it('avisa a partir de 9h comprometidas', () => {
    const insights = gerarInsights(
      [
        evento({ nome: 'Trabalho', inicio: '08:00', fim: '13:00' }),
        evento({ nome: 'Projeto', inicio: '13:00', fim: '17:00' }),
      ],
      null,
    )

    const carga = insights.find((i) => i.tipo === 'carga')
    expect(carga?.nivel).toBe('atencao')
    expect(carga?.titulo).toBe('9h comprometidas hoje')
  })

  it('não avisa em um dia de 8h', () => {
    const insights = gerarInsights(
      [evento({ nome: 'Trabalho', inicio: '09:00', fim: '17:00' })],
      null,
    )

    expect(insights.some((i) => i.tipo === 'carga')).toBe(false)
  })
})

// Regra 6 -------------------------------------------------------------------
describe('regra 6 — janela livre', () => {
  it('reconhece 1h30 livres como algo bom', () => {
    const insights = gerarInsights(
      [
        evento({ nome: 'Almoço', inicio: '12:00', fim: '13:00' }),
        evento({ nome: 'Trabalho', inicio: '14:30', fim: '17:30' }),
      ],
      null,
    )

    const janela = insights.find((i) => i.tipo === 'janela')
    expect(janela?.nivel).toBe('bom')
    expect(janela?.titulo).toBe('1h30 livres depois de Almoço')
  })

  it('desconta o deslocamento do vão', () => {
    // 1h40 de vão menos 30min de caminho = 1h10, abaixo do mínimo de 1h30.
    const insights = gerarInsights(
      [
        evento({ nome: 'Trabalho', inicio: '09:00', fim: '12:00' }),
        evento({ nome: 'Aula', inicio: '13:40', fim: '15:00', deslocamento: 30 }),
      ],
      null,
    )

    expect(insights.some((i) => i.tipo === 'janela')).toBe(false)
  })
})

// 10 ------------------------------------------------------------------------
describe('regra 7 — transição entre dias', () => {
  it('avisa quando sobram menos de 7h entre chegar em casa e sair de novo', () => {
    const insights = insightsDeTransicao(
      [
        evento({ nome: 'Trabalho', inicio: '14:00', fim: '18:00' }),
        evento({ nome: 'Show', inicio: '20:00', fim: '23:00', deslocamento: 30 }),
      ],
      [evento({ nome: 'Aula', inicio: '05:00', fim: '09:00', deslocamento: 20 })],
    )

    expect(insights).toHaveLength(1)
    expect(insights[0].tipo).toBe('sono')
    expect(insights[0].nivel).toBe('atencao')
    // Chega 23:30, sai de casa 04:40 → 5h10
    expect(insights[0].titulo).toBe('Sobram 5h10 entre hoje e amanhã')
    expect(insights[0].base).toContain('chegada em casa às 23:30')
    expect(insights[0].base).toContain('saída de casa amanhã às 04:40')
  })

  it('fica em silêncio quando a noite é suficiente', () => {
    const insights = insightsDeTransicao(
      [evento({ nome: 'Faculdade', inicio: '19:00', fim: '22:00' })],
      [evento({ nome: 'Trabalho', inicio: '09:00', fim: '18:00' })],
    )

    expect(insights).toEqual([])
  })

  it('não inventa insight quando um dos dias está vazio', () => {
    const hoje = [evento({ nome: 'Show', inicio: '20:00', fim: '23:59' })]
    expect(insightsDeTransicao(hoje, [])).toEqual([])
    expect(insightsDeTransicao([], hoje)).toEqual([])
  })
})

// Ordenação e veredito ------------------------------------------------------
describe('ordenação', () => {
  it('ordena por nível: crítico, atenção, info, bom', () => {
    const insights = gerarInsights(DIA_DE_DEMONSTRACAO, PREVISAO_DE_DEMONSTRACAO)
    const niveis = insights.map((i) => i.nivel)
    const ordem = { critico: 0, atencao: 1, info: 2, bom: 3 }

    expect(niveis).toEqual([...niveis].sort((a, b) => ordem[a] - ordem[b]))
  })

  it('preserva a ordem de inserção dentro do mesmo nível', () => {
    // Margem entra no laço de pares, carga entra depois: ambas são atenção.
    const insights = gerarInsights(DIA_DE_DEMONSTRACAO, PREVISAO_DE_DEMONSTRACAO)
    const atencao = insights.filter((i) => i.nivel === 'atencao').map((i) => i.tipo)

    expect(atencao).toEqual(['margem', 'carga'])
  })
})

describe('vereditoDoDia', () => {
  it('crítico vence tudo', () => {
    const insights = gerarInsights(
      [
        evento({ nome: 'Reunião', inicio: '14:00', fim: '16:00' }),
        evento({ nome: 'Consulta', inicio: '15:00', fim: '17:00' }),
      ],
      null,
    )

    expect(vereditoDoDia(insights, 240)).toBe('Seu dia não fecha.')
  })

  it('margem torna o dia apertado', () => {
    const insights = gerarInsights(
      [
        evento({ nome: 'Academia', inicio: '18:00', fim: '19:00' }),
        evento({ nome: 'Faculdade', inicio: '19:30', fim: '22:30', deslocamento: 25 }),
      ],
      null,
    )

    expect(vereditoDoDia(insights, 240)).toBe('Seu dia está apertado.')
  })

  it('9h sem aperto deixa o dia cheio', () => {
    expect(vereditoDoDia([], 9 * 60)).toBe('Seu dia está cheio.')
  })

  it('dia sem nada é dia vazio', () => {
    expect(vereditoDoDia([], 0)).toBe('Seu dia está vazio.')
  })

  it('o resto é tranquilo', () => {
    expect(vereditoDoDia([], 180)).toBe('Seu dia está tranquilo.')
  })
})

describe('resumoDoDia', () => {
  it('soma as horas de compromisso e os vãos entre eles', () => {
    const { comprometido, emAberto } = resumoDoDia(DIA_DE_DEMONSTRACAO)

    expect(comprometido).toBe(11 * 60) // 11h
    expect(emAberto).toBe(150) // 2h30
  })

  it('devolve zero para um dia vazio', () => {
    expect(resumoDoDia([])).toEqual({ comprometido: 0, emAberto: 0 })
  })
})

// Cenário de demonstração ---------------------------------------------------
describe('cenário de demonstração da seção 15', () => {
  it('produz exatamente os 4 insights esperados', () => {
    const insights = gerarInsights(DIA_DE_DEMONSTRACAO, PREVISAO_DE_DEMONSTRACAO)

    expect(insights.map((i) => i.tipo)).toEqual(['margem', 'carga', 'preparo', 'janela'])
    expect(insights.map((i) => i.nivel)).toEqual(['atencao', 'atencao', 'info', 'bom'])
  })

  it('nenhum crítico de propósito, para o avaliador criar um ao vivo', () => {
    const insights = gerarInsights(DIA_DE_DEMONSTRACAO, PREVISAO_DE_DEMONSTRACAO)
    expect(insights.some((i) => i.nivel === 'critico')).toBe(false)
  })

  it('um evento entre 18:00 e 19:00 cria o conflito ao vivo', () => {
    const insights = gerarInsights(
      [
        ...DIA_DE_DEMONSTRACAO,
        evento({ nome: 'Dentista', inicio: '18:00', fim: '19:00', deslocamento: 20 }),
      ],
      PREVISAO_DE_DEMONSTRACAO,
    )

    expect(insights.some((i) => i.nivel === 'critico')).toBe(true)
    expect(vereditoDoDia(insights, 11 * 60)).toBe('Seu dia não fecha.')
  })

  it('o veredito do dia é "Seu dia está apertado."', () => {
    const insights = gerarInsights(DIA_DE_DEMONSTRACAO, PREVISAO_DE_DEMONSTRACAO)
    const { comprometido } = resumoDoDia(DIA_DE_DEMONSTRACAO)

    expect(vereditoDoDia(insights, comprometido)).toBe('Seu dia está apertado.')
  })

  it('o preparo do dia junta guarda-chuva e casaco leve', () => {
    const insights = gerarInsights(DIA_DE_DEMONSTRACAO, PREVISAO_DE_DEMONSTRACAO)
    const preparo = insights.find((i) => i.tipo === 'preparo')

    expect(preparo?.titulo).toBe('Leve guarda-chuva e casaco leve')
    expect(preparo?.itens).toEqual([
      { nome: 'guarda-chuva', motivo: '82% de chuva por volta das 19:00' },
      { nome: 'casaco leve', motivo: 'sai com 23° e volta com 15°' },
    ])
    expect(preparo?.base).toContain('fora de casa das 17:45 às 22:55')
  })

  it('segue analisando sem clima, perdendo só as regras 3 e 4', () => {
    const semClima = gerarInsights(DIA_DE_DEMONSTRACAO, null)

    expect(semClima.map((i) => i.tipo)).toEqual(['margem', 'carga', 'janela'])
  })
})
