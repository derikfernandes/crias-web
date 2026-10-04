import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./geminiClient', async (orig) => {
  const actual = await orig<typeof import('./geminiClient')>()
  return { ...actual, generateContentWithGemini: vi.fn() }
})

import {
  alignBlocoWithAttempt,
  ensureNextBlocoRespostaFeedback,
} from '../studentTrailProgressService'
import {
  buildAttemptContentSection,
  generateExerciseAttemptFeedback,
} from './ensureTrailAiContent'
import { generateContentWithGemini } from './geminiClient'

type DocData = Record<string, unknown>

function memoryDb(seed: Record<string, DocData> = {}) {
  const store = new Map<string, DocData>(Object.entries(seed))
  let auto = 0

  function col(name: string) {
    return {
      doc(id?: string) {
        const docId = id ?? `auto_${++auto}`
        const key = `${name}/${docId}`
        return {
          id: docId,
          async get() {
            const data = store.get(key)
            return {
              id: docId,
              exists: data !== undefined,
              data: () => data,
            }
          },
          async set(data: DocData, opts?: { merge?: boolean }) {
            const prev = store.get(key) ?? {}
            store.set(key, opts?.merge ? { ...prev, ...data } : { ...data })
          },
          async create(data: DocData) {
            if (store.has(key)) {
              const err = new Error('ALREADY_EXISTS') as Error & {
                code?: number
              }
              err.code = 6
              throw err
            }
            store.set(key, { ...data })
          },
          async delete() {
            store.delete(key)
          },
        }
      },
      where(field: string, op: string, value: unknown) {
        return query(name, [{ field, op, value }])
      },
    }
  }

  function query(
    name: string,
    filters: Array<{ field: string; op: string; value: unknown }>,
  ) {
    const api = {
      where(field: string, op: string, value: unknown) {
        filters.push({ field, op, value })
        return api
      },
      orderBy() {
        return api
      },
      limit() {
        return api
      },
      async get() {
        let rows = [...store.entries()]
          .filter(([k]) => k.startsWith(`${name}/`))
          .map(([k, data]) => ({
            id: k.slice(name.length + 1),
            data: () => data,
          }))
        for (const f of filters) {
          rows = rows.filter((r) => r.data()?.[f.field] === f.value)
        }
        return { docs: rows, empty: rows.length === 0 }
      },
    }
    return api
  }

  return {
    collection: col,
    _store: store,
  }
}


/**
 * Espelho do caso real (prod, 04/10 17:48 BRT): trilha t47 “Programa Aurora”,
 * Exercício 2 de 3 = stage 9 / q89, BLOCO RESPOSTA = stage 10 / q89.
 */
const BLOCO_PROMPT =
  'OBJETIVO - BLOCO RESPOSTA\nRetornar a resposta do último exercício\n\nLÓGICA DA MENSAGEM\n- Retome a resposta do exercício conforme enunciado e gabarito.\n- Parabenize os acertos e incentive o aluno nos erros, sempre explicando de forma simples e objetiva a resposta.'
const EXERCISE =
  '*Qual o comprimento do arco de 120º em um círculo de raio 6 cm?*\n\n(A) 4π cm\n(B) 6π cm\n(C) 12π cm'

/** Texto que estava em cache na célula S10 Q89 (gerado antes da resposta). */
const CACHED_GENERIC_BLOCO = [
  '*🤔 Resposta*',
  '',
  '✅ *A resposta correta é a letra A*.',
  '',
  'Para calcular o *comprimento do arco*, usamos a fórmula _Arco = (θ / 360) ⋅ 2 ⋅ π ⋅ r_. Substituindo os valores do exercício, temos: _(120 / 360) ⋅ 2 ⋅ π ⋅ 6 = (1/3) ⋅ 12π = 4π cm_. Parabéns se você acertou! Se errou dessa vez, não se preocupe: o segredo é simplificar a fração da volta completa com calma.',
  '',
  '💬 _Se surgir alguma dúvida, a Maria te ajuda. Para avançar, *continue*._',
].join('\n')

function t47Seed(): Record<string, DocData> {
  const seed: Record<string, DocData> = {
    'student_trails/s1745_trail_t47': {
      student_id: 's1745',
      trail_id: 't47',
      institution_id: 'i2',
      current_stage_number: 9,
      current_question_number: 89,
      status: 'in_progress',
    },
    'students/s1745': {
      name: 'Dérik Fernandes',
      student_level: 2,
      institution_id: 'i2',
    },
  }
  for (let s = 1; s <= 12; s++) {
    seed[`trail_stages/t47_stage_${s}`] = {
      trail_id: 't47',
      stage_number: s,
      stage_type: s === 9 ? 'exercise' : 'ai',
      title: s === 9 ? '✏️ Exercício 2 de 3' : s === 10 ? '🤔 Resposta' : `Etapa ${s}`,
      prompt: s === 10 ? BLOCO_PROMPT : s === 9 ? null : 'OBJETIVO - BLOCO X',
      active: true,
    }
  }
  seed['trail_stage_questions/t47_stage_9_q_89'] = {
    trail_id: 't47',
    stage_number: 9,
    question_number: 89,
    content: EXERCISE,
    correct_option: '1',
    options: null,
    explanation: null,
    is_released: true,
  }
  seed['trail_stage_questions/t47_stage_10_q_89'] = {
    trail_id: 't47',
    stage_number: 10,
    question_number: 89,
    content: '✅ *A resposta correta é a letra A*',
    is_released: true,
  }
  return seed
}

