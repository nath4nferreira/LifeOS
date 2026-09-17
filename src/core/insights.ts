/**
 * Motor de insights — o coração do produto.
 *
 * `gerarInsights` é uma função pura: não busca dados, não renderiza, não
 * guarda estado. Isso permite testar sem montar componente, adicionar regra
 * sem tocar na interface e explicar a lógica em trinta segundos.
 *
 * RESTRIÇÃO DE PORTABILIDADE: sem React, sem DOM, sem `window`,
 * `localStorage` ou `fetch`. Os testes deste arquivo são a especificação do
 * motor — um port futuro para Dart deve passar nos mesmos casos.
 *
 * O motor recebe uma lista plana de eventos e nunca sabe que `EventoFixo`
 * existe. Recorrência é problema de seleção (`core/seletor.ts`).
 */

import type {
  Categoria,
  EventoBase,
  HoraPrevisao,
  Insight,
  ItemDePreparo,
  NivelInsight,
  Previsao,
} from '../types'
import { duracao, formatarDuracao, paraHorario, paraMinutos } from '../utils/tempo'

export const MARGEM_CONFORTAVEL = 10 // min de sobra considerados tranquilos
const JANELA_LIVRE_MINIMA = 90 // min a partir de que vale sugerir uso
const CARGA_ALTA = 9 * 60 // min comprometidos = dia cheio
const CHUVA_PROVAVEL = 0.5 // probabilidade que aciona aviso
const FRIO = 17 // °C para casaco leve
const FRIO_INTENSO = 12 // °C para casaco
const QUEDA_TERMICA = 7 // °C de queda que justifica avisar
const SONO_MINIMO = 7 * 60 // min entre chegar em casa e o 1º evento

/** Minutos extras sugeridos quando chove no horário do deslocamento. */
const MARGEM_POR_CHUVA = 10

/**
 * O plano gratuito da OpenWeather devolve blocos de 3 horas, não hora a hora.
 * Cada faixa é tratada como cobrindo 3h para não afirmar horários que a API
 * não afirmou.
 */
const DURACAO_FAIXA = 3 * 60

const MINUTOS_POR_DIA = 24 * 60

const ORDEM_NIVEL: Record<NivelInsight, number> = {
  critico: 0,
  atencao: 1,
  info: 2,
  bom: 3,
}

/**
 * Lê o dia e devolve o que merece ser dito sobre ele, do mais grave ao melhor.
 *
 * `previsao` em `null` significa clima indisponível: as regras 3 e 4
 * simplesmente desaparecem e o resto continua funcionando.
 */
export function gerarInsights(
  eventos: EventoBase[],
  previsao: Previsao | null,
): Insight[] {
  const ordenados = ordenarPorInicio(eventos)
  const insights: Insight[] = []

  /**
   * Eventos cuja chegada já foi questionada pelas regras 1 e 2. A regra 4
   * não repete o aviso: quem já sabe que o trecho está apertado não precisa
   * de um segundo cartão dizendo que também vai chover nele.
   */
  const chegadaJaQuestionada = new Set<string>()

  for (let i = 0; i < ordenados.length - 1; i++) {
    const anterior = ordenados[i]
    const seguinte = ordenados[i + 1]
    const vao = duracao(anterior.fim, seguinte.inicio)

    // Regra 1 — sobreposição. Quando os eventos se cruzam, a sobreposição é o
    // problema; calcular margem de deslocamento em cima disso seria redundante.
    if (vao < 0) {
      insights.push(sobreposicao(anterior, seguinte, vao))
      chegadaJaQuestionada.add(seguinte.id)
      continue
    }

    // Regra 2 — margem vs. deslocamento
    const aperto = margemDeDeslocamento(anterior, seguinte, vao)
    if (aperto) {
      insights.push(aperto)
      chegadaJaQuestionada.add(seguinte.id)
    }

    // Regra 6 — janela livre
    const janela = janelaLivre(anterior, seguinte, vao)
    if (janela) insights.push(janela)
  }

  // Regra 5 — carga do dia
  const carga = cargaDoDia(ordenados)
  if (carga) insights.push(carga)

  // Regras 3 e 4 — dependem de clima
  if (previsao) {
    const levar = oQueLevar(ordenados, previsao)
    if (levar) insights.push(levar)

    insights.push(...chuvaNoDeslocamento(ordenados, previsao, chegadaJaQuestionada))
  }

  return porNivel(insights)
}

/**
 * Regra 7 — transição entre dias.
 *
 * Vive numa função separada porque cruza dois dias, e o motor principal
 * enxerga um dia só. É um dos insights mais característicos do produto:
 * nenhum app de agenda olha o que acontece depois da meia-noite.
 */
