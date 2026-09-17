import { describe, expect, it } from 'vitest'
import { normalizarPrevisao, type RespostaOpenWeather } from './openweather'

function faixa(dt_txt: string, temp: number, pop: number, description = 'nublado') {
  return { dt_txt, main: { temp }, weather: [{ description }], pop }
}

const resposta: RespostaOpenWeather = {
  city: { name: 'São Paulo' },
  list: [
    faixa('2026-09-17 09:00:00', 23.4, 0.1, 'céu limpo'),
    faixa('2026-09-17 12:00:00', 24.6, 0.2, 'nublado'),
    faixa('2026-09-17 18:00:00', 18.2, 0.82, 'chuva moderada'),
    faixa('2026-09-18 09:00:00', 15.5, 0),
  ],
}

describe('normalizarPrevisao', () => {
  it('fica só com as faixas do dia pedido', () => {
    const previsao = normalizarPrevisao(resposta, '2026-09-17')
    expect(previsao?.horas).toEqual([
      { hora: '09:00', temp: 23, chuva: 0.1 },
      { hora: '12:00', temp: 25, chuva: 0.2 },
      { hora: '18:00', temp: 18, chuva: 0.82 },
    ])
  })

  it('a leitura de referência é a faixa mais próxima do meio-dia', () => {
    // Não é a primeira faixa nem "agora": é a que melhor representa o dia, e
    // vale igual para hoje e para depois de amanhã.
    expect(normalizarPrevisao(resposta, '2026-09-17')).toMatchObject({
      local: 'São Paulo',
      tempAtual: 25,
      condicaoAtual: 'nublado',
    })
  })

  it('escolhe a mais próxima mesmo quando não existe faixa de meio-dia', () => {
    const tarde: RespostaOpenWeather = {
      city: { name: 'Recife' },
      list: [faixa('2026-09-17 15:00:00', 30, 0, 'sol'), faixa('2026-09-17 21:00:00', 22, 0)],
    }
    expect(normalizarPrevisao(tarde, '2026-09-17')?.condicaoAtual).toBe('sol')
  })

  it('dia fora do alcance da API vira null, igual a uma falha', () => {
    expect(normalizarPrevisao(resposta, '2026-10-01')).toBeNull()
  })

  it('não quebra com resposta vazia ou sem os campos opcionais', () => {
    expect(normalizarPrevisao({}, '2026-09-17')).toBeNull()
    expect(normalizarPrevisao({ list: [] }, '2026-09-17')).toBeNull()

    const magra: RespostaOpenWeather = { list: [{ dt_txt: '2026-09-17 12:00:00' }] }
    expect(normalizarPrevisao(magra, '2026-09-17')).toEqual({
      local: 'seu local',
      tempAtual: 0,
      condicaoAtual: 'sem descrição',
      horas: [{ hora: '12:00', temp: 0, chuva: 0 }],
    })
  })

  it('não confunde 2026-09-1 com 2026-09-17', () => {
    // Sem o espaço no prefixo, "2026-09-1" casaria com todo o dia 17.
    expect(normalizarPrevisao(resposta, '2026-09-1')).toBeNull()
  })
})
