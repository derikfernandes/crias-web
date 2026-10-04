/**
 * Sessão aluno Trilha (localStorage) — token HMAC emitido por /api/trilha_auth.
 */

import { stripPhoneDigits } from './phoneNormalize'

export type TrilhaStudent = {
  student_id: string
  institution_id: string
  name: string
  phone_number: string
  exp: number
}

export type TrilhaSession = {
  token: string
  student: TrilhaStudent
}

const STORAGE_KEY = 'crias.trilha.student.session.v1'

export function loadTrilhaSession(): TrilhaSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TrilhaSession
    if (
      !parsed ||
      typeof parsed.token !== 'string' ||
      !parsed.token ||
      !parsed.student ||
      typeof parsed.student.student_id !== 'string'
    ) {
      return null
    }
    const now = Math.floor(Date.now() / 1000)
    if (typeof parsed.student.exp === 'number' && parsed.student.exp < now) {
      clearTrilhaSession()
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveTrilhaSession(session: TrilhaSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearTrilhaSession(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/** @deprecated prefer phoneNormalize.stripPhoneDigits / phoneForLogin */
export function normalizePhoneInput(value: string): string {
  return stripPhoneDigits(value)
}

export function newIdempotencyKey(
  studentId: string,
  trailId: string,
  stage: number,
  question: number,
): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `app:${studentId}:${trailId}:advance:${stage}:${question}:${uuid}`
}
