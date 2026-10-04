import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import {
  advanceWithConflictHandling,
  TrilhaApiError,
} from './trilhaApi'

describe('advanceWithConflictHandling', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: () =>
        JSON.stringify({
          token: 'v1.test.token',
          student: {
            student_id: 's1',
            institution_id: 'i1',
            name: 'Teste',
            phone_number: '5512974085258',
            exp: Math.floor(Date.now() / 1000) + 3600,
          },
        }),
      setItem: () => undefined,
      removeItem: () => undefined,
    })
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllGlobals()
  })

  it('envia Idempotency-Key e trata 200 ok', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      expect(headers.get('Idempotency-Key')).toBe('app:s1:t1:advance:1:1:uuid')
      return new Response(
        JSON.stringify({
          status: 'ok',
          replay: false,
          next_stage_number: 1,
          next_question_number: 2,
          completed: false,
          progress_version: 2,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const outcome = await advanceWithConflictHandling({
      studentId: 's1',
      trailId: 't1',
      idempotencyKey: 'app:s1:t1:advance:1:1:uuid',
      expectedVersion: 1,
    })
    expect(outcome.kind).toBe('ok')
    if (outcome.kind === 'ok') {
      expect(outcome.result.next_question_number).toBe(2)
    }
  })

  it('trata replay silencioso', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: 'ok',
          replay: true,
          next_stage_number: 1,
          next_question_number: 1,
          completed: false,
          progress_version: 1,
        }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch

    const outcome = await advanceWithConflictHandling({
      studentId: 's1',
      trailId: 't1',
      idempotencyKey: 'key-replay',
    })
    expect(outcome.kind).toBe('replay')
  })

  it('409 conflict → resync via next-content', async () => {
    let call = 0
    globalThis.fetch = vi.fn(async (url: string | URL) => {
      call += 1
      const href = String(url)
      if (call === 1) {
        return new Response(
          JSON.stringify({
            status: 'error',
            code: 'conflict',
            error: 'progress_version divergente',
            progress_version: 5,
          }),
          { status: 409 },
        )
      }
      expect(href).toContain('facade=next-content')
      return new Response(
        JSON.stringify({
          status: 'ok',
          student_id: 's1',
          trail_id: 't1',
          stage_number: 2,
          question_number: 1,
          stage_type: 'fixed',
          content: 'Novo passo',
          prompt: null,
          options: null,
          explanation: null,
          is_released: true,
          next_action: 'deliver_content',
          progress_version: 5,
          title: null,
        }),
        { status: 200 },
      )
    }) as unknown as typeof fetch

    const outcome = await advanceWithConflictHandling({
      studentId: 's1',
      trailId: 't1',
      idempotencyKey: 'key-conflict',
      expectedVersion: 1,
    })
    expect(outcome.kind).toBe('conflict')
    if (outcome.kind === 'conflict') {
      expect(outcome.error).toBeInstanceOf(TrilhaApiError)
      expect(outcome.error.isConflict).toBe(true)
      const next = await outcome.resync()
      expect(next.stage_number).toBe(2)
      expect(next.progress_version).toBe(5)
    }
  })
})
