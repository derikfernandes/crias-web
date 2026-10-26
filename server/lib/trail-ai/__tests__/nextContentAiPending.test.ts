import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../geminiClient', async (orig) => {
  const actual = await orig<typeof import('../geminiClient')>()
  return { ...actual, generateContentWithGemini: vi.fn() }
})

import { getNextContent } from '../../studentTrailProgressService'
import { createMemoryFirestore } from '../../trail-engine/__tests__/memoryFirestore'
import { generateContentWithGemini } from '../geminiClient'
import { PENDING_STALE_MS } from '../resolveDeliveredAiContent'

const generateMock = vi.mocked(generateContentWithGemini)

function seedAiFirstStage() {
  const mem = createMemoryFirestore()
  mem.seed('students', 's-demo', {
    name: 'Aluno Demo',
    student_level: 2,
    institution_id: 'i-demo',
    active: true,
  })
  mem.seed('trails', 't55', {
    institution_id: 'i-demo',
    title: 'Educação Financeira',
    active: true,
  })
  mem.seed('trail_stages', 't55_stage_1', {
    trail_id: 't55',
    stage_number: 1,
    stage_type: 'ai',
    title: 'Início',
    prompt: 'Abertura da demonstração.',
    active: true,
  })
  mem.seed('trail_stage_questions', 't55_stage_1_q_1', {
    trail_id: 't55',
    stage_number: 1,
    question_number: 1,
    is_released: true,
    active: true,
    content: 'Conteúdo base da etapa 1.',
    options: null,
    correct_option: null,
    explanation: null,
  })
  mem.seed('student_trails', 's-demo_trail_t55', {
    student_id: 's-demo',
    trail_id: 't55',
    institution_id: 'i-demo',
    status: 'in_progress',
    current_stage_number: 1,
    current_question_number: 1,
    progress_version: 0,
  })
  return mem
}

beforeEach(() => {
  generateMock.mockReset()
  process.env.GEMINI_API_KEY = 'test'
  delete process.env.TRAIL_AI_DISABLED
})

describe('getNextContent AI async (primeiro acesso)', () => {
  it('PENDING_STALE_MS é 90s', () => {
    expect(PENDING_STALE_MS).toBe(90_000)
  })

  it('sem cache: devolve ai_status=pending sem esperar Gemini', async () => {
    const mem = seedAiFirstStage()
    const db = mem.db as never
    let resolveGen: ((v: { text: string; model: string }) => void) | null =
      null
    const genStarted = new Promise<void>((resolveWait) => {
      generateMock.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveGen = resolve
            resolveWait()
          }),
      )
    })

    const started = Date.now()
    const next = await getNextContent(db, 's-demo', 't55')
    const elapsed = Date.now() - started

    expect(next.ok).toBe(true)
    if (!next.ok || next.data.status !== 'ok') throw new Error('next falhou')
    expect(elapsed).toBeLessThan(2_000)
    expect(next.data.ai_status).toBe('pending')
    expect(next.data.content).toBeNull()
    expect(next.data.stage_type).toBe('ai')

    const bg = next.background ?? Promise.resolve()
    await Promise.race([
      genStarted,
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error('Gemini não iniciou no background')), 5_000),
      ),
    ])
    expect(resolveGen).toBeTypeOf('function')
    resolveGen!({ text: 'Aula gerada pela IA.', model: 'gemini-test' })
    await bg

    expect(generateMock).toHaveBeenCalledTimes(1)

    const again = await getNextContent(db, 's-demo', 't55')
    expect(again.ok).toBe(true)
    if (!again.ok || again.data.status !== 'ok') throw new Error('2º next falhou')
    expect(again.data.ai_status).toBe('ready')
    expect(again.data.content).toContain('Aula gerada')
  })

  it('com cache ready: ai_status=ready sem chamar Gemini', async () => {
    const mem = seedAiFirstStage()
    mem.seed('trail_ai_deliveries', 's-demo_t55_1_1', {
      student_id: 's-demo',
      trail_id: 't55',
      stage_number: 1,
      question_number: 1,
      status: 'ready',
      source: 'trail-ai',
      message_text: 'Já no cache.',
      log_id: 'log1',
    })
    const db = mem.db as never

    const next = await getNextContent(db, 's-demo', 't55')
    expect(next.ok).toBe(true)
    if (!next.ok || next.data.status !== 'ok') throw new Error('next falhou')
    expect(next.data.ai_status).toBe('ready')
    expect(next.data.content).toBe('Já no cache.')
    expect(generateMock).toHaveBeenCalledTimes(0)
  })
})
