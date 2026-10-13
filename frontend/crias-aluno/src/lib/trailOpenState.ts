/**
 * Halo na 1ª abertura + ordem por última aberta — localStorage por aluno.
 * Sem schema Firestore.
 */

type TrailOpenState = {
  /** trail_id → timestamp da última abertura */
  lastOpened: Record<string, number>
  /** trail_ids que já receberam o primeiro Continuar (halo encerrado) */
  haloDone: Record<string, true>
}

function storageKey(studentId: string): string {
  return `crias_student_trail_opens:${studentId.trim()}`
}

function readState(studentId: string): TrailOpenState {
  const id = studentId.trim()
  if (!id) return { lastOpened: {}, haloDone: {} }
  try {
    const raw = localStorage.getItem(storageKey(id))
    if (!raw) return { lastOpened: {}, haloDone: {} }
    const parsed = JSON.parse(raw) as Partial<TrailOpenState>
    return {
      lastOpened:
        parsed.lastOpened && typeof parsed.lastOpened === 'object'
          ? (parsed.lastOpened as Record<string, number>)
          : {},
      haloDone:
        parsed.haloDone && typeof parsed.haloDone === 'object'
          ? (parsed.haloDone as Record<string, true>)
          : {},
    }
  } catch {
    return { lastOpened: {}, haloDone: {} }
  }
}

function writeState(studentId: string, state: TrailOpenState): void {
  const id = studentId.trim()
  if (!id) return
  try {
    localStorage.setItem(storageKey(id), JSON.stringify(state))
  } catch {
    /* quota / private mode */
  }
}

/** Registra abertura da trilha (ordem da home + halo). */
export function markTrailOpened(studentId: string, trailId: string): void {
  const tid = trailId.trim()
  if (!studentId.trim() || !tid) return
  const state = readState(studentId)
  state.lastOpened[tid] = Date.now()
  writeState(studentId, state)
}

/** true enquanto o Continuar deve pulsar (1ª abertura até o 1º avanço). */
export function shouldShowContinueHalo(
  studentId: string,
  trailId: string,
): boolean {
  const tid = trailId.trim()
  if (!studentId.trim() || !tid) return false
  const state = readState(studentId)
  return !state.haloDone[tid]
}

/** Encerra o halo após o primeiro Continuar / avanço. */
export function markContinueHaloDone(studentId: string, trailId: string): void {
  const tid = trailId.trim()
  if (!studentId.trim() || !tid) return
  const state = readState(studentId)
  state.haloDone[tid] = true
  writeState(studentId, state)
}

/**
 * Ordena trilhas pela última abertura (mais recente primeiro).
 * Sem registro, mantém a ordem de entrada.
 */
export function sortTrailsByLastOpened<T extends { trail_id: string }>(
  studentId: string,
  rows: T[],
): T[] {
  if (!rows.length) return rows
  const state = readState(studentId)
  return [...rows].sort((a, b) => {
    const ta = state.lastOpened[a.trail_id] ?? 0
    const tb = state.lastOpened[b.trail_id] ?? 0
    if (ta === tb) return 0
    return tb - ta
  })
}
