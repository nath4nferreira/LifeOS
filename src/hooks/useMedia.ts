import { useCallback, useMemo, useSyncExternalStore } from 'react'

/**
 * Uma media query como valor de React, que muda quando a janela muda.
 *
 * Existe porque o desktop não é "o mobile mais largo": o painel de contexto é
 * uma coluna inteira que não deve nem ser montada abaixo de 1025px. Fazer isso
 * só com `display: none` renderizaria um painel que ninguém vê.
 *
 * `useSyncExternalStore` em vez de `useState` + `useEffect` porque
 * `matchMedia` já é exatamente o que ele descreve: uma fonte externa que se
 * lê e se assina. De quebra, evita escrever estado dentro de efeito — o que a
 * regra `react-hooks/set-state-in-effect` proíbe, e com razão.
 */
export function useMedia(consulta: string): boolean {
  const lista = useMemo(() => window.matchMedia(consulta), [consulta])

  const assinar = useCallback(
    (avisar: () => void) => {
      lista.addEventListener('change', avisar)
      return () => lista.removeEventListener('change', avisar)
    },
    [lista],
  )

  return useSyncExternalStore(assinar, () => lista.matches)
}
