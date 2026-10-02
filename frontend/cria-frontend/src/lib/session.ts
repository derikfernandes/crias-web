export type StudentSession = {
  student_id: string
  institution_id: string
  name: string
  phone_number: string
}

const KEY = 'crias_student_session'

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

export function setSession(session: StudentSession): void {
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(KEY)
}
