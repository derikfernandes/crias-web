/**
 * Espelho leve de server/lib/studentFieldValidation.ts para o formulário da Gestão.
 * Rejeita textos de botão/bot e telefone BR móvel incompleto.
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

export function isUiCommandText(raw: string): boolean {
  const s = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!s) return false
  if (COMMAND_WORDS.includes(s)) return true
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
  if (!t) return 'Informe o nome do aluno.'
  if (isUiCommandText(t)) {
    return 'Nome inválido. Não use textos de botão ou comando.'
  }
  if (t.length < 2) return 'Nome inválido.'
  return null
}

export function assertSchoolGrade(grade: string): string | null {
  const t = grade.trim()
  if (!t) return 'Informe a série/ano.'
  if (isUiCommandText(t)) {
    return 'Escolaridade inválida. Não use textos de botão ou comando.'
  }
  return null
}

export function assertCanonicalBrPhone(digits: string): string | null {
  const d = digits.replace(/\D/g, '')
  if (!d) return 'Informe o telefone do aluno.'
  if (!d.startsWith('55')) {
    return 'Telefone inválido. Use o formato brasileiro com DDI 55.'
  }
  if (d.length === 13) {
    const local = d.slice(4)
    if (!local.startsWith('9') || local.length !== 9) {
      return 'Telefone móvel inválido. Esperado 55 + DDD + 9 + 8 dígitos (13 no total).'
    }
    return null
  }
  if (d.length === 12) {
    const local = d.slice(4)
    if (/^[6-9]/.test(local)) {
      return 'Telefone móvel incompleto. Com DDI 55 use 13 dígitos (55 + DDD + 9 + 8).'
    }
    return null
  }
  return 'Telefone inválido. Com DDI 55 use 12 dígitos (fixo) ou 13 (móvel).'
}
