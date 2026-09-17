/**
 * Identificadores de evento.
 *
 * Mora em `services/` porque depende do ambiente: `crypto` é do navegador, e
 * `core/` não pode tocar nele.
 */

/**
 * Um id único para um evento novo.
 *
 * `randomUUID` só existe em contexto seguro (https ou localhost). O
 * `getRandomValues` cobre o resto — colisão aqui não é um risco real, os
 * eventos são de um usuário só, mas a alternativa (`Math.random` + relógio)
 * colide de verdade quando dois eventos são criados no mesmo milissegundo.
 */
export function novoId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
