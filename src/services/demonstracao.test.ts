import { describe, expect, it } from 'vitest'
import { gerarInsights, insightsDeTransicao, resumoDoDia, vereditoDoDia } from '../core/insights'
import { eventosDoDia } from '../core/seletor'
import { formatarDuracao, somarDias } from '../utils/tempo'
import { PREVISAO_DE_DEMONSTRACAO, eventosDeDemonstracao } from './demonstracao'

/**
 * O dia de demonstração é o que o vídeo de entrega mostra. Se ele parar de
 * produzir exatamente os 4 insights da seção 15 do briefing, a demonstração
 * deixou de bater com o documento — e isso precisa quebrar um teste, não
 * aparecer na gravação.
 */
describe('dia de demonstração', () => {
  // Uma quinta-feira e um sábado: a montagem precisa funcionar nos dois, porque
  // ninguém controla em que dia o avaliador abre o app.
  it.each(['2026-09-17', '2026-09-19'])('fecha na seção 15 quando hoje é %s', (hoje) => {
    const eventos = eventosDoDia(eventosDeDemonstracao(hoje), hoje)

    expect(eventos.map((e) => e.nome)).toEqual([
      'Trabalho',
      'Almoço',
      'Trabalho',
      'Academia',
      'Faculdade',
    ])

    const { comprometido, emAberto } = resumoDoDia(eventos)
    expect(formatarDuracao(comprometido)).toBe('11h')
    expect(formatarDuracao(emAberto)).toBe('2h30')

    const insights = gerarInsights(eventos, PREVISAO_DE_DEMONSTRACAO)
    expect(insights.map((i) => i.tipo)).toEqual(['margem', 'carga', 'preparo', 'janela'])
    expect(vereditoDoDia(insights, comprometido)).toBe('Seu dia está apertado.')

    const preparo = insights.find((i) => i.tipo === 'preparo')
    expect(preparo?.titulo).toBe('Leve guarda-chuva e casaco leve')
    expect(preparo?.itens?.map((i) => i.motivo)).toEqual([
      '82% de chuva por volta das 19:00',
      'sai com 23° e volta com 15°',
    ])
  })

  it('o voo pontual de amanhã aciona a regra de sono', () => {
    const hoje = '2026-09-17'
    const todos = eventosDeDemonstracao(hoje)

    const amanha = eventosDoDia(todos, somarDias(hoje, 1))
    expect(amanha.map((e) => e.nome)).toContain('Voo para Recife')

    const [sono] = insightsDeTransicao(eventosDoDia(todos, hoje), amanha)
    expect(sono.tipo).toBe('sono')
    // Chega em casa 22:30 + 25min = 22:55; sai 06:00 − 60min = 05:00.
    expect(sono.titulo).toBe('Sobram 6h05 entre hoje e amanhã')
  })

  it('não gera nada fora da validade do semestre', () => {
    const hoje = '2026-09-17'
    const muitoDepois = somarDias(hoje, 200)
    expect(eventosDoDia(eventosDeDemonstracao(hoje), muitoDepois)).toEqual([])
  })
})
