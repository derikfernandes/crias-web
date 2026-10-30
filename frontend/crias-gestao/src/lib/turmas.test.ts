import { describe, expect, it } from 'vitest'
import { scopeOf, sortTurmas, studentInScope, trailInScope, turmasByTrail } from './turmas'

describe('turma e matérias (1.3.8 a 1.3.18)', () => {
  it('ordena turmas pelo número', () => {
    expect(sortTurmas(['9º A', '8º B', '8º A', '8º A', ''])).toEqual(['8º A', '8º B', '9º A'])
  })
  it('turma da trilha vem dos alunos vinculados', () => {
    const students = [
      { id: 's1', turma: '8º B' },
      { id: 's2', turma: '8º A' },
      { id: 's3', turma: '' },
    ] as never
    const links = [
      { student_id: 's1', trail_id: 't1' },
      { student_id: 's2', trail_id: 't1' },
      { student_id: 's3', trail_id: 't1' },
    ] as never
    expect(turmasByTrail(links, students).get('t1')).toEqual(['8º A', '8º B'])
  })
  it('Professor só vê as matérias e turmas do cadastro; Gestão e Super admin veem tudo', () => {
    const prof = scopeOf({ is_super_admin: false, is_master: false, materias: ['Matemática'], turmas: ['8º A'] })
    expect(trailInScope(prof, { subject: 'Matemática' })).toBe(true)
    expect(trailInScope(prof, { subject: 'História' })).toBe(false)
    expect(studentInScope(prof, { turma: '8º B' })).toBe(false)
    const gestao = scopeOf({ is_super_admin: false, is_master: true })
    expect(trailInScope(gestao, { subject: 'História' })).toBe(true)
  })
})
