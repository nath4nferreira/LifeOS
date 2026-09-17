import type { EventoBase, Previsao } from '../types'
import { ROTULO_CATEGORIA } from '../types'
import { cargaPorArea } from '../core/insights'
import type { EstadoDoClima } from '../hooks/usePrevisao'
import { formatarDuracao, paraMinutos } from '../utils/tempo'
import './PainelDeContexto.css'

interface PainelDeContextoProps {
  previsao: Previsao | null
  estado: EstadoDoClima
  /** Já filtrados pelo dia visível — é o que `eventosDoDia` entrega. */
  eventos: EventoBase[]
  /** Minutos desde a meia-noite, ou `null` se o dia na tela não é hoje. */
  agora: number | null
}

/**
 * A terceira coluna do desktop: o contexto que o motor usou, aberto.
 *
 * Não é decoração de tela grande. As regras 3 e 4 leem a previsão faixa a
 * faixa e o veredito soma as horas do dia; aqui esses dois números aparecem
 * inteiros, em vez de resumidos numa frase. É o que torna o insight
 * auditável: dá para conferir de onde veio "leve guarda-chuva" sem abrir o
 * DevTools.
 *
 * Existe só a partir de 1025px porque é informação de apoio. No mobile ela
 * competiria com a trilha, que é o que a pessoa veio ver.
 */
export function PainelDeContexto({
  previsao,
  estado,
  eventos,
  agora,
}: PainelDeContextoProps) {
  const areas = cargaPorArea(eventos)

  return (
    <aside className="contexto" aria-label="Contexto do dia">
      <section className="contexto-bloco" aria-labelledby="contexto-clima">
        <h2 id="contexto-clima" className="contexto-titulo">
          Clima por faixa
        </h2>
        {previsao ? (
          <ol className="contexto-lista">
            {previsao.horas.map((faixa) => (
              <li
                className="contexto-faixa"
                key={faixa.hora}
                data-agora={faixaAtual(previsao, agora) === faixa.hora || undefined}
              >
                <span className="contexto-faixa-hora">{faixa.hora}</span>
                <span className="contexto-faixa-temp">{faixa.temp}°</span>
                {/* A barra é redundante de propósito: quem não a enxerga lê a
                    porcentagem ao lado, que diz exatamente a mesma coisa. */}
                <span className="contexto-barra" aria-hidden="true">
                  <span
                    className="contexto-barra-preenchida"
                    style={{ width: `${Math.round(faixa.chuva * 100)}%` }}
                  />
                </span>
                <span className="contexto-faixa-chuva">
                  {Math.round(faixa.chuva * 100)}%
                  <span className="apenas-leitor-de-tela"> de chance de chuva</span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="contexto-vazio">
            {estado === 'carregando'
              ? 'Buscando a previsão…'
              : 'Sem previsão: as regras de chuva e temperatura não rodaram hoje.'}
          </p>
        )}
      </section>

      <section className="contexto-bloco" aria-labelledby="contexto-areas">
        <h2 id="contexto-areas" className="contexto-titulo">
          Horas por área
        </h2>
        {areas.length > 0 ? (
          <ol className="contexto-lista">
            {areas.map((area) => (
              <li className="contexto-area" key={area.categoria}>
                <span className="contexto-area-nome">
                  {ROTULO_CATEGORIA[area.categoria]}
                </span>
                <span className="contexto-barra" aria-hidden="true">
                  <span
                    className="contexto-barra-preenchida"
                    style={{ width: `${Math.round(area.fracao * 100)}%` }}
                  />
                </span>
                <span className="contexto-area-total">
                  {formatarDuracao(area.minutos)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="contexto-vazio">Nenhum compromisso para somar.</p>
        )}
      </section>
    </aside>
  )
}

/**
 * A faixa em que o agora cai: a última que já começou.
 *
 * Deduzida da lista em vez de assumir blocos de 3h — o plano gratuito da
 * OpenWeather entrega 3h, mas essa é a grade deles, não um fato do domínio.
 */
function faixaAtual(previsao: Previsao, agora: number | null): string | null {
  if (agora === null) return null
  const comecadas = previsao.horas.filter((faixa) => paraMinutos(faixa.hora) <= agora)
  return comecadas.length > 0 ? comecadas[comecadas.length - 1].hora : null
}
