import { describe, expect, it } from 'vitest'
import { composeStudentPanel, letterOf } from './studentPanelService.js'

const ts = (ms: number) => ({ toMillis: () => ms })

const base = {
  student: {
    id: 's1',
    name: 'Ana',
    phone_number: '11900000001',
    email: 'ana@escola.org',
    login_identifier: 'email',
  },
  links: [{ student_id: 's1', trail_id: 't1', status: 'in_progress', current_question_number: 2, current_stage_number: 1 }],
  trails: [{ id: 't1', name: 'Matemática básica' }],
  stages: [{ trail_id: 't1', stage_number: 2, stage_type: 'exercise' }],
  questions: [1, 2, 3].flatMap((q) => [
    { id: `t1_stage_1_q_${q}`, trail_id: 't1', stage_number: 1, question_number: q, title: `Atividade ${q} — Tema ${q}`, content: 'x', is_released: q <= 2, active: true },
    { id: `t1_stage_2_q_${q}`, trail_id: 't1', stage_number: 2, question_number: q, title: `Atividade ${q}`, content: `Pergunta ${q}\nA) a\nB) b`, correct_option: 'B', is_released: q <= 2, active: true, annulled: q === 3 },
  ]),
  attempts: [
    { trail_id: 't1', stage_number: 2, question_number: 1, is_correct: true, student_answer: 'B', correct_option: 'B', attempted_at: ts(1) },
    { trail_id: 't1', stage_number: 2, question_number: 2, is_correct: false, student_answer: 'A', correct_option: 'B', attempted_at: ts(2) },
    { trail_id: 't1', stage_number: 2, question_number: 3, is_correct: false, student_answer: 'A', correct_option: 'B', attempted_at: ts(3) },
  ],
  logs: [
    { sender: 'student', trail_id: 't1', question_number: 2, message_text: 'O que é fração?', created_at: ts(86400000 * 3), metadata: { source: 'maria-tutor' } },
    { sender: 'student', trail_id: 't1', question_number: 2, message_text: 'E porcentagem?', created_at: ts(86400000 * 3 + 5), metadata: { source: 'maria-tutor' } },
    { sender: 'student', trail_id: 'Tutor - Maria', message_text: 'Oi', created_at: ts(86400000 * 4), metadata: { source: 'maria-tutor' } },
    { sender: 'system', trail_id: 't1', message_text: 'resposta', created_at: ts(1), metadata: { source: 'maria-tutor' } },
  ],
}

describe('painel do aluno', () => {
  const p = composeStudentPanel(base)

  it('lista atividades com o estado de cada uma', () => {
    expect(p.trails[0].activities.map((a) => a.state)).toEqual(['done', 'current', 'blocked'])
    expect(p.trails[0].released).toBe(2)
    expect(p.trails[0].done).toBe(1)
    expect(p.trails[0].activities[0].title).toBe('Tema 1')
  })

  it('conta acertos e erros e deixa as anuladas de fora', () => {
    expect(p.performance.correct).toBe(1)
    expect(p.performance.wrong).toBe(1)
    expect(p.performance.pct).toBe(50)
    expect(p.errors).toHaveLength(1)
    expect(p.errors[0]).toMatchObject({
      trail_id: 't1',
      activity: 2,
      answer: 'A',
      correct: 'B',
    })
  })

  it('devolve email, login_identifier e turma (vazia se ausente)', () => {
    expect(p.student).toMatchObject({
      id: 's1',
      email: 'ana@escola.org',
      login_identifier: 'email',
      turma: '',
    })
  })

  it('devolve turma quando preenchida no doc', () => {
    const withTurma = composeStudentPanel({
      ...base,
      student: { ...base.student, turma: '  7A  ' },
    })
    expect(withTurma.student.turma).toBe('7A')
  })

  it('resume o uso do monitor e agrupa as dúvidas por atividade', () => {
    expect(p.monitor).toMatchObject({ questions: 3, outside: 1 })
    expect(p.monitor.by_trail).toEqual([{ trail_id: 't1', name: 'Matemática básica', questions: 2 }])
    expect(p.doubts[0]).toMatchObject({ activity: 2, count: 2, last_question: 'E porcentagem?' })
  })

  it('converte gabarito numérico em letra', () => {
    expect(letterOf('2')).toBe('B')
    expect(letterOf('(c)')).toBe('C')
    expect(letterOf('')).toBe('')
  })
})
