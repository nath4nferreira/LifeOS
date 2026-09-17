import { useState } from 'react'
import { gerarInsights, resumoDoDia, vereditoDoDia } from './core/insights'
import type { EventoBase, Previsao } from './types'
import { FaixaDeStatus } from './components/FaixaDeStatus'
import { Veredito } from './components/Veredito'
import { TrilhaDoDia } from './components/TrilhaDoDia'
import { NavegacaoInferior, type Aba } from './components/NavegacaoInferior'
import './App.css'

/**
 * Dados de demonstração (seção 15 do briefing). Moram aqui até a etapa 9
 * trazer `RepositorioLocal` e um hook de eventos — depois disso isto sai do
 * componente e vira estado carregado de verdade.
 */
const EVENTOS_DE_HOJE: EventoBase[] = [
  { id: 'trabalho-manha', nome: 'Trabalho', categoria: 'trabalho', inicio: '09:00', fim: '12:00', deslocamento: 0 },
  { id: 'almoco', nome: 'Almoço', categoria: 'pessoal', inicio: '12:00', fim: '13:00', deslocamento: 0 },
  { id: 'trabalho-tarde', nome: 'Trabalho', categoria: 'trabalho', inicio: '14:30', fim: '17:30', deslocamento: 0 },
  { id: 'academia', nome: 'Academia', categoria: 'saude', inicio: '18:00', fim: '19:00', deslocamento: 15 },
  { id: 'faculdade', nome: 'Faculdade', categoria: 'estudos', inicio: '19:30', fim: '22:30', deslocamento: 25 },
]

/**
 * O serviço de clima chega na etapa 15 com a rota serverless. Até lá o
 * contexto de clima é tratado como indisponível — exatamente como quando a
 * API falha de verdade — e o resto do app segue funcionando normalmente.
 */
const PREVISAO_DEMO: Previsao | null = null

/** Data de hoje em ISO. `core/` e `utils/` nunca leem o relógio; quem lê é a interface. */
function hojeISO(): string {
  const agora = new Date()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}-${dia}`
}

function App() {
  const [aba, setAba] = useState<Aba>('dia')

  const insights = gerarInsights(EVENTOS_DE_HOJE, PREVISAO_DEMO)
  const { comprometido, emAberto } = resumoDoDia(EVENTOS_DE_HOJE)
  const veredito = vereditoDoDia(insights, comprometido)

  return (
    <div className="app-shell">
      <FaixaDeStatus data={hojeISO()} previsao={PREVISAO_DEMO} />

      <main className="app-conteudo">
        {aba === 'dia' && (
          <>
            <Veredito
              texto={veredito}
              comprometido={comprometido}
              emAberto={emAberto}
              pontos={insights.length}
            />
            <TrilhaDoDia eventos={EVENTOS_DE_HOJE} />
          </>
        )}
        {aba === 'adicionar' && <p className="em-construcao">Em construção.</p>}
        {aba === 'alertas' && <p className="em-construcao">Em construção.</p>}
      </main>

      <NavegacaoInferior ativa={aba} aoSelecionar={setAba} />
    </div>
  )
}

export default App
