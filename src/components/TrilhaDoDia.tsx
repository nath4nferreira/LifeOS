import type { CSSProperties, ReactNode } from 'react'
import type { EventoBase } from '../types'
import { MARGEM_CONFORTAVEL, margemAntes } from '../core/insights'
import { marcadorDoAgora, progressoNoEvento } from '../core/trilha'
import { duracao, formatarDuracao, paraHorario } from '../utils/tempo'
import './TrilhaDoDia.css'

const PX_POR_MINUTO = 0.5
const ALTURA_MINIMA_EVENTO = 52
const ALTURA_MINIMA_VAO = 26
const ALTURA_MAXIMA_VAO = 96

interface TrilhaDoDiaProps {
  /** Já ordenados por horário de início — é o que `eventosDoDia` garante. */
  eventos: EventoBase[]
  /** Recebe o id do evento tocado. Sem isto a trilha é só leitura. */
  aoEditar?: (id: string) => void
  /**
   * Minutos desde a meia-noite, ou `null` quando o dia na tela não é hoje.
   * O marcador só existe no dia de hoje: desenhar "agora" sobre o dia de
   * amanhã seria afirmar uma coisa que não é verdade.
   */
  agora?: number | null
}

/**
 * O dia desenhado em escala: cada bloco de evento tem altura proporcional à
 * duração, e cada vão entre eventos também. Um bloco de 3h fica visivelmente
 * maior que um de 30min, e um intervalo apertado aparece fisicamente
 * estreito — a pressão do dia fica legível antes da leitura. É onde o
 * produto gasta a ousadia visual que a seção 11 do briefing pede.
 */
export function TrilhaDoDia({ eventos, aoEditar, agora = null }: TrilhaDoDiaProps) {
  const itens: ReactNode[] = []
  // O marcador carrega o minuto a que se refere. Sem isso, `agora` continuaria
  // `number | null` lá embaixo e cada uso pediria uma asserção de tipo.
  const marcador =
    agora === null ? null : { ...marcadorDoAgora(eventos, agora), agora }

  eventos.forEach((evento, indice) => {
    if (indice > 0) {
      const anterior = eventos[indice - 1]
      const vao = duracao(anterior.fim, evento.inicio)
      // Vão zero (eventos encostados) não ocupa espaço próprio na trilha.
      if (vao > 0) {
        itens.push(<VaoTrilha key={`vao-${evento.id}`} seguinte={evento} vao={vao} />)
      }
    }
    // Quando o agora cai num vão, a linha entra antes do próximo evento — e
    // depois do vão, para ficar colada no que ainda vai acontecer.
    if (marcador?.tipo === 'entre' && marcador.indice === indice) {
      itens.push(<LinhaDoAgora key="agora" agora={marcador.agora} />)
    }
    itens.push(
      <EventoTrilha
        key={evento.id}
        evento={evento}
        aoEditar={aoEditar}
        agora={
          marcador?.tipo === 'durante' && marcador.indice === indice
            ? marcador.agora
            : null
        }
      />,
    )
  })

  // O dia já acabou: a linha fecha a lista em vez de sumir.
  if (marcador?.tipo === 'entre' && marcador.indice === eventos.length) {
    itens.push(<LinhaDoAgora key="agora" agora={agora as number} />)
  }

  return (
    <section className="trilha" aria-labelledby="trilha-titulo">
      <h2 id="trilha-titulo" className="trilha-titulo">
        Seu dia em escala
      </h2>
      {/* Dia vazio não é a mesma coisa que tela quebrada (heurística 1): o
          texto diz que está vazio de propósito, e diz o que fazer com isso. */}
      {eventos.length === 0 ? (
        <p className="trilha-vazia">
          Nenhum compromisso neste dia. O dia inteiro é seu.
        </p>
      ) : (
        <ol className="trilha-lista">{itens}</ol>
      )}
    </section>
  )
}

function EventoTrilha({
  evento,
  aoEditar,
  agora,
}: {
  evento: EventoBase
  aoEditar?: (id: string) => void
  /** Não-nulo só no evento que está acontecendo agora. */
  agora: number | null
}) {
  const minutos = duracao(evento.inicio, evento.fim)
  const altura = Math.max(ALTURA_MINIMA_EVENTO, minutos * PX_POR_MINUTO)
  const emCurso = agora !== null
  const estilo = {
    '--altura-trilha': `${altura}px`,
    // Como a trilha é em escala, a linha cai no ponto proporcional do bloco:
    // três horas de aula com dez minutos decorridos mostram a linha no alto.
    ...(emCurso && { '--progresso': `${progressoNoEvento(evento, agora) * 100}%` }),
  } as CSSProperties

  const conteudo = (
    <>
      <span className="trilha-evento-hora">{evento.inicio}</span>
      <span className="trilha-evento-corpo">
        <span className="trilha-evento-nome">
          {evento.nome}
          {/* Cor e linha nunca sozinhas: o estado também é texto. */}
          {emCurso && <span className="trilha-evento-agora"> agora</span>}
        </span>
        <span className="trilha-evento-duracao">{formatarDuracao(minutos)}</span>
      </span>
    </>
  )

  return (
    <li className="trilha-evento" data-em-curso={emCurso || undefined} style={estilo}>
      {emCurso && <span className="trilha-evento-linha" aria-hidden="true" />}
      {/* O bloco inteiro é o alvo de toque, não um ícone de lápis de 16px: a
          altura já vem da duração, então o alvo nunca fica abaixo dos 44px.
          `<button>` de verdade porque precisa ser focável e acionável pelo
          teclado — um `<li>` com `onClick` não é nem uma coisa nem outra. */}
      {aoEditar ? (
        <button
          type="button"
          className="trilha-evento-botao"
          onClick={() => aoEditar(evento.id)}
        >
          {conteudo}
          <span className="apenas-leitor-de-tela">
            {' '}
            — editar, das {evento.inicio} às {evento.fim}
          </span>
        </button>
      ) : (
        conteudo
      )}
    </li>
  )
}

/**
 * O agora quando ele cai num vão — entre dois compromissos, antes do primeiro
 * ou depois do último.
 *
 * O horário aparece escrito na mesma coluna dos horários dos eventos, para ser
 * lido junto com eles: "são 14:32, o próximo é às 15:00" se responde só de
 * olhar a coluna, sem contar nada.
 */
function LinhaDoAgora({ agora }: { agora: number }) {
  return (
    <li className="trilha-agora">
      <span className="trilha-agora-hora">{paraHorario(agora)}</span>
      <span className="trilha-agora-risco" aria-hidden="true" />
      <span className="trilha-agora-rotulo">agora</span>
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
