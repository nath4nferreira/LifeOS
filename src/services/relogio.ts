/**
 * Quem sabe que horas são.
 *
 * `core/` e `utils/` são puros e nunca leem o relógio do sistema — recebem a
 * data como argumento. Este módulo é a única fonte do "agora" no app, e mora
 * em `services/` justamente por não ser portável: depende do fuso da máquina.
 */

/** Hoje em ISO local ("2026-09-17"). Local, não UTC: o dia do usuário é o dele. */
export function hojeISO(): string {
  return emISO(new Date())
}

/** Minutos desde a meia-noite de agora. Usado pelo marcador da trilha. */
export function agoraEmMinutos(): number {
  const agora = new Date()
  return agora.getHours() * 60 + agora.getMinutes()
}

function emISO(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${data.getFullYear()}-${mes}-${dia}`
}