export function insightsDeTransicao(hoje: EventoBase[], amanha: EventoBase[]): Insight[] {
  const doDia = ordenarPorInicio(hoje)
  const doDiaSeguinte = ordenarPorInicio(amanha)
  if (doDia.length === 0 || doDiaSeguinte.length === 0) return []

  const ultimo = doDia[doDia.length - 1]
  const primeiro = doDiaSeguinte[0]

  // Chegar em casa custa o mesmo tempo da ida; sair de casa também.
  const chegadaEmCasa = paraMinutos(ultimo.fim) + ultimo.deslocamento
  const saidaDeCasa = paraMinutos(primeiro.inicio) - primeiro.deslocamento

  // A janela atravessa a meia-noite, por isso o dia inteiro entra na conta.
  const janela = saidaDeCasa + MINUTOS_POR_DIA - chegadaEmCasa
  if (janela >= SONO_MINIMO) return []

  return [
    {
      id: 'sono',
      tipo: 'sono',
      nivel: 'atencao',
      etiqueta: 'sono curto',
      titulo: `Sobram ${formatarDuracao(janela)} entre hoje e amanhã`,
      corpo:
        `Você chega em casa às ${paraHorario(chegadaEmCasa)} e amanhã ` +
        `${primeiro.nome} começa às ${primeiro.inicio}. ` +
        `Sobram ${formatarDuracao(janela)} entre uma coisa e outra, ` +
        `contando o caminho nos dois sentidos.`,
      sugestao: `Encerrar ${ultimo.nome} mais cedo ou começar amanhã mais tarde abriria essa janela.`,
      base: [
        `${ultimo.nome} termina às ${ultimo.fim}`,
        `chegada em casa às ${paraHorario(chegadaEmCasa)}`,
        `saída de casa amanhã às ${paraHorario(saidaDeCasa)}`,
        `${formatarDuracao(janela)} de janela`,
      ],
      eventos: [ultimo.id, primeiro.id],
    },
  ]
}

/** O dia resumido em uma frase. É com isso que a tela principal abre. */
export function vereditoDoDia(insights: Insight[], comprometido: number): string {
  if (insights.some((i) => i.nivel === 'critico')) return 'Seu dia não fecha.'
  if (insights.some((i) => i.tipo === 'margem')) return 'Seu dia está apertado.'
  if (comprometido >= CARGA_ALTA) return 'Seu dia está cheio.'
  if (comprometido === 0) return 'Seu dia está vazio.'
  return 'Seu dia está tranquilo.'
}

/**
 * Totais do dia, em minutos. `emAberto` são os vãos entre o primeiro e o
 * último compromisso — tempo dentro do dia agendado, não o dia todo.
 *
 * Deslocamento não entra em `comprometido`: são as horas dos compromissos.
 */
export function resumoDoDia(eventos: EventoBase[]): {
  comprometido: number
  emAberto: number
} {
  const ordenados = ordenarPorInicio(eventos)
  const comprometido = ordenados.reduce((total, e) => total + duracao(e.inicio, e.fim), 0)

  let emAberto = 0
  for (let i = 0; i < ordenados.length - 1; i++) {
    emAberto += Math.max(0, duracao(ordenados[i].fim, ordenados[i + 1].inicio))
  }

  return { comprometido, emAberto }
}

/** Uma categoria e quanto do dia ela ocupa. */
export interface CargaDeArea {
  categoria: Categoria
  minutos: number
  /** Fração do tempo comprometido, de 0 a 1. Já é a largura da barra. */
  fracao: number
}

/**
 * Para onde o dia foi, por área.
 *
 * Responde a pergunta que o veredito não responde: "11h comprometidas" não
 * diz se foram 11h de trabalho ou 11h divididas entre cinco coisas. É a
 * informação que só cabe no desktop, onde sobra coluna.
 *
 * Sai ordenado do maior para o menor, e categorias sem evento nenhum não
 * aparecem — uma lista de seis itens com quatro zeros seria ruído.
 */
export function cargaPorArea(eventos: EventoBase[]): CargaDeArea[] {
  const total = eventos.reduce((soma, e) => soma + duracao(e.inicio, e.fim), 0)
  if (total <= 0) return []

  const minutosPor = new Map<Categoria, number>()
  for (const evento of eventos) {
    const atual = minutosPor.get(evento.categoria) ?? 0
    minutosPor.set(evento.categoria, atual + duracao(evento.inicio, evento.fim))
  }

  return [...minutosPor.entries()]
    .map(([categoria, minutos]) => ({ categoria, minutos, fracao: minutos / total }))
    .sort((a, b) => b.minutos - a.minutos)
}