const generateMock = vi.mocked(generateContentWithGemini)

beforeEach(() => {
  generateMock.mockReset()
  process.env.GEMINI_API_KEY = 'test'
  delete process.env.TRAIL_AI_DISABLED
})

describe('feedback do exercício — contexto da IA (bug t47 S9 q89)', () => {
  it('prompt traz enunciado, opções, gabarito, comando da escola e a resposta do aluno', async () => {
    const db = memoryDb(t47Seed())
    const generate = vi.fn(async () => ({
      text: 'Feedback da IA para esta tentativa.',
      model: 'gemini-test',
    }))
    const out = await generateExerciseAttemptFeedback(
      db as never,
      {
        student_id: 's1745',
        trail_id: 't47',
        stage_number: 10,
        question_number: 89,
        attempt: {
          stage_number: 9,
          question_number: 89,
          student_answer: 'B',
          is_correct: false,
        },
      },
      { GEMINI_API_KEY: 'x' },
      generate as never,
    )
    expect(out.content).toBe('Feedback da IA para esta tentativa.')
    expect(generate).toHaveBeenCalledTimes(1)
    const [{ userText, systemInstruction }] = generate.mock.calls[0] as unknown as [
      { userText: string; systemInstruction: string },
    ]
    for (const text of [userText, systemInstruction]) {
      expect(text).toContain('Qual o comprimento do arco de 120º')
      expect(text).toContain('(A) 4π cm')
      expect(text).toContain('(B) 6π cm')
      expect(text).toContain('GABARITO: letra A')
      expect(text).toContain('OBJETIVO - BLOCO RESPOSTA')
      expect(text).toContain('Parabenize os acertos e incentive o aluno nos erros')
      expect(text).toContain('Alternativa escolhida pelo aluno: B) 6π cm')
      expect(text).toContain('Resultado pelo gabarito: INCORRETA')
    }
  })

  it('sem gabarito: só a alternativa escolhida, sem veredito inventado', () => {
    const section = buildAttemptContentSection({
      student_answer: 'C',
      is_correct: null,
      options: [
        { key: 'A', text: 'A) 1' },
        { key: 'B', text: 'B) 2' },
        { key: 'C', text: 'C) 3' },
      ],
    })
    expect(section).toContain('Alternativa escolhida pelo aluno: C) 3')
    expect(section).not.toContain('Resultado')
  })

  it('ensureNextBlocoRespostaFeedback usa a IA da tentativa, não o BLOCO em cache', async () => {
    const db = memoryDb(t47Seed())
    generateMock.mockResolvedValueOnce({
      text: 'Texto gerado com a resposta B do aluno.',
      model: 'gemini-test',
    })
    const text = await ensureNextBlocoRespostaFeedback(db as never, {
      student_id: 's1745',
      trail_id: 't47',
      stage_number: 9,
      question_number: 89,
      is_correct: false,
      student_answer: 'B',
      has_gabarito: true,
    })
    expect(text).toBe('Texto gerado com a resposta B do aluno.')
    const call = generateMock.mock.calls[0]?.[0] as { userText: string }
    expect(call.userText).toContain('Alternativa escolhida pelo aluno: B) 6π cm')
    expect(call.userText).toContain('Resultado pelo gabarito: INCORRETA')
  })

  it('fallback (IA da tentativa falhou): BLOCO em cache não vira só título + fechamento', async () => {
    const db = memoryDb(t47Seed())
    generateMock
      .mockRejectedValueOnce(new Error('vertex 503'))
      .mockResolvedValueOnce({ text: CACHED_GENERIC_BLOCO, model: 'gemini-test' })
    const text = await ensureNextBlocoRespostaFeedback(db as never, {
      student_id: 's1745',
      trail_id: 't47',
      stage_number: 9,
      question_number: 89,
      is_correct: false,
      student_answer: 'B',
      has_gabarito: true,
    })
    expect(text).toBeTruthy()
    expect(text).toContain('A resposta correta é a letra A')
    expect(text).not.toBe(
      '*🤔 Resposta*\n\n💬 _Se surgir alguma dúvida, a Maria te ajuda. Para avançar, *continue*._',
    )
  })
})

describe('alignBlocoWithAttempt — texto real do bug', () => {
  it('não reduz o BLOCO a título + fechamento em tentativa errada', () => {
    const out = alignBlocoWithAttempt(CACHED_GENERIC_BLOCO, false)
    expect(out).toContain('A resposta correta é a letra A')
    expect(out.split('\n').filter((l) => l.trim()).length).toBeGreaterThan(2)
  })

  it('ainda remove celebração explícita quando há outro corpo', () => {
    const out = alignBlocoWithAttempt(
      '*🤔 Resposta*\n\nParabéns pelo acerto!\n\nA resposta correta é a letra A, pois 120/360 de 12π dá 4π.',
      false,
    )
    expect(out).not.toContain('Parabéns pelo acerto')
    expect(out).toContain('A resposta correta é a letra A')
  })
})
