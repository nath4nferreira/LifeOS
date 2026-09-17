import { useState } from 'react'
import {
  gerarInsights,
  insightsDeTransicao,
  resumoDoDia,
  vereditoDoDia,
} from './core/insights'
import { eventosDoDia } from './core/seletor'
import { useAgora } from './hooks/useAgora'
import { useEventos } from './hooks/useEventos'
import { usePrevisao } from './hooks/usePrevisao'
import { PREVISAO_DE_DEMONSTRACAO } from './services/demonstracao'
import { hojeISO } from './services/relogio'
import { rotuloDoDia, somarDias } from './utils/tempo'
import { FaixaDeStatus } from './components/FaixaDeStatus'
import { SeletorDeData } from './components/SeletorDeData'
import { Veredito } from './components/Veredito'
import { PainelDeInsights } from './components/PainelDeInsights'
import { TrilhaDoDia } from './components/TrilhaDoDia'
import { FormularioEvento } from './components/FormularioEvento'
import { NavegacaoInferior, type Aba } from './components/NavegacaoInferior'
import './App.css'

function App() {
  const [aba, setAba] = useState<Aba>('dia')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [dispensados, setDispensados] = useState<string[]>([])
  const { eventos, carregando, erro, criar, atualizar, remover } = useEventos()

  // `useAgora` faz o app renderizar a cada virada de minuto. Isso move o
  // marcador da trilha e, de quebra, resolve a virada da meia-noite: `hoje` é
  // recalculado no mesmo tique, então às 00:00 o dia que estava na tela passa
  // a ser "Ontem" sozinho, sem precisar recarregar a página.
  const agora = useAgora()

  // `hoje` é lido uma vez por render e nunca vira estado: é o dia de verdade.
  // `data` é o dia que a tela mostra, e os dois são coisas diferentes.
  const hoje = hojeISO()
  const [data, setData] = useState(hoje)
  const doDia = eventosDoDia(eventos, data)

  // A regra 7 é a única que cruza dois dias, então é a única que precisa do
  // dia seguinte. O motor a mantém fora de `gerarInsights` justamente porque
  // aquele enxerga um dia só.
  const seguinte = somarDias(data, 1)
  const transicao = insightsDeTransicao(doDia, eventosDoDia(eventos, seguinte))

  // O clima real vem da rota serverless; o de exemplo só entra se o usuário
  // pedir, e nesse caso a faixa de status diz que é exemplo. Dado fabricado
  // nunca se disfarça de medido.
  const [usandoExemplo, setUsandoExemplo] = useState(false)
  const clima = usePrevisao(data)
  const previsao = usandoExemplo ? PREVISAO_DE_DEMONSTRACAO : clima.previsao
  const estadoDoClima = usandoExemplo ? 'pronto' : clima.estado

  // A trilha entrega o id da ocorrência, que é o id do evento de origem. Se o
  // evento sumiu (excluído em outra aba), `editando` volta a ser indefinido e
  // o formulário volta ao modo de criação em vez de quebrar.
  const editando = eventos.find((evento) => evento.id === editandoId)

  function irPara(destino: Aba) {
    setEditandoId(null)
    setAba(destino)
  }

  /** Trocar de dia sai da edição: o evento aberto era do dia anterior. */
  function mudarData(nova: string) {
    setEditandoId(null)
    setData(nova)
    // Cada dia tem seus próprios insights, então os dispensados do dia
    // anterior não têm por que continuar escondidos.
    setDispensados([])
  }

  function avancarDias(dias: number) {
    setEditandoId(null)
    setDispensados([])
    // Partir do valor atual, e não de `data`: toques rápidos na seta precisam
    // se acumular em vez de recalcular todos a partir da mesma renderização.
    setData((atual) => somarDias(atual, dias))
  }

  function editar(id: string) {
    setEditandoId(id)
    setAba('adicionar')
  }

  function fecharEdicao() {
    setEditandoId(null)
    setAba('dia')
  }

  const insights = gerarInsights(doDia, previsao)
  const { comprometido, emAberto } = resumoDoDia(doDia)
  const veredito = vereditoDoDia(insights, comprometido)

  const dispensar = (id: string) => setDispensados((atuais) => [...atuais, id])
  const restaurar = () => setDispensados([])

  return (
    <div className="app-shell">
      <FaixaDeStatus
        data={data}
        previsao={previsao}
        estado={estadoDoClima}
        exemplo={usandoExemplo}
        aoAlternarExemplo={() => setUsandoExemplo((atual) => !atual)}
      />
      <SeletorDeData
        data={data}
        hoje={hoje}
        aoMudar={mudarData}
        aoAvancar={avancarDias}
      />

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
            <TrilhaDoDia
              eventos={doDia}
              aoEditar={editar}
              agora={data === hoje ? agora : null}
            />

            {/* A virada do dia é um painel à parte, e não mais um cartão no
                painel do dia. O motivo é honestidade: esse insight não fala do
                dia que está na tela, fala do que acontece depois que ele
                acaba — e por isso também não entra na conta do veredito. */}
            {transicao.length > 0 && (
              <PainelDeInsights
                insights={transicao}
                dispensados={dispensados}
                aoDispensar={dispensar}
                aoRestaurar={restaurar}
                titulo={`Entre ${rotuloDoDia(data, hoje).toLowerCase()} e ${rotuloDoDia(seguinte, hoje).toLowerCase()}`}
                mostrarTodos
              />
            )}
          </>
        )}

        {!carregando && aba === 'adicionar' && (
          // A `key` faz o React refazer o formulário ao trocar de evento
          // editado — é o que garante que os campos recarreguem do evento novo
          // em vez de manter o estado do anterior.
          <FormularioEvento
            key={editando?.id ?? 'novo'}
            data={data}
            doDia={doDia}
            evento={editando}
            aoSalvar={editando ? atualizar : criar}
            aoExcluir={remover}
            aoFechar={fecharEdicao}
          />
        )}

        {!carregando && aba === 'alertas' && (
          // Aqui a virada entra junto: esta aba é o inventário completo, e
          // separá-la de novo só esconderia informação atrás de uma rolagem.
          // Vai por último de propósito — é o que vem depois do dia acabar.
          <PainelDeInsights
            insights={[...insights, ...transicao]}
            dispensados={dispensados}
            aoDispensar={dispensar}
            aoRestaurar={restaurar}
            titulo="Tudo que o LifeOS leu no seu dia"
            mostrarTodos
          />
        )}
      </main>

      <NavegacaoInferior ativa={aba} aoSelecionar={irPara} />
    </div>
  )
}

export default App
