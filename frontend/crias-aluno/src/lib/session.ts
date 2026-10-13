export type StudentSession = {
  student_id: string
  institution_id: string
  name: string
  phone_number: string
}

const KEY = 'crias_student_session'

/** Disparado quando a sessão some (logout / auth / wipe). */
export const SESSION_CLEARED_EVENT = 'crias:session-cleared'

export function getSession(): StudentSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StudentSession
    if (!parsed?.student_id || !parsed?.institution_id) return null
    return parsed
  } catch {
    return null
  }
}

/** Sessão válida ou null — nunca lança. */
export function requireSession(): StudentSession | null {
  return getSession()
}

export function setSession(session: StudentSession): void {
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function clearSession(reason?: 'logout' | 'auth' | 'missing'): void {
  localStorage.removeItem(KEY)
  try {
    window.dispatchEvent(
      new CustomEvent(SESSION_CLEARED_EVENT, {
        detail: { reason: reason ?? 'logout' },
      }),
    )
  } catch {
    /* ignore */
  }
}
