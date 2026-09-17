import { describe, expect, it } from 'vitest'
import {
  dataValida,
  diaDaSemana,
  duracao,
  formatarDataCurta,
  formatarDuracao,
  horarioValido,
  paraHorario,
  paraMinutos,
  rotuloDoDia,
  somarDias,
} from './tempo'

describe('horarioValido', () => {
  it('aceita HH:MM de 24 horas', () => {
    expect(horarioValido('00:00')).toBe(true)
    expect(horarioValido('19:30')).toBe(true)
    expect(horarioValido('23:59')).toBe(true)
  })

  it('recusa hora ou minuto fora da faixa', () => {
    expect(horarioValido('24:00')).toBe(false)
    expect(horarioValido('19:60')).toBe(false)
  })

  it('recusa formato diferente de HH:MM', () => {
    expect(horarioValido('9:30')).toBe(false)
    expect(horarioValido('19h30')).toBe(false)
    expect(horarioValido('')).toBe(false)
  })
})

describe('dataValida', () => {
  it('aceita data ISO existente', () => {
    expect(dataValida('2026-09-17')).toBe(true)
    expect(dataValida('2024-02-29')).toBe(true) // ano bissexto
  })

  it('recusa data que não existe no calendário', () => {
    expect(dataValida('2026-02-30')).toBe(false)
    expect(dataValida('2026-13-01')).toBe(false)
    expect(dataValida('2025-02-29')).toBe(false) // não bissexto
  })

  it('recusa formato diferente de AAAA-MM-DD', () => {
    expect(dataValida('17/09/2026')).toBe(false)
    expect(dataValida('2026-9-17')).toBe(false)
  })
})

describe('paraMinutos', () => {
  it('converte horário em minutos desde a meia-noite', () => {
    expect(paraMinutos('00:00')).toBe(0)
    expect(paraMinutos('09:00')).toBe(540)
    expect(paraMinutos('19:30')).toBe(1170)
    expect(paraMinutos('23:59')).toBe(1439)
  })

  it('lança em horário inválido, porque o dado vem do formulário', () => {
    expect(() => paraMinutos('25:00')).toThrow(/Horário inválido/)
  })
})

describe('paraHorario', () => {
  it('converte minutos em horário', () => {
    expect(paraHorario(0)).toBe('00:00')
    expect(paraHorario(1170)).toBe('19:30')
    expect(paraHorario(1439)).toBe('23:59')
  })

  it('dá a volta quando o cálculo atravessa a meia-noite', () => {
    expect(paraHorario(1500)).toBe('01:00')
    expect(paraHorario(-30)).toBe('23:30')
  })
})

describe('duracao', () => {
  it('mede o intervalo entre dois horários', () => {
    expect(duracao('09:00', '12:00')).toBe(180)
    expect(duracao('18:00', '19:00')).toBe(60)
  })

  it('devolve negativo quando o fim vem antes do início', () => {
    expect(duracao('19:00', '18:00')).toBe(-60)
  })

  it('serve para medir o vão entre eventos consecutivos', () => {
    // Academia termina 19:00, faculdade começa 19:30 → 30min de vão
    expect(duracao('19:00', '19:30')).toBe(30)
  })
})

describe('formatarDuracao', () => {
  it('usa minutos abaixo de uma hora', () => {
    expect(formatarDuracao(0)).toBe('0min')
    expect(formatarDuracao(5)).toBe('5min')
    expect(formatarDuracao(45)).toBe('45min')
  })

  it('omite os minutos quando a hora é exata', () => {
    expect(formatarDuracao(60)).toBe('1h')
    expect(formatarDuracao(660)).toBe('11h')
  })

  it('combina hora e minuto com dois dígitos', () => {
    expect(formatarDuracao(90)).toBe('1h30')
    expect(formatarDuracao(150)).toBe('2h30')
    expect(formatarDuracao(65)).toBe('1h05')
  })

  it('preserva o sinal de valores negativos', () => {
    expect(formatarDuracao(-15)).toBe('-15min')
    expect(formatarDuracao(-90)).toBe('-1h30')
  })
})

describe('diaDaSemana', () => {
  it('usa 0=domingo … 6=sábado', () => {
    expect(diaDaSemana('2026-09-13')).toBe(0) // domingo
    expect(diaDaSemana('2026-09-17')).toBe(4) // quinta
    expect(diaDaSemana('2026-09-19')).toBe(6) // sábado
  })

  it('não depende do fuso de quem executa', () => {
    // Calculado em UTC: a data nunca "volta um dia" em fuso negativo.
    expect(diaDaSemana('2026-01-01')).toBe(4) // quinta
  })
})

describe('somarDias', () => {
  it('avança um dia', () => {
    expect(somarDias('2026-09-17', 1)).toBe('2026-09-18')
  })

  it('atravessa virada de mês e de ano', () => {
    expect(somarDias('2026-09-30', 1)).toBe('2026-10-01')
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('aceita valor negativo', () => {
    expect(somarDias('2026-09-17', -1)).toBe('2026-09-16')
    expect(somarDias('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('respeita ano bissexto', () => {
    expect(somarDias('2024-02-28', 1)).toBe('2024-02-29')
    expect(somarDias('2025-02-28', 1)).toBe('2025-03-01')
  })
})

describe('formatarDataCurta', () => {
  it('formata como na faixa de status', () => {
    expect(formatarDataCurta('2026-09-17')).toBe('qui 17 set')
    expect(formatarDataCurta('2026-01-05')).toBe('seg 5 jan')
  })
})

describe('rotuloDoDia', () => {
  const hoje = '2026-09-17'

  it('dá nome aos três dias vizinhos', () => {
    expect(rotuloDoDia('2026-09-16', hoje)).toBe('Ontem')
    expect(rotuloDoDia(hoje, hoje)).toBe('Hoje')
    expect(rotuloDoDia('2026-09-18', hoje)).toBe('Amanhã')
  })

  it('o resto é data mesmo', () => {
    expect(rotuloDoDia('2026-09-19', hoje)).toBe('sáb 19 set')
    expect(rotuloDoDia('2026-09-15', hoje)).toBe('ter 15 set')
  })

  it('funciona na virada do mês e do ano', () => {
    expect(rotuloDoDia('2026-10-01', '2026-09-30')).toBe('Amanhã')
    expect(rotuloDoDia('2025-12-31', '2026-01-01')).toBe('Ontem')
  })
})
