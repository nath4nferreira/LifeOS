import { formatarDataCurta, rotuloDoDia, somarDias } from '../utils/tempo'
import './SeletorDeData.css'

interface SeletorDeDataProps {
  /** O dia que está na tela. */
  data: string
  /** O dia de verdade, para saber o que é "hoje" e "amanhã". */
  hoje: string
  /** Pular direto para um dia — é o que os atalhos fazem. */
  aoMudar: (data: string) => void
  /**
   * Andar N dias a partir de onde se está — é o que as setas fazem.
   *
   * Separado de `aoMudar` de propósito: três toques rápidos na seta precisam
   * andar três dias, e para isso cada um tem que partir do resultado do
   * anterior, não da data que esta renderização recebeu.
   */
  aoAvancar: (dias: number) => void
}

/**
 * Escolha do dia que a tela mostra.
 *
 * Hoje e amanhã são atalhos nomeados porque são os dois dias que o LifeOS
 * existe para responder: "como está meu dia" e "o que me espera". As setas
 * levam a qualquer outro dia, e quando o usuário está longe dos dois atalhos
 * aparece um terceiro botão com a data — assim sempre há exatamente um botão
 * marcado, e nunca se perde a noção de onde se está (heurística 1).
 *
 * A troca de dia é anunciada em região `aria-live`: sem isso, quem usa leitor
 * de tela aperta a seta e não recebe nenhum retorno de que algo mudou.
 */
export function SeletorDeData({ data, hoje, aoMudar, aoAvancar }: SeletorDeDataProps) {
  const amanha = somarDias(hoje, 1)
  const foraDosAtalhos = data !== hoje && data !== amanha

  const rotulo = rotuloDoDia(data, hoje)
  const curta = formatarDataCurta(data)

  const atalhos = [
    { data: hoje, rotulo: 'Hoje' },
    { data: amanha, rotulo: 'Amanhã' },
    ...(foraDosAtalhos ? [{ data, rotulo }] : []),
  ]

  return (
    <nav className="seletor-data" aria-label="Escolher o dia">
      <button
        type="button"
        className="seletor-data-seta"
        onClick={() => aoAvancar(-1)}
      >
        <Seta direcao="anterior" />
        <span className="apenas-leitor-de-tela">Dia anterior</span>
      </button>

      <div className="seletor-data-atalhos">
        {atalhos.map((atalho) => (
          <button
            key={atalho.data}
            type="button"
            className="seletor-data-atalho"
            aria-current={atalho.data === data ? 'page' : undefined}
            onClick={() => aoMudar(atalho.data)}
          >
            {atalho.rotulo}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="seletor-data-seta"
        onClick={() => aoAvancar(1)}
      >
        <Seta direcao="proximo" />
        <span className="apenas-leitor-de-tela">Próximo dia</span>
      </button>

      {/* Quando o rótulo já é a data, repetir seria "sáb 19 set, sáb 19 set". */}
      <p className="apenas-leitor-de-tela" role="status" aria-live="polite">
        Mostrando {rotulo === curta ? curta : `${rotulo}, ${curta}`}.
      </p>
    </nav>
  )
}

function Seta({ direcao }: { direcao: 'anterior' | 'proximo' }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        d={direcao === 'anterior' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
