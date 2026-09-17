import type { Insight } from '../types'
import './CartaoInsight.css'

interface CartaoInsightProps {
  insight: Insight
  /** Some quando não há como dispensar (na lista de dispensados, por exemplo). */
  aoManterComoEsta?: (insight: Insight) => void
}

/**
 * Um insight apresentado como leitura do dia, não como alerta de sistema.
 *
 * Três decisões de produto moram aqui:
 *
 * 1. **A etiqueta textual acompanha a cor** ("apertado", "conflito", "levar").
 *    Cor nunca é a única pista — WCAG 1.4.1.
 * 2. **`base` fica sempre visível**, em mono, como os números de uma tabela de
 *    horário. É a heurística 6: o usuário reconhece de onde o insight veio em
 *    vez de ter que confiar. O LifeOS não deve parecer mágica.
 * 3. **"Manter como está" é um botão de verdade**, do mesmo tamanho e peso da
 *    sugestão. O app propõe, o usuário decide — recusar precisa ser tão
 *    visível quanto aceitar (heurística 3).
 */
export function CartaoInsight({ insight, aoManterComoEsta }: CartaoInsightProps) {
  const tituloId = `insight-${insight.id}-titulo`

  return (
    <article className="cartao" data-nivel={insight.nivel} aria-labelledby={tituloId}>
      <p className="cartao-etiqueta">{insight.etiqueta}</p>

      <h3 id={tituloId} className="cartao-titulo">
        {insight.titulo}
      </h3>

      <p className="cartao-corpo">{insight.corpo}</p>

      {/* Regra 3 devolve um único insight com a lista de itens: três cartões
          dizendo "leve casaco" seriam ruído. */}
      {insight.itens && insight.itens.length > 0 && (
        <ul className="cartao-itens">
          {insight.itens.map((item) => (
            <li key={item.nome} className="cartao-item">
              <span className="cartao-item-nome">{item.nome}</span>
              <span className="cartao-item-motivo">{item.motivo}</span>
            </li>
          ))}
        </ul>
      )}

      {insight.sugestao && <p className="cartao-sugestao">{insight.sugestao}</p>}

      <ul className="cartao-base" aria-label="De onde vem este insight">
        {insight.base.map((numero) => (
          <li key={numero} className="cartao-base-item">
            {numero}
          </li>
        ))}
      </ul>

      {aoManterComoEsta && (
        <button
          type="button"
          className="cartao-acao"
          onClick={() => aoManterComoEsta(insight)}
        >
          Manter como está
        </button>
      )}
    </article>
  )
}
