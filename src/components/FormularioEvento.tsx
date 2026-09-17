import { useId, useState, type FormEvent, type ReactNode } from 'react'
import type { Categoria, Evento, EventoBase } from '../types'
import { CATEGORIAS } from '../types'
import {
  comExcecaoEm,
  montarEvento,
  rascunhoDe,
  rascunhoVazio,
  sobreposicoesDe,
  validarRascunho,
  type ErrosDoRascunho,
  type RascunhoEvento,
} from '../core/validacao'
import { novoId } from '../services/identidade'
import { dataValida, formatarDataCurta } from '../utils/tempo'
import './FormularioEvento.css'

/** Os nomes que o usuário lê. A chave é do sistema, o rótulo é dele. */
const ROTULO_CATEGORIA: Record<Categoria, string> = {
  trabalho: 'Trabalho',
  estudos: 'Estudos',
  saude: 'Saúde',
  pessoal: 'Pessoal',
  casa: 'Casa',
  financas: 'Finanças',
}

/** Índice 0 = domingo, igual a `EventoFixo.diasDaSemana`. */
const DIAS = [
  { numero: 0, curto: 'D', longo: 'domingo' },
  { numero: 1, curto: 'S', longo: 'segunda-feira' },
  { numero: 2, curto: 'T', longo: 'terça-feira' },
  { numero: 3, curto: 'Q', longo: 'quarta-feira' },
  { numero: 4, curto: 'Q', longo: 'quinta-feira' },
  { numero: 5, curto: 'S', longo: 'sexta-feira' },
  { numero: 6, curto: 'S', longo: 'sábado' },
]

interface FormularioEventoProps {
  /** Data que o formulário abre preenchida — o dia que o usuário está vendo. */
  data: string
  /** Eventos já marcados no dia, para o aviso de sobreposição. */
  doDia: EventoBase[]
  aoSalvar: (evento: Evento) => Promise<void>
  /** Quando presente, o formulário edita este evento em vez de criar um novo. */
  evento?: Evento
  aoExcluir?: (id: string) => Promise<void>
  /** Chamado quando a edição termina — salva, exclui ou desiste. */
  aoFechar?: () => void
}

/**
 * Criação e edição de evento, pontual ou recorrente.
 *
 * É o mesmo formulário para os dois porque editar e criar são a mesma decisão
 * — reconhecer em vez de lembrar (heurística 6): quem edita vê os campos
 * preenchidos exatamente como salvou, não uma tela diferente.
 *
 * Decisões de usabilidade:
 *
 * - **Erro só aparece depois da primeira tentativa de salvar.** Reclamar de
 *   campo vazio enquanto a pessoa ainda está digitando é ruído; depois da
 *   primeira tentativa, a validação passa a ser ao vivo, para o erro sumir
 *   assim que for corrigido.
 * - **Sobreposição é aviso, não bloqueio.** O motor já lê conflito como
 *   insight crítico, e o usuário pode mesmo ter dois compromissos cruzados.
 *   Impedir seria o app decidindo por ele.
 * - **Excluir pergunta antes.** Ação destrutiva e irreversível pede confirmação
 *   explícita (heurística 5), e a confirmação tem saída clara (heurística 3).
 * - **A confirmação vai em região `aria-live`** — quem não vê a tela precisa
 *   saber que o evento foi salvo (heurística 1).
 *
 * Trocar de evento editado não reseta o estado sozinho: quem renderiza passa
 * `key={evento?.id ?? 'novo'}` e deixa o React refazer o componente.
 */
