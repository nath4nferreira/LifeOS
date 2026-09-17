import { formatarDuracao } from '../utils/tempo'
import './Veredito.css'

interface VereditoProps {
  texto: string // vindo de vereditoDoDia — a frase pronta
  comprometido: number // minutos
  emAberto: number // minutos
  pontos: number // quantos insights o motor gerou para o dia
}

/**
 * O elemento principal da tela: o produto falando em uma linha, não uma
 * saudação. "Good morning" não carrega informação nenhuma; o veredito é a
 * leitura do dia que o motor de insights já calculou.
 */
export function Veredito({ texto, comprometido, emAberto, pontos }: VereditoProps) {
  return (
    <section className="veredito" aria-labelledby="veredito-titulo">
      <h1 id="veredito-titulo" className="veredito-titulo">
        {texto}
      </h1>
      <p className="veredito-resumo">
        <span className="veredito-numero">{formatarDuracao(comprometido)}</span> comprometidas
        {' · '}
        <span className="veredito-numero">{formatarDuracao(emAberto)}</span> em aberto
        {' · '}
        <span className="veredito-numero">{pontos}</span> {pontos === 1 ? 'ponto' : 'pontos'}
      </p>
    </section>
  )
}
