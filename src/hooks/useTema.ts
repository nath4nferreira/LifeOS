import { useCallback, useState } from 'react'

const CHAVE = 'lifeos.tema'

export const TEMAS = ['sistema', 'claro', 'escuro'] as const
export type Tema = (typeof TEMAS)[number]

/**
 * O tema escolhido, e a função que o troca.
 *
 * São três opções, não duas. "Sistema" precisa ser um valor de verdade e não
 * a ausência de escolha: sem ele, quem clicou em "claro" numa manhã fica
 * preso no claro para sempre, sem caminho de volta para acompanhar o aparelho.
 *
 * O DOM é a fonte da verdade da aparência — `data-theme` no `<html>`, lido
 * pelo CSS. Este hook escreve lá direto, sem efeito: a troca é um evento do
 * usuário, então acontece no manipulador, no mesmo instante do clique. Um
 * `useEffect` só adiaria a mesma escrita para depois da renderização.
 *
 * A primeira aplicação acontece antes do React, num script no `index.html`.
 * Fazer isso aqui pintaria a tela clara por um quadro antes de escurecer.
 */
export function useTema(): { tema: Tema; definirTema: (tema: Tema) => void } {
  const [tema, setTema] = useState<Tema>(temaSalvo)

  const definirTema = useCallback((novo: Tema) => {
    aplicar(novo)
    setTema(novo)
    try {
      window.localStorage.setItem(CHAVE, novo)
    } catch {
      // Navegação privada pode recusar a escrita. O tema vale para esta
      // sessão mesmo assim — não vale derrubar a tela por uma preferência.
    }
  }, [])

  return { tema, definirTema }
}

/** O que está salvo, ou "sistema" se não houver nada válido. */
export function temaSalvo(): Tema {
  try {
    const salvo = window.localStorage.getItem(CHAVE)
    return ehTema(salvo) ? salvo : 'sistema'
  } catch {
    return 'sistema'
  }
}

/**
 * Escreve a escolha no `<html>`. "sistema" REMOVE o atributo em vez de
 * escrever um terceiro valor: é a ausência de `data-theme` que devolve o
 * `color-scheme: light dark` do `:root` e volta a seguir o aparelho.
 */
export function aplicar(tema: Tema): void {
  if (tema === 'sistema') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.dataset.theme = tema
}

function ehTema(valor: unknown): valor is Tema {
  return TEMAS.includes(valor as Tema)
}
