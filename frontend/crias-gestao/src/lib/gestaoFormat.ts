import type { Timestamp } from 'firebase/firestore'
import type { StudentTrailStatus } from '../types/studentTrail'

/** Data no formato dd/mm/aaaa. Ausente: "N/A". */
export function fmtDate(value: Timestamp | null | undefined): string {
  if (!value || typeof value.toDate !== 'function') return 'N/A'
  try {
    return value.toDate().toLocaleDateString('pt-BR')
  } catch {
    return 'N/A'
  }
}

export function fmtDateTime(value: Timestamp | null | undefined): string {
  if (!value || typeof value.toDate !== 'function') return 'N/A'
  try {
    return value.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return 'N/A'
  }
}

export const STATUS_LABEL: Record<StudentTrailStatus, string> = {
  not_started: 'Não iniciada',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  blocked: 'Bloqueada',
}

export function statusPillClass(status: StudentTrailStatus | null): string {
  if (status === 'completed') return 'gx-pill gx-pill--ok'
  if (status === 'in_progress') return 'gx-pill gx-pill--warn'
  if (status === 'blocked') return 'gx-pill gx-pill--err'
  return 'gx-pill'
}

/** Código do aluno: só o número (s12 ou al-012 vira 12). Sem número: null. */
export function studentCode(id: string): number | null {
  const m = /(\d+)\s*$/.exec(id)
  return m ? Number.parseInt(m[1], 10) : null
}

export function activePillClass(active: boolean): string {
  return active ? 'gx-pill gx-pill--ok' : 'gx-pill'
}
