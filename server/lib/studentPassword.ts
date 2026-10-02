import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const PREFIX = 'scrypt'
const KEY_LEN = 32

/**
 * Hash de senha do aluno (Firestore `students.password_hash`).
 * Não usa Firebase Auth — telefone + instituição + senha no login via API.
 */
export function hashStudentPassword(plain: string): string {
  const normalized = plain.trim()
  if (normalized.length < 6) {
    throw new Error('Senha deve ter pelo menos 6 caracteres.')
  }
  const salt = randomBytes(16)
  const hash = scryptSync(normalized, salt, KEY_LEN)
  return `${PREFIX}$${salt.toString('base64')}$${hash.toString('base64')}`
}

export function verifyStudentPassword(
  plain: string,
  stored: string | null | undefined,
): boolean {
  if (!stored || typeof stored !== 'string') return false
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== PREFIX) return false
  const salt = Buffer.from(parts[1], 'base64')
  const expected = Buffer.from(parts[2], 'base64')
  if (expected.length !== KEY_LEN) return false
  const actual = scryptSync(plain.trim(), salt, KEY_LEN)
  return timingSafeEqual(actual, expected)
}
