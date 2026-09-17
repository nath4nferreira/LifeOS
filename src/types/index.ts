/**
 * Modelo de dados do LifeOS.
 *
 * Tipos compartilhados entre lógica pura (`core/`, `utils/`), serviços e
 * interface. Como são apenas tipos, não carregam nenhuma dependência de
 * runtime — o que preserva a restrição de portabilidade de `core/` e `utils/`.
 */

/**
 * As categorias como lista, com o tipo derivado dela.
 *
 * A lista precisa existir em runtime — é o que popula o seletor do formulário
 * e o que a validação usa para recusar um valor inventado. Derivar o tipo da
 * lista impede que as duas coisas saiam de sincronia.
 */
export const CATEGORIAS = [
  'trabalho',
  'estudos',
  'saude',
  'pessoal',
  'casa',
  'financas',
] as const

export type Categoria = (typeof CATEGORIAS)[number]

/**
 * O que todo evento tem, independente de acontecer uma única vez ou se
 * repetir. É também o formato que o seletor entrega para o motor de insights:
 * o motor nunca vê recorrência.
 */
export interface EventoBase {
  id: string
  nome: string
  categoria: Categoria
  inicio: string // "19:30"
  fim: string // "22:30"
  deslocamento: number // minutos de ida, 0 = remoto ou em casa
}

/** Evento que acontece em uma data específica. */
export interface EventoPontual extends EventoBase {
  tipo: 'pontual'
  data: string // "2026-09-17" (ISO, só a data)
}

/**
 * Evento recorrente semanal.
 *
 * `validoDe`/`validoAte` existem para a aula não aparecer nas férias.
 * `excecoes` resolve "hoje a aula foi cancelada" sem precisar de um sistema
 * de edição de instância de recorrência: cancelar uma ocorrência é só
 * adicionar a data na lista.
 */
export interface EventoFixo extends EventoBase {
  tipo: 'fixo'
  diasDaSemana: number[] // 0=domingo … 6=sábado
  validoDe: string // início do semestre
  validoAte: string // fim do semestre
  excecoes: string[] // datas em que não acontece
}

export type Evento = EventoPontual | EventoFixo

export type TipoInsight =
  'conflito' | 'margem' | 'preparo' | 'clima' | 'carga' | 'janela' | 'sono'

export type NivelInsight = 'critico' | 'atencao' | 'info' | 'bom'

export interface ItemDePreparo {
  nome: string
  motivo: string
}

/**
 * Uma leitura do dia produzida pelo motor.
 *
 * `base` é obrigatório e deliberado: o LifeOS não deve parecer mágica, deve
 * ser auditável. Todo insight mostra de onde veio.
 */
export interface Insight {
  id: string
  tipo: TipoInsight
  nivel: NivelInsight
  etiqueta: string // rótulo curto no cartão
  titulo: string
  corpo: string
  sugestao?: string
  itens?: ItemDePreparo[] // usado por "preparo"
  base: string[] // os números que geraram o insight
  eventos: string[] // ids relacionados
}

/** Uma faixa de previsão. No plano gratuito da OpenWeather cobre 3 horas. */
export interface HoraPrevisao {
  hora: string // "19:00"
  temp: number // °C
  chuva: number // probabilidade de 0 a 1
}

/**
 * Previsão já normalizada pela rota serverless. `null` em qualquer ponto do
 * app significa "contexto de clima indisponível" — e o app segue funcionando.
 */
export interface Previsao {
  local: string
  tempAtual: number
  condicaoAtual: string
  horas: HoraPrevisao[]
}
