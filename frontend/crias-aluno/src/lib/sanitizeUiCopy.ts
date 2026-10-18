/**
 * Normaliza texto de UI / bolhas para o vocabulário INTERFACE v1.1:
 * sem travessão/en-dash, sem "parceiro de estudo(s)", sem emoji 💬 de sistema.
 */
export function sanitizeUiCopy(input: string): string {
  if (!input) return input
  let t = input
  // Travessão / en-dash → hífen simples (CLAUDE/INTERFACE).
  t = t.replace(/\u2014/g, ' - ').replace(/\u2013/g, ' - ')
  t = t.replace(/\s+-\s+/g, ' - ')
  // Vocabulário antigo → monitor.
  t = t.replace(/parceiro de estudos/gi, 'monitor')
  t = t.replace(/parceiro de estudo/gi, 'monitor')
  // Emoji de CTA de sistema (bolhas legadas).
  t = t.replace(/\u{1F4AC}\s*/gu, '')
  return t
}
