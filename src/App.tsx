import { useEffect, useRef, useState } from 'react'
import {
  gerarInsights,
  insightsDeTransicao,
  resumoDoDia,
  vereditoDoDia,
} from './core/insights'
import { eventosDoDia } from './core/seletor'
import { useAgora } from './hooks/useAgora'
import { useEventos } from './hooks/useEventos'
import { useMedia } from './hooks/useMedia'
import { usePrevisao } from './hooks/usePrevisao'
import { PREVISAO_DE_DEMONSTRACAO } from './services/demonstracao'
import { hojeISO } from './services/relogio'
import { rotuloDoDia, somarDias } from './utils/tempo'
import { FaixaDeStatus } from './components/FaixaDeStatus'
import { SeletorDeData } from './components/SeletorDeData'
import { Veredito } from './components/Veredito'
import { PainelDeInsights } from './components/PainelDeInsights'
import { TrilhaDoDia } from './components/TrilhaDoDia'
import { PainelDeContexto } from './components/PainelDeContexto'
import { PainelDeAjustes } from './components/PainelDeAjustes'
import { FormularioEvento } from './components/FormularioEvento'
import { NavegacaoPrincipal, type Aba } from './components/NavegacaoPrincipal'
import { DicaDeInstalacao } from './components/DicaDeInstalacao'
import './App.css'

function App() {
  const [aba, setAba] = useState<Aba>('dia')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [dispensados, setDispensados] = useState<string[]>([])
  const { eventos, carregando, erro, criar, atualizar, remover, recarregarDemonstracao } =
    useEventos()

  // `useAgora` faz o app renderizar a cada virada de minuto. Isso move o
  // marcador da trilha e, de quebra, resolve a virada da meia-noite: `hoje` é
  // recalculado no mesmo tique, então às 00:00 o dia que estava na tela passa
  // a ser "Ontem" sozinho, sem precisar recarregar a página.
  const agora = useAgora()

  // A partir de 1025px o layout vira três colunas e ganha o painel de
  // contexto. É montagem condicional, não `display: none`: abaixo disso o
  // painel não existe na página.
  const desktop = useMedia('(min-width: 1025px)')

  // `hoje` é lido uma vez por render e nunca vira estado: é o dia de verdade.
  // `data` é o dia que a tela mostra, e os dois são coisas diferentes.
  const hoje = hojeISO()
  const [data, setData] = useState(hoje)
  const doDia = eventosDoDia(eventos, data)

  // Foco depois de uma troca de tela que apaga o botão que a disparou.
  //
  // Abrir a edição pela trilha destrói o próprio botão clicado; o navegador
  // devolve o foco ao `<body>` e quem usa teclado recomeça do início da
  // página. O contador existe para que o efeito rode a cada pedido, mesmo
  // quando o destino é o mesmo de antes — um `useEffect` em `aba` não
  // dispararia ao trocar de evento editado, e dispararia à toa nos botões da
  // navegação, que continuam existindo e não devem perder o foco.
  const conteudo = useRef<HTMLElement>(null)
  const [pedidosDeFoco, setPedidosDeFoco] = useState(0)
  useEffect(() => {
    if (pedidosDeFoco > 0) conteudo.current?.focus()
  }, [pedidosDeFoco])
  const focarConteudo = () => setPedidosDeFoco((n) => n + 1)

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
    focarConteudo()
  }

  function fecharEdicao() {
    setEditandoId(null)
    setAba('dia')
    focarConteudo()
  }

  const insights = gerarInsights(doDia, previsao)
  const { comprometido, emAberto } = resumoDoDia(doDia)
  const veredito = vereditoDoDia(insights, comprometido)

  const dispensar = (id: string) => setDispensados((atuais) => [...atuais, id])
  const restaurar = () => setDispensados([])

  return (
    <div className="app-shell">
      {/* WCAG 2.4.1: antes do conteúdo há a faixa de status, o seletor de dia
          e as setas — seis paradas de teclado que se repetem em toda tela. O
          link só aparece quando recebe foco, e é o primeiro elemento focável
          da página de propósito. */}
      <a className="app-pular" href="#conteudo">
        Pular para o conteúdo
      </a>

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

      {/* `tabIndex={-1}` não põe o `<main>` na ordem de tabulação: só o torna
          alvo válido de `.focus()` e do salto do link acima. */}
      <main className="app-conteudo" id="conteudo" ref={conteudo} tabIndex={-1}>
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

            {/* Por último e só aqui: é sugestão, não conteúdo. Fica abaixo do
                que a pessoa veio ver, e não atrapalha quem está no meio de
                preencher um formulário em outra aba. */}
            <DicaDeInstalacao />
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

        {!carregando && aba === 'ajustes' && (
          <PainelDeAjustes aoRecarregarDemonstracao={recarregarDemonstracao} />
        )}
      </main>

      {desktop && (
        <PainelDeContexto
          previsao={previsao}
          estado={estadoDoClima}
          eventos={doDia}
          agora={data === hoje ? agora : null}
        />
      )}

      <NavegacaoPrincipal ativa={aba} aoSelecionar={irPara} />
    </div>
  )
}

export default App