export function FormularioEvento({
  data,
  doDia,
  aoSalvar,
  evento,
  aoExcluir,
  aoFechar,
}: FormularioEventoProps) {
  const idBase = useId()
  const editando = evento !== undefined
  const [rascunho, setRascunho] = useState<RascunhoEvento>(() =>
    evento ? rascunhoDe(evento, data) : rascunhoVazio(data),
  )
  const [tentouSalvar, setTentouSalvar] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [confirmacao, setConfirmacao] = useState('')
  const [novaExcecao, setNovaExcecao] = useState('')

  const erros = validarRascunho(rascunho)
  const errosVisiveis: ErrosDoRascunho = tentouSalvar ? erros : {}
  // Ao editar, o próprio evento não conta como conflito consigo mesmo.
  const conflitos = sobreposicoesDe(rascunho, doDia, evento?.id)
  const recorrente = rascunho.tipo === 'fixo'
  /** Só faz sentido cancelar uma ocorrência de algo que já está salvo e repete. */
  const podeCancelarNoDia = evento?.tipo === 'fixo' && !evento.excecoes.includes(data)

  function alterar<C extends keyof RascunhoEvento>(campo: C, valor: RascunhoEvento[C]) {
    setRascunho((atual) => ({ ...atual, [campo]: valor }))
    setConfirmacao('')
  }

  function alternarDia(numero: number) {
    const marcados = rascunho.diasDaSemana
    alterar(
      'diasDaSemana',
      marcados.includes(numero)
        ? marcados.filter((d) => d !== numero)
        : [...marcados, numero].sort((a, b) => a - b),
    )
  }

  function adicionarExcecao() {
    if (!dataValida(novaExcecao) || rascunho.excecoes.includes(novaExcecao)) return
    alterar('excecoes', [...rascunho.excecoes, novaExcecao].sort())
    setNovaExcecao('')
  }

  /** Envolve toda escrita: trava o botão e engole o erro, que o hook já mostra. */
  async function executar(operacao: () => Promise<void>) {
    setSalvando(true)
    try {
      await operacao()
      return true
    } catch {
      // O hook de eventos já expõe a mensagem de erro na tela.
      return false
    } finally {
      setSalvando(false)
    }
  }

  async function enviar(submissao: FormEvent) {
    submissao.preventDefault()
    setTentouSalvar(true)
    if (Object.keys(erros).length > 0) return

    // Editar reaproveita o id; criar gera um novo. É a única diferença entre
    // os dois caminhos — o resto do formulário não sabe em qual modo está.
    const salvo = montarEvento(rascunho, evento?.id ?? novoId())
    const deuCerto = await executar(() => aoSalvar(salvo))
    if (!deuCerto) return

    if (editando) {
      aoFechar?.()
      return
    }

    setConfirmacao(
      recorrente
        ? `${salvo.nome} salvo para todas as semanas, até ${formatarDataCurta(rascunho.validoAte)}.`
        : `${salvo.nome} salvo para ${formatarDataCurta(rascunho.data)}.`,
    )
    // Limpa só o que muda de evento para evento: a data continua, porque
    // quem adiciona um compromisso costuma adicionar o seguinte no mesmo dia.
    setRascunho((atual) => ({ ...rascunhoVazio(data), tipo: atual.tipo }))
    setTentouSalvar(false)
  }

  async function excluir() {
    if (!evento || !aoExcluir) return
    if (await executar(() => aoExcluir(evento.id))) aoFechar?.()
  }

  /** Cancela uma ocorrência sem apagar a recorrência inteira. */
  async function cancelarNoDia() {
    if (evento?.tipo !== 'fixo') return
    if (await executar(() => aoSalvar(comExcecaoEm(evento, data)))) aoFechar?.()
  }

  return (
    <section className="formulario" aria-labelledby={`${idBase}-titulo`}>
      <h2 id={`${idBase}-titulo`} className="formulario-titulo">
        {editando ? `Editar ${evento.nome}` : 'Adicionar compromisso'}
      </h2>

      <form className="formulario-campos" onSubmit={enviar} noValidate>
        {/* Correspondência com o mundo real (heurística 2): "toda semana" é
            como as pessoas falam; "recorrência" é como os sistemas falam. */}
        <fieldset className="formulario-tipo">
          <legend className="campo-rotulo">Com que frequência</legend>
          {(
            [
              { valor: 'pontual', rotulo: 'Uma vez' },
              { valor: 'fixo', rotulo: 'Toda semana' },
            ] as const
          ).map((opcao) => (
            <label key={opcao.valor} className="formulario-tipo-opcao">
              <input
                type="radio"
                name={`${idBase}-tipo`}
                value={opcao.valor}
                checked={rascunho.tipo === opcao.valor}
                onChange={() => alterar('tipo', opcao.valor)}
              />
              <span>{opcao.rotulo}</span>
            </label>
          ))}
        </fieldset>

        <Campo id={`${idBase}-nome`} rotulo="Nome" erro={errosVisiveis.nome}>
          {(props) => (
            <input
              {...props}
              type="text"
              value={rascunho.nome}
              onChange={(e) => alterar('nome', e.target.value)}
              autoComplete="off"
              placeholder="Faculdade"
            />
          )}
        </Campo>

        <Campo id={`${idBase}-categoria`} rotulo="Categoria" erro={errosVisiveis.categoria}>
          {(props) => (
            <select
              {...props}
              value={rascunho.categoria}
              onChange={(e) => alterar('categoria', e.target.value)}
            >
              {CATEGORIAS.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {ROTULO_CATEGORIA[categoria]}
                </option>
              ))}
            </select>
          )}
        </Campo>

        {!recorrente && (
          <Campo id={`${idBase}-data`} rotulo="Data" erro={errosVisiveis.data}>
            {(props) => (
              <input
                {...props}
                type="date"
                value={rascunho.data}
                onChange={(e) => alterar('data', e.target.value)}
              />
            )}
          </Campo>
        )}

        <div className="formulario-par">
          <Campo id={`${idBase}-inicio`} rotulo="Início" erro={errosVisiveis.inicio}>
            {(props) => (
              <input
                {...props}
                type="time"
                value={rascunho.inicio}
                onChange={(e) => alterar('inicio', e.target.value)}
              />
            )}
          </Campo>

          <Campo id={`${idBase}-fim`} rotulo="Término" erro={errosVisiveis.fim}>
            {(props) => (
              <input
                {...props}
                type="time"
                value={rascunho.fim}
                onChange={(e) => alterar('fim', e.target.value)}
              />
            )}
          </Campo>
        </div>

        <Campo
          id={`${idBase}-deslocamento`}
          rotulo="Minutos de caminho"
          dica="Quanto tempo leva de casa até lá. 0 se for remoto ou em casa."
          erro={errosVisiveis.deslocamento}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              inputMode="numeric"
              min={0}
              value={rascunho.deslocamento}
              onChange={(e) => alterar('deslocamento', e.target.value)}
            />
          )}
        </Campo>

        {recorrente && (
          <>
            {/* Um grupo de caixas de seleção precisa de fieldset + legend: sem
                isso o leitor de tela anuncia sete caixas soltas sem dizer do quê. */}
            <fieldset
              className="formulario-dias"
              aria-invalid={errosVisiveis.diasDaSemana ? true : undefined}
              aria-describedby={
                errosVisiveis.diasDaSemana ? `${idBase}-dias-erro` : undefined
              }
            >
              <legend className="campo-rotulo">Dias da semana</legend>
              <div className="formulario-dias-lista">
                {DIAS.map((dia) => (
                  <label key={dia.numero} className="formulario-dia">
                    <input
                      type="checkbox"
                      checked={rascunho.diasDaSemana.includes(dia.numero)}
                      onChange={() => alternarDia(dia.numero)}
                    />
                    {/* A letra é a pista visual; o nome inteiro é o que o
                        leitor de tela lê, porque "S" sozinho não diz nada. */}
                    <span aria-hidden="true">{dia.curto}</span>
                    <span className="apenas-leitor-de-tela">{dia.longo}</span>
                  </label>
                ))}
              </div>
              {errosVisiveis.diasDaSemana && (
                <p id={`${idBase}-dias-erro`} className="campo-erro">
                  {errosVisiveis.diasDaSemana}
                </p>
              )}
            </fieldset>

            <div className="formulario-par">
              <Campo
                id={`${idBase}-valido-de`}
                rotulo="Vale a partir de"
                erro={errosVisiveis.validoDe}
              >
                {(props) => (
                  <input
                    {...props}
                    type="date"
                    value={rascunho.validoDe}
                    onChange={(e) => alterar('validoDe', e.target.value)}
                  />
                )}
              </Campo>

              <Campo
                id={`${idBase}-valido-ate`}
                rotulo="Vale até"
                dica="Impede que a aula apareça nas férias."
                erro={errosVisiveis.validoAte}
              >
                {(props) => (
                  <input
                    {...props}
                    type="date"
                    value={rascunho.validoAte}
                    onChange={(e) => alterar('validoAte', e.target.value)}
                  />
                )}
              </Campo>
            </div>

            {/* Exceções: cancelar uma ocorrência é adicionar a data aqui, e não
                editar uma instância de recorrência — o buraco clássico do modelo. */}
            <div className="formulario-excecoes">
              <Campo
                id={`${idBase}-excecao`}
                rotulo="Dias em que não acontece"
                dica="Feriado, semana de prova, viagem."
              >
                {(props) => (
                  <input
                    {...props}
                    type="date"
                    value={novaExcecao}
                    onChange={(e) => setNovaExcecao(e.target.value)}
                  />
                )}
              </Campo>

              <button
                type="button"
                className="formulario-excecao-adicionar"
                onClick={adicionarExcecao}
                disabled={!dataValida(novaExcecao)}
              >
                Adicionar exceção
              </button>

              {rascunho.excecoes.length > 0 && (
                <ul className="formulario-excecao-lista">
                  {rascunho.excecoes.map((excecao) => (
                    <li key={excecao} className="formulario-excecao">
                      <span>{formatarDataCurta(excecao)}</span>
                      <button
                        type="button"
                        onClick={() =>
                          alterar(
                            'excecoes',
                            rascunho.excecoes.filter((e) => e !== excecao),
                          )
                        }
                      >
                        Remover
                        <span className="apenas-leitor-de-tela">
                          {' '}
                          a exceção de {formatarDataCurta(excecao)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {/* Prevenção de erros (heurística 5): o aviso aparece antes de salvar,
            e mesmo assim deixa salvar. */}
        {conflitos.length > 0 && (
          <p className="formulario-aviso">
            <strong>Atenção:</strong> isso se sobrepõe a{' '}
            {conflitos.map((e) => `${e.nome} (${e.inicio}–${e.fim})`).join(', ')}. Você pode
            salvar assim mesmo — o LifeOS vai apontar o conflito na sua trilha.
          </p>
        )}

        {/* Editar algo que se repete mexe em todas as semanas. Dizer isso antes
            é mais honesto do que descobrir depois que a aula de ontem mudou. */}
        {editando && evento.tipo === 'fixo' && (
          <p className="formulario-aviso">
            Este compromisso se repete toda semana. O que você mudar aqui vale para
            todas as ocorrências.
          </p>
        )}

        <button type="submit" className="formulario-salvar" disabled={salvando}>
          {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Salvar compromisso'}
        </button>

        {editando && (
          <div className="formulario-acoes">
            {/* Saída clara (heurística 3): desistir é sempre um clique. */}
            <button
              type="button"
              className="formulario-acao"
              onClick={aoFechar}
              disabled={salvando}
            >
              Descartar alterações
            </button>

            {podeCancelarNoDia && (
              <button
                type="button"
                className="formulario-acao"
                onClick={cancelarNoDia}
                disabled={salvando}
              >
                Cancelar só em {formatarDataCurta(data)}
              </button>
            )}

            {aoExcluir &&
              (confirmandoExclusao ? (
                <p className="formulario-confirmar-exclusao">
                  <span>Excluir {evento.nome} de vez? Isso não tem como desfazer.</span>
                  <button
                    type="button"
                    className="formulario-acao formulario-acao-destrutiva"
                    onClick={excluir}
                    disabled={salvando}
                  >
                    Sim, excluir
                  </button>
                  <button
                    type="button"
                    className="formulario-acao"
                    onClick={() => setConfirmandoExclusao(false)}
                    disabled={salvando}
                  >
                    Manter
                  </button>
                </p>
              ) : (
                <button
                  type="button"
                  className="formulario-acao formulario-acao-destrutiva"
                  onClick={() => setConfirmandoExclusao(true)}
                  disabled={salvando}
                >
                  Excluir compromisso
                </button>
              ))}
          </div>
        )}

        <p className="formulario-confirmacao" role="status" aria-live="polite">
          {confirmacao}
        </p>
      </form>
    </section>
  )
}

/** Atributos que o campo precisa receber para o rótulo, o erro e a dica se ligarem a ele. */
interface AtributosDeCampo {
  id: string
  className: string
  'aria-invalid'?: true
  'aria-describedby'?: string
}

interface CampoProps {
  id: string
  rotulo: string
  dica?: string
  erro?: string
  children: (props: AtributosDeCampo) => ReactNode
}

/**
 * Rótulo, campo, dica e erro amarrados.
 *
 * Existe para que `aria-describedby` e `aria-invalid` não dependam de alguém
 * lembrar de escrevê-los em cada campo — a WCAG 3.3.1 e 3.3.2 falham em
 * silêncio, e um `<input>` sem `label` parece perfeito na tela.
 */
function Campo({ id, rotulo, dica, erro, children }: CampoProps) {
  const idDica = `${id}-dica`
  const idErro = `${id}-erro`
  const descritores = [dica ? idDica : '', erro ? idErro : ''].filter(Boolean).join(' ')

  return (
    <div className="campo">
      <label className="campo-rotulo" htmlFor={id}>
        {rotulo}
      </label>

      {children({
        id,
        className: 'campo-controle',
        ...(erro ? { 'aria-invalid': true as const } : {}),
        ...(descritores ? { 'aria-describedby': descritores } : {}),
      })}

      {dica && (
        <p id={idDica} className="campo-dica">
          {dica}
        </p>
      )}

      {erro && (
        <p id={idErro} className="campo-erro">
          {erro}
        </p>
      )}
    </div>
  )
}
