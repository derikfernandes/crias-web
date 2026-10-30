import type { AdminUser } from '../types/adminUser'
import type { Student } from '../types/student'
import type { StudentTrail } from '../types/studentTrail'
import type { Trail } from '../types/trail'

/**
 * Turma e matérias (INTERFACE.md 1.3.8 a 1.3.18).
 * - Aluno: `turma` (uma por aluno, texto, ex.: "8º A").
 * - Trilha: `subject` (matéria, já existe). Turma da trilha: calculada pelas turmas dos alunos vinculados
 *   (sem campo novo).
 * - Usuário de gestão: `materias[]`, `turmas[]` e `trail_ids[]` (vínculos). Super admin e Gestão: todas
 *   (lista vazia ou ausente = todas). Professor: só as marcadas no cadastro.
 * CONFLITO 1.3.E.2 e 1.3.E.3: os campos do usuário são novos no banco e o filtro do Professor precisa ser
 * aplicado também no servidor. Aqui a interface só reflete.
 */

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' })

/** Ordem natural: "8º A" < "8º B" < "9º A" < "1º A" do médio fica pelo número. */
export function sortTurmas(list: Iterable<string>): string[] {
  return [...new Set([...list].map((t) => t.trim()).filter(Boolean))].sort(collator.compare)
}

/** "8º A, 8º B" ou "N/A". */
export function joinList(list: string[] | null | undefined, empty = 'N/A'): string {
  return list && list.length ? list.join(', ') : empty
}

/** Turmas de cada trilha, pelas turmas dos alunos vinculados (1.3.8). */
export function turmasByTrail(links: StudentTrail[], students: Student[]): Map<string, string[]> {
  const turmaOf = new Map(students.map((s) => [s.id, (s.turma ?? '').trim()]))
  const acc = new Map<string, Set<string>>()
  for (const l of links) {
    const t = turmaOf.get(l.student_id)
    if (!t) continue
    const set = acc.get(l.trail_id) ?? new Set<string>()
    set.add(t)
    acc.set(l.trail_id, set)
  }
  return new Map([...acc].map(([k, v]) => [k, sortTurmas(v)]))
}

/** Turmas existentes de uma ou mais instituições (para listas de escolha). */
export function turmasOf(students: Student[], institutionIds?: Set<string>): string[] {
  return sortTurmas(
    students.filter((s) => !institutionIds || institutionIds.has(s.institution_id)).map((s) => s.turma ?? ''),
  )
}

/** Matérias existentes (das trilhas). */
export function materiasOf(trails: Trail[]): string[] {
  return sortTurmas(trails.map((t) => t.subject ?? ''))
}

export type Scope = {
  /** null = todas. */
  materias: string[] | null
  turmas: string[] | null
  isProfessor: boolean
}

/** Escopo do usuário logado (1.3.18). Professor sem nada marcado não vê dados de matéria nem de turma. */
export function scopeOf(user: Pick<AdminUser, 'is_super_admin' | 'is_master' | 'materias' | 'turmas'> | null): Scope {
  if (!user || user.is_super_admin || user.is_master) return { materias: null, turmas: null, isProfessor: false }
  return { materias: user.materias ?? [], turmas: user.turmas ?? [], isProfessor: true }
}

export function trailInScope(scope: Scope, trail: Pick<Trail, 'subject'>): boolean {
  if (!scope.materias) return true
  return scope.materias.includes((trail.subject ?? '').trim())
}

export function studentInScope(scope: Scope, student: Pick<Student, 'turma'>): boolean {
  if (!scope.turmas) return true
  return scope.turmas.includes((student.turma ?? '').trim())
}
