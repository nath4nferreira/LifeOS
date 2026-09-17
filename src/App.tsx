import { useState } from 'react'
import { gerarInsights, resumoDoDia, vereditoDoDia } from './core/insights'
import type { EventoBase, Previsao } from './types'
import { FaixaDeStatus } from './components/FaixaDeStatus'
import { Veredito } from './components/Veredito'
import { PainelDeInsights } from './components/PainelDeInsights'
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
 * Previsão fixa da seção 15. A rota serverless só chega na etapa 15, mas a
 * Regra 3 precisa de clima para produzir a lista de itens — e é ela que o
 * cartão de insight tem de saber mostrar. Com esta previsão o dia de
 * demonstração fecha nos 4 insights que o briefing prevê.
 */
const PREVISAO_DEMO: Previsao | null = {
  local: 'São Paulo',
  tempAtual: 22,
  condicaoAtual: 'nublado',
  horas: [
    { hora: '08:00', temp: 17, chuva: 0.05 },
    { hora: '11:00', temp: 21, chuva: 0.1 },
    { hora: '14:00', temp: 24, chuva: 0.15 },
    { hora: '17:00', temp: 23, chuva: 0.35 },
    { hora: '19:00', temp: 19, chuva: 0.82 },
    { hora: '21:00', temp: 15, chuva: 0.55 },
  ],
}

/** Data de hoje em ISO. `core/` e `utils/` nunca leem o relógio; quem lê é a interface. */
function hojeISO(): string {
  const agora = new Date()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}-${dia}`
}

function App() {
  const [aba, setAba] = useState<Aba>('dia')
  const [dispensados, setDispensados] = useState<string[]>([])

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
            <PainelDeInsights
              insights={insights}
              dispensados={dispensados}
              aoDispensar={(id) => setDispensados((atuais) => [...atuais, id])}
              aoRestaurar={() => setDispensados([])}
            />
            <TrilhaDoDia eventos={EVENTOS_DE_HOJE} />
          </>
        )}
        {aba === 'adicionar' && <p className="em-construcao">Em construção.</p>}
        {aba === 'alertas' && (
          <PainelDeInsights
            insights={insights}
            dispensados={dispensados}
            aoDispensar={(id) => setDispensados((atuais) => [...atuais, id])}
            aoRestaurar={() => setDispensados([])}
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