// ---------------------------------------------------------------------------
// Regras
// ---------------------------------------------------------------------------

/** Regra 1 — dois eventos consecutivos com vão negativo. */
function sobreposicao(anterior: EventoBase, seguinte: EventoBase, vao: number): Insight {
  const cruzamento = formatarDuracao(-vao)
  return {
    id: `conflito-${anterior.id}-${seguinte.id}`,
    tipo: 'conflito',
    nivel: 'critico',
    etiqueta: 'conflito',
    titulo: `${anterior.nome} e ${seguinte.nome} se sobrepõem`,
    corpo:
      `${anterior.nome} vai até às ${anterior.fim} e ${seguinte.nome} começa ` +
      `às ${seguinte.inicio}. São ${cruzamento} em que você estaria nos dois lugares.`,
    sugestao: `Um dos dois precisa mudar de horário.`,
    base: [
      `${anterior.nome} ${anterior.inicio}–${anterior.fim}`,
      `${seguinte.nome} ${seguinte.inicio}–${seguinte.fim}`,
      `${cruzamento} de sobreposição`,
    ],
    eventos: [anterior.id, seguinte.id],
  }
}

/**
 * Sobra entre dois eventos consecutivos, descontado o deslocamento do
 * segundo — a mesma conta da Regra 2. `null` quando o segundo evento não sai
 * de casa (deslocamento 0): não há caminho para avaliar.
 *
 * Exportada para a trilha visual (`TrilhaDoDia`) marcar o mesmo vão que esta
 * regra marcaria como apertado, sem duplicar o `if` de negócio no componente.
 */
export function margemAntes(seguinte: EventoBase, vao: number): number | null {
  if (seguinte.deslocamento === 0) return null
  return vao - seguinte.deslocamento
}

/**
 * Regra 2 — margem vs. deslocamento.
 *
 * `margem = vão − deslocamento do segundo`. Eventos com deslocamento 0 são
 * remotos ou em casa: não há caminho para não dar tempo de fazer.
 */
function margemDeDeslocamento(
  anterior: EventoBase,
  seguinte: EventoBase,
  vao: number,
): Insight | null {
  const margem = margemAntes(seguinte, vao)
  if (margem === null) return null
  if (margem >= MARGEM_CONFORTAVEL) return null

  const caminho = formatarDuracao(seguinte.deslocamento)
  const saidaNecessaria = paraHorario(
    paraMinutos(seguinte.inicio) - seguinte.deslocamento,
  )
  const base = [
    `${formatarDuracao(vao)} entre ${anterior.nome} e ${seguinte.nome}`,
    `${caminho} de deslocamento`,
  ]

  if (margem < 0) {
    const atraso = formatarDuracao(-margem)
    return {
      id: `margem-${seguinte.id}`,
      tipo: 'margem',
      nivel: 'critico',
      etiqueta: 'não dá',
      titulo: `Não dá para chegar em ${seguinte.nome} às ${seguinte.inicio}`,
      corpo:
        `${anterior.nome} termina às ${anterior.fim} e o caminho até ` +
        `${seguinte.nome} leva ${caminho}. Saindo na hora, você chega ` +
        `${atraso} atrasado.`,
      sugestao: `Para chegar no horário seria preciso sair às ${saidaNecessaria}, antes de ${anterior.nome} terminar.`,
      base: [...base, `${atraso} de atraso`],
      eventos: [anterior.id, seguinte.id],
    }
  }

  const sobra = formatarDuracao(margem)
  return {
    id: `margem-${seguinte.id}`,
    tipo: 'margem',
    nivel: 'atencao',
    etiqueta: 'apertado',
    titulo: `Só ${sobra} de sobra antes de ${seguinte.nome}`,
    corpo:
      `${anterior.nome} termina às ${anterior.fim} e são ${caminho} de caminho ` +
      `até ${seguinte.nome}. Saindo às ${saidaNecessaria} dá, mas qualquer ` +
      `atraso derruba o horário.`,
    sugestao: `Encerrar ${anterior.nome} um pouco mais cedo devolveria essa folga.`,
    base: [...base, `${sobra} de sobra`],
    eventos: [anterior.id, seguinte.id],
  }
}

/**
 * Regra 3 — o que levar ao sair de casa.
 *
 * Avalia a previsão em toda a janela fora de casa, não no instante da saída.
 * É por isso que "saio às 17h e chove às 18h" funciona: o usuário está na rua
 * às 18h.
 *
 * Devolve um único insight com a lista de itens — três cartões dizendo "leve
 * casaco" seriam ruído. Se nenhum item for acionado, não gera insight:
 * silêncio é resposta válida.
 */
