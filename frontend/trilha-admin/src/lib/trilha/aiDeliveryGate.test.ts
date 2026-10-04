import { describe, expect, it, vi } from 'vitest'

import {
  resolveAiDeliveryForTrigger,
  shouldEnsureAiOnTrigger,
} from './aiDeliveryGate'

const pendingAi = {
  stage_type: 'ai' as const,
  ai_status: 'pending' as const,
  content: null,
}

const readyAi = {
  stage_type: 'ai' as const,
  ai_status: 'ready' as const,
  content: 'Entendi, combinado.',
}

const fixed = {
  stage_type: 'fixed' as const,
  ai_status: 'not_applicable' as const,
  content: 'Texto fixo',
}

describe('shouldEnsureAiOnTrigger (P0 Continuar-only)', () => {
  it('open + pending → false (sem ensure-ai)', () => {
    expect(shouldEnsureAiOnTrigger(pendingAi, 'open')).toBe(false)
  })

  it('continue + pending → true', () => {
    expect(shouldEnsureAiOnTrigger(pendingAi, 'continue')).toBe(true)
  })

  it('continue + ready / fixed → false', () => {
    expect(shouldEnsureAiOnTrigger(readyAi, 'continue')).toBe(false)
    expect(shouldEnsureAiOnTrigger(fixed, 'continue')).toBe(false)
  })
})

describe('resolveAiDeliveryForTrigger', () => {
  it('open pending → não chama ensure; devolve GET', async () => {
    const ensure = vi.fn(async () => ({
      ...pendingAi,
      ai_status: 'ready' as const,
      content: 'gerado',
    }))
    const out = await resolveAiDeliveryForTrigger(pendingAi, 'open', ensure)
    expect(ensure).not.toHaveBeenCalled()
    expect(out).toEqual(pendingAi)
  })

  it('click Continuar + pending → chama ensure', async () => {
    const ensured = {
      ...pendingAi,
      ai_status: 'ready' as const,
      content: 'Aula gerada',
    }
    const ensure = vi.fn(async () => ensured)
    const out = await resolveAiDeliveryForTrigger(
      pendingAi,
      'continue',
      ensure,
    )
    expect(ensure).toHaveBeenCalledTimes(1)
    expect(out).toEqual(ensured)
  })

  it('refresh/reabrir (open) com ready → sem ensure (A2)', async () => {
    const ensure = vi.fn(async () => readyAi)
    const out = await resolveAiDeliveryForTrigger(readyAi, 'open', ensure)
    expect(ensure).not.toHaveBeenCalled()
    expect(out.content).toBe('Entendi, combinado.')
  })
})
