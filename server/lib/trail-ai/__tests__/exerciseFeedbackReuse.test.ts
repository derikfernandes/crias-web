import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../geminiClient', async (orig) => {
  const actual = await orig<typeof import('../geminiClient')>()
  return { ...actual, generateContentWithGemini: vi.fn() }
})

import { createConversationLog } from '../../conversationLogService'
import {
  advanceStudentTrailProgress,
  ensureNextBlocoRespostaFeedback,
  getNextContent,
  peekNextBlocoRespostaCached,
} from '../../studentTrailProgressService'
import { getTrailHistoryPage } from '../../trail-engine/getHistory'
import { createMemoryFirestore } from '../../trail-engine/__tests__/memoryFirestore'
import { generateContentWithGemini } from '../geminiClient'

const generateMock = vi.mocked(generateContentWithGemini)

/**
 * Espelho da t58: S1 IA, S2 exercício, S3 IA de feedback (título qualquer,
 * sem marcador “BLOCO RESPOSTA”), S4 fixo. Aluno parado no exercício.
 */
function seedT58Like() {
  const mem = createMemoryFirestore()
  mem.seed('students', 's1745', { name: 'Aluno Teste', student_level: 2, institution_id: 'i4', active: true })
  mem.seed('trails', 't58', { institution_id: 'i4', title: 'CITE', active: true })
  const stages: Array<[number, string, string, string | null]> = [
    [1, 'ai', 'Explicação e Contextualização', 'Explique o conceito.'],
    [2, 'exercise', 'Desafio Prático', null],
    [3, 'ai', 'Feedback Formativo', 'Comente a resposta do aluno ao desafio anterior.'],
    [4, 'fixed', 'Encerramento', null],
  ]
  for (const [n, type, title, prompt] of stages) {
    mem.seed('trail_stages', `t58_stage_${n}`, {
      trail_id: 't58', stage_number: n, stage_type: type, title, prompt, active: true,
    })
    mem.seed('trail_stage_questions', `t58_stage_${n}_q_1`, {
      trail_id: 't58', stage_number: n, question_number: 1, is_released: true, active: true,
      content: n === 2 ? 'Qual é a premissa da Metodologia CITE?\nA) Tecnologia\nB) Problemas reais\nC) Prédios' : `Conteúdo base ${n}`,
      options: n === 2 ? ['A) Tecnologia', 'B) Problemas reais', 'C) Prédios'] : null,
      correct_option: n === 2 ? 'B' : null,
      explanation: null,
    })
  }
  mem.seed('student_trails', 's1745_trail_t58', {
    student_id: 's1745', trail_id: 't58', institution_id: 'i4', status: 'in_progress',
    current_stage_number: 2, current_question_number: 1, progress_version: 3,
  })
  return mem
}

beforeEach(() => {
  generateMock.mockReset()
  process.env.GEMINI_API_KEY = 'test'
  delete process.env.TRAIL_AI_DISABLED
})

describe('feedback do exercício é reusado no Continuar (sem 2ª chamada à IA)', () => {
  it('envio gera 1x; advance + next-content reusam; histórico tem 1 feedback', async () => {
    const mem = seedT58Like()
    const db = mem.db as never
    generateMock.mockResolvedValue({ text: 'Feedback da tentativa: você escolheu A; a premissa é B.', model: 'gemini-test' })

    // 1) Aluno no exercício: next-content NÃO pré-gera a fase de feedback.
    const atExercise = await getNextContent(db, 's1745', 't58')
    expect(atExercise.ok).toBe(true)
    if (atExercise.ok) await atExercise.background
    expect(generateMock).toHaveBeenCalledTimes(0)

    // 2) Envio da resposta (POST /exercise_attempts) → 1 geração com a resposta.
    const feedback = await ensureNextBlocoRespostaFeedback(db, {
      student_id: 's1745', trail_id: 't58', stage_number: 2, question_number: 1,
      is_correct: false, student_answer: 'A', has_gabarito: true,
    })
    expect(feedback).toBe('Feedback da tentativa: você escolheu A; a premissa é B.')
    expect(generateMock).toHaveBeenCalledTimes(1)
    const prompt = generateMock.mock.calls[0]![0] as { userText: string }
    expect(prompt.userText).toContain('Alternativa escolhida pelo aluno: A) Tecnologia')

    // Persistido como entrega da célula de feedback (S3).
    const delivery = mem.getData('trail_ai_deliveries', 's1745_t58_3_1')
    expect(delivery?.message_text).toBe(feedback)
    expect(delivery?.source).toBe('exercise_feedback')
    expect(delivery?.shown_as_exercise_feedback).toBe(true)

    // Replay do envio devolve o mesmo texto, sem IA.
    expect(
      await peekNextBlocoRespostaCached(db, { student_id: 's1745', trail_id: 't58', stage_number: 2, question_number: 1 }),
    ).toBe(feedback)

    // O player grava resposta + feedback (como hoje).
    for (const [sender, text, type, source] of [
      ['student', 'A) Tecnologia', 'text', 'exercise_answer'],
      ['system', feedback!, 'feedback', 'exercise_feedback'],
    ] as const) {
      await createConversationLog(db, 'conversation_logs', {
        student_id: 's1745', trail_id: 't58', stage_number: 2, question_number: 1,
        sender, message_text: text, institution_id: 'i4', message_type: type,
        metadata: { source, channel: 'app' },
      })
    }

    // 3) Continuar: advance (pré-aquece o destino IA) + next-content.
    const adv = await advanceStudentTrailProgress(db, 's1745', 't58', { expected_version: 3 })
    expect(adv.ok).toBe(true)
    if (adv.ok) await adv.background
    const next = await getNextContent(db, 's1745', 't58')
    expect(next.ok).toBe(true)
    if (!next.ok || next.data.status !== 'ok') throw new Error('next-content falhou')
    if (next.background) await next.background
    expect(next.data.stage_number).toBe(3)
    expect(next.data.content).toBe(feedback)
    expect(next.data.exercise_feedback).toBe(true)
    expect(generateMock).toHaveBeenCalledTimes(1)

    // Nenhum log trail-ai extra na célula de feedback.
    const trailAiLogs = mem.list('conversation_logs').filter(
      (l) => (l.data.metadata as { source?: string } | null)?.source === 'trail-ai',
    )
    expect(trailAiLogs).toHaveLength(0)

    // 4) Histórico pós-reload: o feedback aparece exatamente uma vez.
    const history = await getTrailHistoryPage(db, { student_id: 's1745', trail_id: 't58', limit: 0 })
    const feedbackRows = history.logs.filter((l) => l.message_text === feedback)
    expect(feedbackRows).toHaveLength(1)
  })

  it('fase seguinte ao exercício não é IA → sem feedback e sem chamada', async () => {
    const mem = seedT58Like()
    mem.seed('trail_stages', 't58_stage_3', {
      trail_id: 't58', stage_number: 3, stage_type: 'fixed', title: 'Texto fixo', active: true,
    })
    const out = await ensureNextBlocoRespostaFeedback(mem.db as never, {
      student_id: 's1745', trail_id: 't58', stage_number: 2, question_number: 1,
      is_correct: true, student_answer: 'B', has_gabarito: true,
    })
    expect(out).toBeNull()
    expect(generateMock).not.toHaveBeenCalled()
  })
})
