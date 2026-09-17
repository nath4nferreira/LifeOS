import { useState } from 'react'
import './DicaDeInstalacao.css'

const CHAVE = 'lifeos.dica-instalacao'

/**
 * A dica de "Adicionar à Tela de Início" no iOS.
 *
 * Existe por uma assimetria das plataformas: no Android o Chrome oferece a
 * instalação sozinho, e no iOS o Safari não oferece nada — o caminho existe,
 * mas está escondido dentro do menu Compartilhar. Sem a dica, a metade iOS do
 * público nunca descobre que o app é instalável.
 *
 * É dica e não modal: aparece no rodapé do conteúdo, não bloqueia nada e sai
 * com um toque. Quem dispensa não vê de novo — insistir numa sugestão já
 * recusada é o app não aceitar a resposta.
 */
export function DicaDeInstalacao() {
  const [visivel, setVisivel] = useState(precisaDaDica)

  if (!visivel) return null

  function dispensar() {
    setVisivel(false)
    try {
      window.localStorage.setItem(CHAVE, 'dispensada')
    } catch {
      // Navegação privada. Some nesta sessão e volta na próxima; nada quebra.
    }
  }

  return (
    <aside className="dica-instalacao">
      <p className="dica-instalacao-texto">
        Dá para instalar o LifeOS: toque em <strong>Compartilhar</strong> e depois em{' '}
        <strong>Adicionar à Tela de Início</strong>.
      </p>
      <button type="button" className="dica-instalacao-fechar" onClick={dispensar}>
        Entendi
      </button>
    </aside>
  )
}

/**
 * Só no iOS, só fora do modo instalado, só se ainda não foi dispensada.
 *
 * O teste de iPad é por `maxTouchPoints` porque desde o iPadOS 13 o Safari do
 * iPad se identifica como Macintosh no `userAgent` — procurar "iPad" ali não
 * acha mais nada.
 */
function precisaDaDica(): boolean {
  const ua = navigator.userAgent
  const iPhone = /iPad|iPhone|iPod/.test(ua)
  const iPad = ua.includes('Macintosh') && navigator.maxTouchPoints > 1
  if (!iPhone && !iPad) return false

  // `display-mode: standalone` é a resposta de "já está instalado?". Se já
  // está, a dica seria instrução para uma coisa que a pessoa já fez.
  if (window.matchMedia('(display-mode: standalone)').matches) return false

  try {
    return window.localStorage.getItem(CHAVE) === null
  } catch {
    return true
  }
}