function oQueLevar(eventos: EventoBase[], previsao: Previsao): Insight | null {
  const janela = janelaForaDeCasa(eventos)
  if (!janela) return null

  const faixas = faixasNaJanela(previsao, janela.de, janela.ate)
  if (faixas.length === 0) return null

  const itens: ItemDePreparo[] = []
  const base = [
    `fora de casa das ${paraHorario(janela.de)} às ${paraHorario(janela.ate)}`,
  ]

  const maisChuvosa = faixas.reduce((pior, f) => (f.chuva > pior.chuva ? f : pior))
  if (maisChuvosa.chuva >= CHUVA_PROVAVEL) {
    itens.push({
      nome: 'guarda-chuva',
      motivo: `${emPorcento(maisChuvosa.chuva)} de chuva por volta das ${maisChuvosa.hora}`,
    })
    base.push(`${emPorcento(maisChuvosa.chuva)} de chuva às ${maisChuvosa.hora}`)
  }

  const maisFria = faixas.reduce((pior, f) => (f.temp < pior.temp ? f : pior))
  const tempNaSaida = faixas[0].temp
  const queda = tempNaSaida - maisFria.temp

  // A queda térmica existe para o caso "está quente agora": sai de camiseta às
  // 17h com 23° e volta às 23h com 15°.
  if (maisFria.temp <= FRIO || queda >= QUEDA_TERMICA) {
    itens.push({
      nome: maisFria.temp <= FRIO_INTENSO ? 'casaco' : 'casaco leve',
      motivo:
        queda >= QUEDA_TERMICA
          ? `sai com ${tempNaSaida}° e volta com ${maisFria.temp}°`
          : `${maisFria.temp}° por volta das ${maisFria.hora}`,
    })
    base.push(`mínima de ${maisFria.temp}° às ${maisFria.hora}`)
  }

  if (itens.length === 0) return null

  return {
    id: 'preparo',
    tipo: 'preparo',
    nivel: 'info',
    etiqueta: 'levar',
    titulo: `Leve ${listar(itens.map((i) => i.nome))}`,
    corpo:
      `Você fica fora de casa das ${paraHorario(janela.de)} às ` +
      `${paraHorario(janela.ate)} — a volta é estimada com o mesmo tempo da ida.`,
    itens,
    base,
    eventos: eventos.filter((e) => e.deslocamento > 0).map((e) => e.id),
  }
}

/**
 * Regra 4 — chuva atrapalhando o deslocamento.
 *
 * É sobre tempo, não sobre objetos: chuva no trânsito pede margem extra.
 * Guarda-chuva é assunto da regra 3 e não aparece aqui.
 */
function chuvaNoDeslocamento(
  eventos: EventoBase[],
  previsao: Previsao,
  chegadaJaQuestionada: Set<string>,
): Insight[] {
  const insights: Insight[] = []

  for (const evento of eventos) {
    if (evento.deslocamento === 0) continue
    if (chegadaJaQuestionada.has(evento.id)) continue

    const chegada = paraMinutos(evento.inicio)
    const partida = chegada - evento.deslocamento
    const faixas = faixasNaJanela(previsao, partida, chegada)
    if (faixas.length === 0) continue

    const maisChuvosa = faixas.reduce((pior, f) => (f.chuva > pior.chuva ? f : pior))
    if (maisChuvosa.chuva < CHUVA_PROVAVEL) continue

    const chance = emPorcento(maisChuvosa.chuva)
    insights.push({
      id: `clima-${evento.id}`,
      tipo: 'clima',
      nivel: 'info',
      etiqueta: 'chuva no caminho',
      titulo: `Chuva no caminho até ${evento.nome}`,
      corpo:
        `São ${chance} de chuva por volta das ${maisChuvosa.hora} e ` +
        `${formatarDuracao(evento.deslocamento)} de deslocamento. ` +
        `Trânsito na chuva costuma render menos.`,
      sugestao: `Sair ${MARGEM_POR_CHUVA}min mais cedo, às ${paraHorario(partida - MARGEM_POR_CHUVA)}, cobre o imprevisto.`,
      base: [
        `${chance} de chuva às ${maisChuvosa.hora}`,
        `saída prevista às ${paraHorario(partida)}`,
        `${formatarDuracao(evento.deslocamento)} de caminho`,
      ],
      eventos: [evento.id],
    })
  }

  return insights
}

