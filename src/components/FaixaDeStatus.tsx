import type { Previsao } from '../types'
import type { EstadoDoClima } from '../hooks/usePrevisao'
import { formatarDataCurta } from '../utils/tempo'
import './FaixaDeStatus.css'

interface FaixaDeStatusProps {
  data: string // ISO, "2026-09-17"
  previsao: Previsao | null
  estado: EstadoDoClima
  /** `true` quando a previsão na tela é a de exemplo, e não a real. */
  exemplo: boolean
  aoAlternarExemplo: () => void
}

/**
 * Faixa fina no topo com a data e o contexto de clima.
 *
 * Os três estados do clima aparecem como três textos diferentes, e nenhum
 * deles é uma tela em branco (heurística 1). Quando a previsão não vem — API
 * fora do ar, dia além dos 5 que ela cobre, chave ausente em ambiente local —
 * a faixa diz isso com todas as letras e o resto do app continua analisando
 * conflito, margem, carga e janela.
 *
 * O botão de previsão de exemplo existe para o app ser demonstrável sem chave
 * e sem internet. Ele é explícito de propósito: dado inventado sempre aparece
 * rotulado como exemplo, porque um produto que se vende como auditável não
 * pode apresentar número fabricado como se fosse medido.
 */
export function FaixaDeStatus({
  data,
  previsao,
  estado,
  exemplo,
  aoAlternarExemplo,
}: FaixaDeStatusProps) {
  return (
    <header className="faixa-status">
      <span className="faixa-status-data">{formatarDataCurta(data)}</span>

      <span className="faixa-status-clima" role="status" aria-live="polite">
        {estado === 'carregando' && 'Buscando o clima…'}
        {estado === 'pronto' && previsao && (
          <>
            {Math.round(previsao.tempAtual)}° {previsao.condicaoAtual}
            {exemplo && <span className="faixa-status-exemplo"> exemplo</span>}
          </>
        )}
        {estado === 'indisponivel' && 'Clima indisponível'}
      </span>

      {estado !== 'carregando' && (
        <button type="button" className="faixa-status-acao" onClick={aoAlternarExemplo}>
          {exemplo ? 'Usar clima real' : 'Usar exemplo'}
          <span className="apenas-leitor-de-tela">
            {exemplo
              ? ' — voltar a buscar a previsão de verdade'
              : ' — usar a previsão de exemplo, para demonstração'}
          </span>
        </button>
      )}
    </header>
  )
}
