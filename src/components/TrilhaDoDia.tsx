import type { CSSProperties, ReactNode } from 'react'
import type { EventoBase } from '../types'
import { MARGEM_CONFORTAVEL, margemAntes } from '../core/insights'
import { duracao, formatarDuracao } from '../utils/tempo'
import './TrilhaDoDia.css'

const PX_POR_MINUTO = 0.5
const ALTURA_MINIMA_EVENTO = 52
const ALTURA_MINIMA_VAO = 26
const ALTURA_MAXIMA_VAO = 96

interface TrilhaDoDiaProps {
  /** Já ordenados por horário de início — é o que `eventosDoDia` garante. */
  eventos: EventoBase[]
}

/**
 * O dia desenhado em escala: cada bloco de evento tem altura proporcional à
 * duração, e cada vão entre eventos também. Um bloco de 3h fica visivelmente
 * maior que um de 30min, e um intervalo apertado aparece fisicamente
 * estreito — a pressão do dia fica legível antes da leitura. É onde o
 * produto gasta a ousadia visual que a seção 11 do briefing pede.
 */
export function TrilhaDoDia({ eventos }: TrilhaDoDiaProps) {
  const itens: ReactNode[] = []

  eventos.forEach((evento, indice) => {
    if (indice > 0) {
      const anterior = eventos[indice - 1]
      const vao = duracao(anterior.fim, evento.inicio)
      // Vão zero (eventos encostados) não ocupa espaço próprio na trilha.
      if (vao > 0) {
        itens.push(<VaoTrilha key={`vao-${evento.id}`} seguinte={evento} vao={vao} />)
      }
    }
    itens.push(<EventoTrilha key={evento.id} evento={evento} />)
  })

  return (
    <section className="trilha" aria-labelledby="trilha-titulo">
      <h2 id="trilha-titulo" className="trilha-titulo">
        Seu dia em escala
      </h2>
      <ol className="trilha-lista">{itens}</ol>
    </section>
  )
}

function EventoTrilha({ evento }: { evento: EventoBase }) {
  const minutos = duracao(evento.inicio, evento.fim)
  const altura = Math.max(ALTURA_MINIMA_EVENTO, minutos * PX_POR_MINUTO)
  const estilo = { '--altura-trilha': `${altura}px` } as CSSProperties

  return (
    <li className="trilha-evento" style={estilo}>
      <span className="trilha-evento-hora">{evento.inicio}</span>
      <span className="trilha-evento-corpo">
        <span className="trilha-evento-nome">{evento.nome}</span>
        <span className="trilha-evento-duracao">{formatarDuracao(minutos)}</span>
      </span>
    </li>
  )
}

function VaoTrilha({ seguinte, vao }: { seguinte: EventoBase; vao: number }) {
  const altura = Math.min(ALTURA_MAXIMA_VAO, Math.max(ALTURA_MINIMA_VAO, vao * PX_POR_MINUTO))
  const estilo = { '--altura-trilha': `${altura}px` } as CSSProperties

  const margem = margemAntes(seguinte, vao)
  const apertado = margem !== null && margem < MARGEM_CONFORTAVEL

  const texto =
    seguinte.deslocamento > 0
      ? `${formatarDuracao(vao)}, ${formatarDuracao(seguinte.deslocamento)} de ida`
      : `${formatarDuracao(vao)} livres`

  return (
    <li className="trilha-vao" data-apertado={apertado || undefined} style={estilo}>
      <span className="trilha-vao-hora" aria-hidden="true" />
      <span className="trilha-vao-texto">
        {texto}
        {apertado && <strong className="trilha-vao-aviso"> · margem apertada</strong>}
      </span>
    </li>
  )
}
