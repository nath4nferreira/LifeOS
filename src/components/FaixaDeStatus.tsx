import type { Previsao } from '../types'
import { formatarDataCurta } from '../utils/tempo'
import './FaixaDeStatus.css'

interface FaixaDeStatusProps {
  data: string // ISO, "2026-09-17"
  previsao: Previsao | null
}

/**
 * Faixa fina no topo com a data e o contexto de clima.
 *
 * `previsao` é `null` até a rota serverless da etapa 15 existir, e também
 * quando a API falha ou o dia consultado está fora do alcance dela. Nos dois
 * casos o contexto de clima aparece como indisponível e o resto da tela
 * segue funcionando — degradação graciosa é requisito, não detalhe.
 */
export function FaixaDeStatus({ data, previsao }: FaixaDeStatusProps) {
  return (
    <header className="faixa-status">
      <span className="faixa-status-data">{formatarDataCurta(data)}</span>
      <span className="faixa-status-clima">
        {previsao ? `${Math.round(previsao.tempAtual)}° ${previsao.condicaoAtual}` : 'Clima indisponível'}
      </span>
    </header>
  )
}
