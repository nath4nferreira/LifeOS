import type { JSX } from 'react'
import './NavegacaoPrincipal.css'

export type Aba = 'dia' | 'adicionar' | 'alertas'

interface NavegacaoPrincipalProps {
  ativa: Aba
  aoSelecionar: (aba: Aba) => void
}

const ITENS: { aba: Aba; rotulo: string }[] = [
  { aba: 'dia', rotulo: 'Dia' },
  { aba: 'adicionar', rotulo: 'Adicionar' },
  { aba: 'alertas', rotulo: 'Alertas' },
]

/**
 * Navegação principal do app: barra fixa no rodapé no mobile, coluna à
 * esquerda no desktop. É o mesmo `<nav>` nos dois casos, só com outro CSS —
 * duplicar o elemento daria dois landmarks de navegação na árvore de
 * acessibilidade, e o leitor de tela anunciaria um menu que não existe.
 *
 * `aria-current="page"` marca a aba ativa para leitor de tela; a cor sozinha
 * nunca é a única pista.
 */
export function NavegacaoPrincipal({ ativa, aoSelecionar }: NavegacaoPrincipalProps) {
  return (
    <nav className="navegacao" aria-label="Navegação principal">
      {ITENS.map((item) => (
        <button
          key={item.aba}
          type="button"
          className="navegacao-item"
          aria-current={ativa === item.aba ? 'page' : undefined}
          onClick={() => aoSelecionar(item.aba)}
        >
          {ICONES[item.aba]}
          <span>{item.rotulo}</span>
        </button>
      ))}
    </nav>
  )
}

const ICONES: Record<Aba, JSX.Element> = {
  dia: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <rect x="3" y="5" width="18" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 9.5h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  ),
  adicionar: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  ),
  alertas: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 3v2.4M12 18.6V21M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M3 12h2.4M18.6 12H21M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  ),
}
