/**
 * Canonicaliza telefone de aluno para identify (dígitos, BR +55).
 * Aceita "DDD + número" do placeholder sem exigir +55 na digitação.
 */
export function canonicalizeStudentPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return digits
  // 10 = DDD+fix · 11 = DDD+celular — prefixa 55 (país).
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`
  }
  return digits
}
