import { useEffect, useState } from 'react'
import { agoraEmMinutos } from '../services/relogio'

const UM_MINUTO = 60_000

/**
 * O minuto atual, que muda sozinho.
 *
 * Existe porque a trilha mostra onde o agora cai no dia: sem isto o marcador
 * congelaria no instante em que a página abriu, e um app de rotina aberto a
 * manhã inteira mentiria a manhã inteira.
 *
 * O primeiro tique é alinhado com a virada do minuto. Um `setInterval` de 60s
 * disparado às 10:00:59 só mostraria 10:01 às 10:01:59 — quase um minuto de
 * atraso permanente, justamente o erro que o marcador não pode ter.
 *
 * O intervalo roda mesmo quando o dia na tela não é hoje. É um tique por
 * minuto, e o preço de desligá-lo seria voltar com um valor velho na hora de
 * religar.
 */
export function useAgora(): number {
  const [minutos, setMinutos] = useState(agoraEmMinutos)

  useEffect(() => {
    let intervalo: number | undefined
    const tique = () => setMinutos(agoraEmMinutos())

    const alinhamento = window.setTimeout(
      () => {
        tique()
        intervalo = window.setInterval(tique, UM_MINUTO)
      },
      UM_MINUTO - (Date.now() % UM_MINUTO),
    )

    return () => {
      window.clearTimeout(alinhamento)
      if (intervalo !== undefined) window.clearInterval(intervalo)
    }
  }, [])

  return minutos
}
