import { describe, expect, it, vi } from 'vitest'

import { ensureTrailAiContent } from './ensureTrailAiContent'

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

const baseSeed = {
  'student_trails/s1_trail_t1': {
    student_id: 's1',
    trail_id: 't1',
    institution_id: 'i1',
    current_stage_number: 2,
    current_question_number: 1,
    status: 'in_progress',
  },
  'trail_stages/t1_stage_2': {
    stage_type: 'ai',
    prompt: 'Explica',
    title: 'Frações',
  },
  'trail_stage_questions/t1_stage_2_q_1': {
    content: 'Seed',
    is_released: true,
  },
  'students/s1': {
    name: 'Ana',
    student_level: 2,
    institution_id: 'i1',
  },
}

describe('ensureTrailAiContent idempotency', () => {
  it('reusa cache ready sem chamar Gemini', async () => {
    const db = memoryDb({
      ...baseSeed,
      'trail_ai_deliveries/s1_t1_2_1': {
        student_id: 's1',
        trail_id: 't1',
        stage_number: 2,
        question_number: 1,
        message_text: 'Já entregue',
        status: 'ready',
        log_id: 'log1',
      },
    })
    const generate = vi.fn()
    const result = await ensureTrailAiContent(
      db as never,
      { student_id: 's1', trail_id: 't1' },
      { GEMINI_API_KEY: 'x' },
      generate as never,
    )
    expect(result.generated).toBe(false)
    expect(result.content).toBe('Já entregue')
    expect(generate).not.toHaveBeenCalled()
  })

  it('2× ensure paralelo → 1 generate + 1 log + 1 cache', async () => {
    const db = memoryDb({ ...baseSeed })
    let resolveGen: ((v: { text: string; model: string }) => void) | null =
      null
    const generate = vi.fn(
      () =>
        new Promise<{ text: string; model: string }>((resolve) => {
          resolveGen = resolve
        }),
    )

    const p1 = ensureTrailAiContent(
      db as never,
      { student_id: 's1', trail_id: 't1', stage_number: 2, question_number: 1 },
      { GEMINI_API_KEY: 'x' },
      generate as never,
    )
    // Deixa o claim do p1 assentar.
    await new Promise((r) => setTimeout(r, 20))
    const p2 = ensureTrailAiContent(
      db as never,
      { student_id: 's1', trail_id: 't1', stage_number: 2, question_number: 1 },
      { GEMINI_API_KEY: 'x' },
      generate as never,
    )
    await new Promise((r) => setTimeout(r, 20))
    expect(generate).toHaveBeenCalledTimes(1)
    resolveGen?.({ text: '*Título*|||Corpo único.', model: 'gemini-test' })

    const [a, b] = await Promise.all([p1, p2])
    expect(a.content).toBe('*Título*\n\nCorpo único.')
    expect(b.content).toBe('*Título*\n\nCorpo único.')
    expect([a.generated, b.generated].filter(Boolean)).toHaveLength(1)

    const logs = [...db._store.entries()].filter(([k]) =>
      k.startsWith('conversation_logs/'),
    )
    expect(logs).toHaveLength(1)
    const cache = db._store.get('trail_ai_deliveries/s1_t1_2_1')
    expect(cache?.status).toBe('ready')
    expect(cache?.message_text).toBe('*Título*\n\nCorpo único.')
  })
})
