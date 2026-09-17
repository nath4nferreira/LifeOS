import { useId, useState, type FormEvent, type ReactNode } from 'react'
import type { Categoria, Evento, EventoBase } from '../types'
import { CATEGORIAS } from '../types'
import {
  minutosDeDeslocamento,
  rascunhoVazio,
  sobreposicoesDe,
  validarRascunho,
  type ErrosDoRascunho,
  type RascunhoEvento,
} from '../core/validacao'
import { novoId } from '../services/identidade'
import { formatarDataCurta } from '../utils/tempo'
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

interface FormularioEventoProps {
  /** Data que o formulário abre preenchida — o dia que o usuário está vendo. */
  data: string
  /** Eventos já marcados no dia, para o aviso de sobreposição. */
  doDia: EventoBase[]
  aoSalvar: (evento: Evento) => Promise<void>
}

/**
 * Criação de evento pontual.
 *
 * Três decisões de usabilidade:
 *
 * - **Erro só aparece depois da primeira tentativa de salvar.** Reclamar de
 *   campo vazio enquanto a pessoa ainda está digitando é ruído; depois da
 *   primeira tentativa, a validação passa a ser ao vivo, para o erro sumir
 *   assim que for corrigido.
 * - **Sobreposição é aviso, não bloqueio.** O motor já lê conflito como
 *   insight crítico, e o usuário pode mesmo ter dois compromissos cruzados.
 *   Impedir seria o app decidindo por ele.
 * - **A confirmação vai em região `aria-live`** — quem não vê a tela precisa
 *   saber que o evento foi salvo (heurística 1).
 */
export function FormularioEvento({ data, doDia, aoSalvar }: FormularioEventoProps) {
  const idBase = useId()
  const [rascunho, setRascunho] = useState<RascunhoEvento>(() => rascunhoVazio(data))
  const [tentouSalvar, setTentouSalvar] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmacao, setConfirmacao] = useState('')

  const erros = validarRascunho(rascunho)
  const errosVisiveis: ErrosDoRascunho = tentouSalvar ? erros : {}
  const conflitos = sobreposicoesDe(rascunho, doDia)

  function alterar(campo: keyof RascunhoEvento, valor: string) {
    setRascunho((atual) => ({ ...atual, [campo]: valor }))
    setConfirmacao('')
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setTentouSalvar(true)
    if (Object.keys(erros).length > 0) return

    setSalvando(true)
    try {
      await aoSalvar({
        tipo: 'pontual',
        id: novoId(),
        nome: rascunho.nome.trim(),
        categoria: rascunho.categoria as Categoria,
        data: rascunho.data,
        inicio: rascunho.inicio,
        fim: rascunho.fim,
        deslocamento: minutosDeDeslocamento(rascunho.deslocamento) ?? 0,
      })
      setConfirmacao(
        `${rascunho.nome.trim()} salvo para ${formatarDataCurta(rascunho.data)}.`,
      )
      // Limpa só o que muda de evento para evento: a data continua, porque
      // quem adiciona um compromisso costuma adicionar o seguinte no mesmo dia.
      setRascunho((atual) => ({ ...rascunhoVazio(atual.data) }))
      setTentouSalvar(false)
    } catch {
      // O hook de eventos já expõe a mensagem de erro na tela.
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section className="formulario" aria-labelledby={`${idBase}-titulo`}>
      <h2 id={`${idBase}-titulo`} className="formulario-titulo">
        Adicionar compromisso
      </h2>

      <form className="formulario-campos" onSubmit={enviar} noValidate>
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

        {/* Prevenção de erros (heurística 5): o aviso aparece antes de salvar,
            e mesmo assim deixa salvar. */}
        {conflitos.length > 0 && (
          <p className="formulario-aviso">
            <strong>Atenção:</strong> isso se sobrepõe a{' '}
            {conflitos.map((e) => `${e.nome} (${e.inicio}–${e.fim})`).join(', ')}. Você pode
            salvar assim mesmo — o LifeOS vai apontar o conflito na sua trilha.
          </p>
        )}

        <button type="submit" className="formulario-salvar" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar compromisso'}
        </button>

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
