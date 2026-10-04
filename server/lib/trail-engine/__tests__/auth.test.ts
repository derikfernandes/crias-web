import { afterEach, describe, expect, it } from 'vitest'

import { assertServiceBearer } from '../auth'
import { TrailEngineError } from '../errors'
import { buildStableIdempotencyKey } from '../idempotencyKey'

function headers(auth?: string): Headers {
  const h = new Headers()
  if (auth) h.set('Authorization', auth)
  return h
}

describe('assertServiceBearer', () => {
  const prev = { ...process.env }

  afterEach(() => {
    process.env.TRAIL_ENGINE_SERVICE_TOKEN = prev.TRAIL_ENGINE_SERVICE_TOKEN
    process.env.CHATIS_SERVICE_TOKEN = prev.CHATIS_SERVICE_TOKEN
    process.env.TRAIL_ENGINE_ALLOW_ANON = prev.TRAIL_ENGINE_ALLOW_ANON
    delete process.env.TRAIL_ENGINE_SERVICE_TOKEN
    delete process.env.CHATIS_SERVICE_TOKEN
    delete process.env.TRAIL_ENGINE_ALLOW_ANON
    if (prev.TRAIL_ENGINE_SERVICE_TOKEN)
      process.env.TRAIL_ENGINE_SERVICE_TOKEN = prev.TRAIL_ENGINE_SERVICE_TOKEN
    if (prev.CHATIS_SERVICE_TOKEN)
      process.env.CHATIS_SERVICE_TOKEN = prev.CHATIS_SERVICE_TOKEN
    if (prev.TRAIL_ENGINE_ALLOW_ANON)
      process.env.TRAIL_ENGINE_ALLOW_ANON = prev.TRAIL_ENGINE_ALLOW_ANON
  })

  it('rejeita avanço anónimo sem token configurado', () => {
    delete process.env.TRAIL_ENGINE_SERVICE_TOKEN
    delete process.env.CHATIS_SERVICE_TOKEN
    delete process.env.TRAIL_ENGINE_ALLOW_ANON
    expect(() => assertServiceBearer(headers())).toThrow(TrailEngineError)
    try {
      assertServiceBearer(headers('Bearer x'))
    } catch (e) {
      expect(e).toBeInstanceOf(TrailEngineError)
      expect((e as TrailEngineError).code).toBe('unauthorized')
    }
  })

  it('aceita Bearer correcto', () => {
    process.env.TRAIL_ENGINE_SERVICE_TOKEN = 'secret-token'
    expect(() =>
      assertServiceBearer(headers('Bearer secret-token')),
    ).not.toThrow()
  })

  it('rejeita Bearer errado', () => {
    process.env.TRAIL_ENGINE_SERVICE_TOKEN = 'secret-token'
    expect(() => assertServiceBearer(headers('Bearer other'))).toThrow(
      TrailEngineError,
    )
  })

  it('ALLOW_ANON=1 bypass', () => {
    delete process.env.TRAIL_ENGINE_SERVICE_TOKEN
    process.env.TRAIL_ENGINE_ALLOW_ANON = '1'
    expect(() => assertServiceBearer(headers())).not.toThrow()
  })
})

describe('buildStableIdempotencyKey', () => {
  it('é determinística para o mesmo estado', () => {
    const a = buildStableIdempotencyKey({
      channel: 'whatsapp',
      student_id: 's1',
      trail_id: 't1',
      intent: 'advance_stage',
      stage: 2,
      question: 1,
      progress_version: 0,
    })
    const b = buildStableIdempotencyKey({
      channel: 'whatsapp',
      student_id: 's1',
      trail_id: 't1',
      intent: 'advance_stage',
      stage: 2,
      question: 1,
      progress_version: 0,
    })
    expect(a).toBe(b)
    expect(a).toBe('whatsapp:s1:t1:advance_stage:2:1:v0')
  })

  it('muda quando a versão muda (novo advance legítimo)', () => {
    const v0 = buildStableIdempotencyKey({
      channel: 'whatsapp',
      student_id: 's1',
      trail_id: 't1',
      intent: 'advance_stage',
      stage: 3,
      question: 1,
      progress_version: 1,
    })
    const v1 = buildStableIdempotencyKey({
      channel: 'whatsapp',
      student_id: 's1',
      trail_id: 't1',
      intent: 'advance_stage',
      stage: 3,
      question: 1,
      progress_version: 2,
    })
    expect(v0).not.toBe(v1)
  })
})
