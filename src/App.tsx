import { useState } from 'react'
import { gerarInsights, resumoDoDia, vereditoDoDia } from './core/insights'
import { eventosDoDia } from './core/seletor'
import { useEventos } from './hooks/useEventos'
import { PREVISAO_DE_DEMONSTRACAO } from './services/demonstracao'
import { hojeISO } from './services/relogio'
import { FaixaDeStatus } from './components/FaixaDeStatus'
import { Veredito } from './components/Veredito'
import { PainelDeInsights } from './components/PainelDeInsights'
import { TrilhaDoDia } from './components/TrilhaDoDia'
import { NavegacaoInferior, type Aba } from './components/NavegacaoInferior'
import './App.css'

/**
 * A rota serverless de clima chega na etapa 15. Até lá a previsão fixa da
 * seção 15 alimenta as regras 3 e 4.
 */
const PREVISAO = PREVISAO_DE_DEMONSTRACAO

function App() {
  const [aba, setAba] = useState<Aba>('dia')
  const [dispensados, setDispensados] = useState<string[]>([])
  const { eventos, carregando, erro } = useEventos()

  const hoje = hojeISO()
  const doDia = eventosDoDia(eventos, hoje)

  const insights = gerarInsights(doDia, PREVISAO)
  const { comprometido, emAberto } = resumoDoDia(doDia)
  const veredito = vereditoDoDia(insights, comprometido)

  const dispensar = (id: string) => setDispensados((atuais) => [...atuais, id])
  const restaurar = () => setDispensados([])

  return (
    <div className="app-shell">
      <FaixaDeStatus data={hoje} previsao={PREVISAO} />

      <main className="app-conteudo">
        {/* Visibilidade do estado do sistema (heurística 1): carregar e
            falhar são estados visíveis, não telas em branco. */}
        {carregando && (
          <p className="app-estado" role="status">
            Carregando seus eventos…
          </p>
        )}

        {erro && (
          <p className="app-estado app-estado-erro" role="alert">
            {erro}
          </p>
        )}

        {!carregando && aba === 'dia' && (
          <>
            <Veredito
              texto={veredito}
              comprometido={comprometido}
              emAberto={emAberto}
              pontos={insights.length}
            />
            <PainelDeInsights
              insights={insights}
              dispensados={dispensados}
              aoDispensar={dispensar}
              aoRestaurar={restaurar}
            />
            <TrilhaDoDia eventos={doDia} />
          </>
        )}

        {!carregando && aba === 'adicionar' && <p className="app-estado">Em construção.</p>}

        {!carregando && aba === 'alertas' && (
          <PainelDeInsights
            insights={insights}
            dispensados={dispensados}
            aoDispensar={dispensar}
            aoRestaurar={restaurar}
            titulo="Tudo que o LifeOS leu no seu dia"
            mostrarTodos
          />
        )}
      </main>

      <NavegacaoInferior ativa={aba} aoSelecionar={setAba} />
    </div>
  )
}

export default App
