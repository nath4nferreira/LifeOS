import { useId, useState } from 'react'
import { TEMAS, useTema, type Tema } from '../hooks/useTema'
import './PainelDeAjustes.css'

interface PainelDeAjustesProps {
  aoRecarregarDemonstracao: () => Promise<void>
}

const ROTULO_TEMA: Record<Tema, string> = {
  sistema: 'Do sistema',
  claro: 'Claro',
  escuro: 'Escuro',
}

/**
 * Onde moram as preferências: tema e o botão de recarregar o dia de exemplo.
 *
 * O botão de demonstração existe por um motivo prático — um app de agenda
 * aberto vazio não tem insight nenhum para mostrar, e o insight é o produto.
 * Fica aqui, e não na tela principal, porque apagar os eventos de alguém é
 * uma ação séria e não pode ficar a um toque de distância do uso normal.
 */
export function PainelDeAjustes({ aoRecarregarDemonstracao }: PainelDeAjustesProps) {
  const idBase = useId()
  const { tema, definirTema } = useTema()
  const [confirmando, setConfirmando] = useState(false)
  const [recarregando, setRecarregando] = useState(false)
  const [confirmacao, setConfirmacao] = useState<string | null>(null)

  async function recarregar() {
    setRecarregando(true)
    try {
      await aoRecarregarDemonstracao()
      setConfirmando(false)
      setConfirmacao('Dia de exemplo recarregado.')
    } finally {
      setRecarregando(false)
    }
  }

  return (
    <section className="ajustes" aria-labelledby={`${idBase}-titulo`}>
      <h2 id={`${idBase}-titulo`} className="ajustes-titulo">
        Ajustes
      </h2>

      {/* `fieldset`/`legend` porque são três opções de uma mesma pergunta: sem
          isso o leitor de tela anuncia "Claro, botão" sem dizer claro de quê. */}
      <fieldset className="ajustes-grupo">
        <legend className="ajustes-legenda">Tema</legend>
        <p className="ajustes-ajuda" id={`${idBase}-tema-ajuda`}>
          "Do sistema" acompanha o modo escuro do seu aparelho.
        </p>
        <div
          className="ajustes-opcoes"
          role="group"
          aria-describedby={`${idBase}-tema-ajuda`}
        >
          {TEMAS.map((opcao) => (
            <button
              key={opcao}
              type="button"
              className="ajustes-opcao"
              // `aria-pressed` e não `aria-current`: isto é um estado ligado
              // ou desligado, não o lugar onde a pessoa está na navegação.
              aria-pressed={tema === opcao}
              onClick={() => definirTema(opcao)}
            >
              {ROTULO_TEMA[opcao]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="ajustes-grupo">
        <h3 className="ajustes-legenda">Dia de exemplo</h3>
        <p className="ajustes-ajuda">
          Recarrega os cinco compromissos da demonstração para hoje. Isso
          substitui tudo que você tem salvo.
        </p>

        {/* Prevenção de erro (heurística 5): a ação destrutiva pede
            confirmação, e o passo de confirmação diz o que vai acontecer. */}
        {confirmando ? (
          <p className="ajustes-confirmar" role="alert">
            Seus compromissos serão apagados.
            <button
              type="button"
              className="ajustes-acao ajustes-acao-destrutiva"
              disabled={recarregando}
              onClick={() => void recarregar()}
            >
              {recarregando ? 'Recarregando…' : 'Sim, recarregar'}
            </button>
            <button
              type="button"
              className="ajustes-acao"
              disabled={recarregando}
              onClick={() => setConfirmando(false)}
            >
              Cancelar
            </button>
          </p>
        ) : (
          <button
            type="button"
            className="ajustes-acao"
            onClick={() => {
              setConfirmacao(null)
              setConfirmando(true)
            }}
          >
            Recarregar dia de exemplo
          </button>
        )}

        {confirmacao && (
          <p className="ajustes-confirmacao" role="status">
            {confirmacao}
          </p>
        )}
      </div>
    </section>
  )
}
