/**
 * Confirma a regra de Ativos (7 dias) usada no Início.
 * Sol sozinha = 10 e Todas = 11 (medido no preview) implica +1 em Crias/Teste.
 */
import { describe, expect, it } from 'vitest'
import { activeStudentsLast7Days } from './gestaoMetrics'
import type { ExerciseAttempt } from '../types/exerciseAttempt'

function ts(ms: number) {
  return { toMillis: () => ms }
}

describe('Ativos 7 dias (confirmação Sol 10 / Todas 11)', () => {
  const now = Date.parse('2026-10-23T12:00:00Z')
  const recent = now - 2 * 24 * 60 * 60 * 1000
  const old = now - 30 * 24 * 60 * 60 * 1000

  it('conta alunos ativos com tentativa recente; instituições extras somam', () => {
    const solActive = new Set(
      Array.from({ length: 10 }, (_, i) => `sol-${i}`),
    )
    const solAttempts = [...solActive].map(
      (id) =>
        ({
          student_id: id,
          attempted_at: ts(recent),
        }) as ExerciseAttempt,
    )
    // Um aluno inativo recente em Sol não entra.
    solAttempts.push({
      student_id: 'sol-inactive',
      attempted_at: ts(recent),
    } as ExerciseAttempt)

    expect(
      activeStudentsLast7Days({
        activeStudentIds: solActive,
        attempts: solAttempts,
        now,
      }),
    ).toBe(10)

    const criasActive = new Set(['crias-1'])
    const allActive = new Set([...solActive, ...criasActive])
    const allAttempts = [
      ...solAttempts,
      {
        student_id: 'crias-1',
        attempted_at: ts(recent),
      } as ExerciseAttempt,
      // Teste: tentativa antiga não soma.
      {
        student_id: 'teste-old',
        attempted_at: ts(old),
      } as ExerciseAttempt,
    ]

    expect(
      activeStudentsLast7Days({
        activeStudentIds: allActive,
        attempts: allAttempts,
        now,
      }),
    ).toBe(11)
  })
})