/** Regra 5 — carga do dia. */
function cargaDoDia(eventos: EventoBase[]): Insight | null {
  if (eventos.length === 0) return null

  const { comprometido } = resumoDoDia(eventos)
  if (comprometido < CARGA_ALTA) return null

  const primeiro = eventos[0]
  const ultimo = eventos[eventos.length - 1]
  const total = formatarDuracao(comprometido)

  return {
    id: 'carga',
    tipo: 'carga',
    nivel: 'atencao',
    etiqueta: 'dia cheio',
    titulo: `${total} comprometidas hoje`,
    corpo:
      `São ${eventos.length} compromissos entre ${primeiro.inicio} e ` +
      `${ultimo.fim}, somando ${total}. Um dia desses costuma não caber o ` +
      `que sobrou dos outros.`,
    sugestao: `Se algo puder esperar, hoje é um bom dia para adiar.`,
    base: [
      `${total} em compromissos`,
      `${eventos.length} eventos`,
      `das ${primeiro.inicio} às ${ultimo.fim}`,
    ],
    eventos: eventos.map((e) => e.id),
  }
}

/** Regra 6 — janela livre. */
function janelaLivre(
  anterior: EventoBase,
  seguinte: EventoBase,
  vao: number,
): Insight | null {
  const livre = vao - seguinte.deslocamento
  if (livre < JANELA_LIVRE_MINIMA) return null

  const sobra = formatarDuracao(livre)
  const base = [`${formatarDuracao(vao)} entre ${anterior.fim} e ${seguinte.inicio}`]
  if (seguinte.deslocamento > 0) {
    base.push(`${formatarDuracao(seguinte.deslocamento)} de deslocamento`)
  }
  base.push(`${sobra} sem compromisso`)

  return {
    id: `janela-${anterior.id}-${seguinte.id}`,
    tipo: 'janela',
    nivel: 'bom',
    etiqueta: 'livre',
    titulo: `${sobra} livres depois de ${anterior.nome}`,
    corpo:
      `Entre ${anterior.fim} e ${seguinte.inicio} você tem ${formatarDuracao(vao)}` +
      (seguinte.deslocamento > 0
        ? `, e ${formatarDuracao(seguinte.deslocamento)} disso é caminho até ${seguinte.nome}`
        : '') +
      `. Sobram ${sobra} sem compromisso.`,
    sugestao: `Dá para resolver algo aqui sem comprometer ${seguinte.nome}.`,
    base,
    eventos: [anterior.id, seguinte.id],
  }
}

// ---------------------------------------------------------------------------
// Apoio
// ---------------------------------------------------------------------------

function ordenarPorInicio(eventos: EventoBase[]): EventoBase[] {
  return [...eventos].sort((a, b) => paraMinutos(a.inicio) - paraMinutos(b.inicio))
}

/**
 * `Array#sort` é estável desde a ES2019, então a ordem de inserção se
 * preserva dentro do mesmo nível.
 */
function porNivel(insights: Insight[]): Insight[] {
  return [...insights].sort((a, b) => ORDEM_NIVEL[a.nivel] - ORDEM_NIVEL[b.nivel])
}

/**
 * A janela fora de casa: da saída para o primeiro evento com deslocamento até
 * a volta do último. Eventos com deslocamento 0 são remotos ou em casa e não
 * tiram ninguém de casa. A volta assume o mesmo tempo da ida — é estimativa,
 * e aparece declarada no texto do cartão.
 */
function janelaForaDeCasa(eventos: EventoBase[]): { de: number; ate: number } | null {
  const foraDeCasa = eventos.filter((e) => e.deslocamento > 0)
  if (foraDeCasa.length === 0) return null

  const primeiro = foraDeCasa[0]
  const ultimo = foraDeCasa[foraDeCasa.length - 1]

  return {
    de: paraMinutos(primeiro.inicio) - primeiro.deslocamento,
    ate: paraMinutos(ultimo.fim) + ultimo.deslocamento,
  }
}

/** Faixas de previsão que cobrem algum trecho da janela `[de, ate]`. */
function faixasNaJanela(previsao: Previsao, de: number, ate: number): HoraPrevisao[] {
  return previsao.horas.filter((faixa) => {
    const inicio = paraMinutos(faixa.hora)
    return inicio < ate && inicio + DURACAO_FAIXA > de
  })
}

function emPorcento(probabilidade: number): string {
  return `${Math.round(probabilidade * 100)}%`
}

/** ["guarda-chuva", "casaco leve"] → "guarda-chuva e casaco leve" */
function listar(nomes: string[]): string {
  if (nomes.length <= 1) return nomes.join('')
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}
