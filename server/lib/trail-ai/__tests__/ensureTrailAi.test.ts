import { describe, expect, it, vi } from 'vitest'

import { ensureTrailAiContent } from '../ensureTrailAiContent'

type DocData = Record<string, unknown>

function memoryDb(seed: Record<string, DocData>) {
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
    let orderDesc = false
    let limitN = 100
    const api = {
      where(field: string, op: string, value: unknown) {
        filters.push({ field, op, value })
        return api
      },
      orderBy(_field: string, dir?: string) {
        orderDesc = dir === 'desc'
        return api
      },
      limit(n: number) {
        limitN = n
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
        if (orderDesc) {
          rows = [...rows].reverse()
        }
        rows = rows.slice(0, limitN)
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

const collections = {
  students: 'students',
  trails: 'trails',
  studentTrails: 'student_trails',
  trailStages: 'trail_stages',
  trailStageQuestions: 'trail_stage_questions',
  conversationLogs: 'conversation_logs',
  exerciseAttempts: 'exercise_attempts',
  idempotencyKeys: 'idempotency_keys',
}

describe('ensureTrailAiContent', () => {
  it('reusa delivery existente sem chamar Gemini', async () => {
    const db = memoryDb({
      'student_trails/s1_trail_t1': {
        student_id: 's1',
        trail_id: 't1',
        institution_id: 'i1',
        current_stage_number: 1,
        current_question_number: 1,
        status: 'in_progress',
        progress_version: 3,
      },
      'conversation_logs/log1': {
        student_id: 's1',
        trail_id: 't1',
        stage_number: 1,
        question_number: 1,
        sender: 'system',
        message_text: 'Aula já entregue no WA',
        created_at: 1,
      },
    })

    const generate = vi.fn()
    const result = await ensureTrailAiContent(
      db as never,
      { student_id: 's1', trail_id: 't1', channel: 'app' },
      collections,
      {},
      generate as never,
    )

    expect(result.generated).toBe(false)
    expect(result.content).toBe('Aula já entregue no WA')
    expect(generate).not.toHaveBeenCalled()
  })

  it('gera, formata ||| e persiste quando não há log', async () => {
    const db = memoryDb({
      'student_trails/s1_trail_t1': {
        student_id: 's1',
        trail_id: 't1',
        institution_id: 'i1',
        current_stage_number: 2,
        current_question_number: 1,
        status: 'in_progress',
        progress_version: 1,
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
      },
    })

    const generate = vi.fn(async () => ({
      text: '*Frações*|||Primeiro parágrafo.',
      model: 'gemini-2.0-flash',
    }))

    const result = await ensureTrailAiContent(
      db as never,
      { student_id: 's1', trail_id: 't1', channel: 'app' },
      collections,
      { GEMINI_API_KEY: 'x' },
      generate as never,
    )

    expect(result.generated).toBe(true)
    expect(result.content).toBe('*Frações*\n\nPrimeiro parágrafo.')
    expect(generate).toHaveBeenCalledOnce()
    const persisted = [...db._store.entries()].find(([k]) =>
      k.startsWith('conversation_logs/'),
    )
    expect(persisted?.[1].message_text).toBe('*Frações*\n\nPrimeiro parágrafo.')
    expect(persisted?.[1].sender).toBe('system')
  })
})
