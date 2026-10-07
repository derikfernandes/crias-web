import type { StudentTrailRow } from './api'

/** Trilha em foco recente no player (home CTA / Continuar aula). */
const FOCUS_KEY = 'crias_student_trail_focus'

export function readFocusedTrailId(): string | null {
  try {
    const raw = localStorage.getItem(FOCUS_KEY)
    const id = typeof raw === 'string' ? raw.trim() : ''
    return id || null
  } catch {
    return null
  }
}

export function writeFocusedTrailId(trailId: string): void {
  const id = trailId.trim()
  if (!id) return
  try {
    localStorage.setItem(FOCUS_KEY, id)
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * CTA da home / sidebar: prioriza a trilha que o aluno abriu por último
 * (foco recente). Sem foco, primeira em andamento / não iniciada.
 * updated_at da API costuma vir null — não confiar nele.
 */
export function pickHomeTrail(
  rows: StudentTrailRow[] | null | undefined,
  focusedTrailId?: string | null,
): StudentTrailRow | null {
  if (!rows || rows.length === 0) return null
  const focus = (focusedTrailId ?? readFocusedTrailId())?.trim() || null
  if (focus) {
    const focused = rows.find(
      (r) => r.trail_id === focus && r.status !== 'blocked',
    )
    if (focused) return focused
  }
  return (
    rows.find((r) => r.status === 'in_progress') ||
    rows.find((r) => r.status === 'not_started') ||
    rows.find((r) => r.status !== 'blocked') ||
    rows[0]
  )
}
