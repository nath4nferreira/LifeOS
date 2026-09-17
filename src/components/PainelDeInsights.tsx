import { useState } from 'react'
import type { Insight } from '../types'
import { CartaoInsight } from './CartaoInsight'
import './PainelDeInsights.css'

/** Heurística 8: no máximo dois cartões no painel, o resto atrás de um botão. */
const VISIVEIS_POR_PADRAO = 2

interface PainelDeInsightsProps {
  insights: Insight[] // já ordenados por nível pelo motor
  dispensados: string[]
  aoDispensar: (id: string) => void
  aoRestaurar: () => void
  /** Título da seção. O painel do dia e a aba de alertas usam textos diferentes. */
  titulo?: string
  /** Na aba de alertas não faz sentido esconder nada atrás de "ver outros". */
  mostrarTodos?: boolean
}

/**
 * "O que merece atenção" — a lista de leituras do dia.
 *
 * Dois pontos de usabilidade governam este componente:
 *
 * - **Minimalismo (heurística 8):** dois cartões no máximo. Um painel com seis
 *   avisos não é mais informativo, é mais barulhento; o motor já ordenou do
 *   mais grave ao melhor, então os dois primeiros são os que importam.
 * - **Controle e liberdade (heurística 3):** dispensar é reversível e o
 *   desfazer fica na tela, não em um menu. A confirmação vai por `aria-live`
 *   para quem usa leitor de tela perceber que algo saiu da lista.
 */
export function PainelDeInsights({
  insights,
  dispensados,
  aoDispensar,
  aoRestaurar,
  titulo = 'O que merece atenção',
  mostrarTodos = false,
}: PainelDeInsightsProps) {
  const [expandido, setExpandido] = useState(false)

  const ativos = insights.filter((i) => !dispensados.includes(i.id))
  const vendoTudo = mostrarTodos || expandido
  const visiveis = vendoTudo ? ativos : ativos.slice(0, VISIVEIS_POR_PADRAO)
  const escondidos = ativos.length - visiveis.length

  const quantosDispensados = insights.filter((i) => dispensados.includes(i.id)).length

  return (
    <section className="painel" aria-labelledby="painel-titulo">
      <h2 id="painel-titulo" className="painel-titulo">
        {titulo}
      </h2>

      {ativos.length === 0 ? (
        <p className="painel-vazio">
          {insights.length === 0
            ? 'Nada a apontar neste dia. Silêncio também é resposta.'
            : 'Você já viu tudo que havia para hoje.'}
        </p>
      ) : (
        <ul className="painel-lista">
          {visiveis.map((insight) => (
            <li key={insight.id}>
              <CartaoInsight insight={insight} aoManterComoEsta={(i) => aoDispensar(i.id)} />
            </li>
          ))}
        </ul>
      )}

      {escondidos > 0 && (
        <button type="button" className="painel-mais" onClick={() => setExpandido(true)}>
          Ver outros {escondidos}
        </button>
      )}

      {/* Visibilidade do estado (heurística 1) + desfazer (heurística 3). */}
      <div className="painel-desfazer" role="status" aria-live="polite">
        {quantosDispensados > 0 && (
          <>
            <span className="painel-desfazer-texto">
              {quantosDispensados === 1
                ? '1 insight dispensado.'
                : `${quantosDispensados} insights dispensados.`}
            </span>
            <button type="button" className="painel-desfazer-acao" onClick={aoRestaurar}>
              Trazer de volta
            </button>
          </>
        )}
      </div>
    </section>
  )
}
