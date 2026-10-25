/**
 * Valida campos de aluno para não gravar texto de botão/bot/prompt
 * (ex.: "Continuar", "Confirmar cadastro") nem telefone BR inválido.
 */

const COMMAND_WORDS = [
  'continuar',
  'confirmar',
  'confirmar cadastro',
  'enviar',
  'salvar',
  'voltar',
  'avançar',
  'avancar',
  'próximo',
  'proximo',
  'anterior',
  'ok',
  'sim',
  'não',
  'nao',
  'cancelar',
  'entrar',
  'mostrar',
  'ocultar',
  'tentar de novo',
  'selecione',
  'selecionar',
]

/** Palavras/frases de UI que nunca devem ser nome ou escolaridade. */
export function isUiCommandText(raw: string): boolean {
  const s = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!s) return false
  if (COMMAND_WORDS.includes(s)) return true
  // "Fundamental · Confirmar cadastro" / sufixo de botão
  for (const w of COMMAND_WORDS) {
    if (s === w) return true
    if (s.endsWith(` ${w}`) || s.endsWith(`· ${w}`) || s.endsWith(`- ${w}`)) {
      return true
    }
    if (s.includes(` · ${w}`) || s.includes(` - ${w}`)) return true
  }
  return false
}

export function assertStudentName(name: string): string | null {
  const t = name.trim()
  if (!t) return 'Campo "name" é obrigatório'
  if (isUiCommandText(t)) {
    return 'Campo "name" inválido. Não use textos de botão ou comando.'
  }
  if (t.length < 2) return 'Campo "name" inválido.'
  return null
}

export function assertSchoolGrade(grade: string): string | null {
  const t = grade.trim()
  if (!t) return 'Campo "school_grade" é obrigatório'
  if (isUiCommandText(t)) {
    return 'Campo "school_grade" inválido. Não use textos de botão ou comando.'
  }
  return null
}

/**
 * Telefone BR canônico: 55 + DDD + número.
 * Móvel: 13 dígitos (55 + DDD + 9 + 8). Fixo: 12 dígitos (55 + DDD + 8).
 */
export function assertCanonicalBrPhone(digits: string): string | null {
  const d = digits.replace(/\D/g, '')
  if (!d) return 'Campo "phone_number" é obrigatório'
  if (!d.startsWith('55')) {
    return 'Telefone inválido. Use o formato brasileiro com DDI 55.'
  }
  if (d.length === 13) {
    // móvel: 55 + 2 DDD + 9 + 8
    const local = d.slice(4)
    if (!local.startsWith('9') || local.length !== 9) {
      return 'Telefone móvel inválido. Esperado 55 + DDD + 9 + 8 dígitos (13 no total).'
    }
    return null
  }
  if (d.length === 12) {
    // fixo: 55 + DDD + 8. Local 6–9 costuma ser móvel sem o 9 (ex.: 553171722016).
    const local = d.slice(4)
    if (/^[6-9]/.test(local)) {
      return 'Telefone móvel incompleto. Com DDI 55 use 13 dígitos (55 + DDD + 9 + 8).'
    }
    return null
  }
  return 'Telefone inválido. Com DDI 55 use 12 dígitos (fixo) ou 13 (móvel).'
}
