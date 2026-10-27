import { describe, expect, it } from 'vitest'

import {
  DEFAULT_TRAIL_GENERATE_TIMEOUT_MS,
  TRAIL_GENERATE_TIMEOUT_USER_MESSAGE,
  canAffordTrailGenerateCall,
  friendlyTrailGenerateError,
  remainingTrailGenerateTimeoutMs,
  resolveTrailGenerateTimeoutMs,
} from './timeout.js'

describe('trail generate timeout helpers', () => {
  it('resolveTrailGenerateTimeoutMs usa default ~125s e env TRAIL_GENERATE_TIMEOUT_MS', () => {
    expect(resolveTrailGenerateTimeoutMs({})).toBe(DEFAULT_TRAIL_GENERATE_TIMEOUT_MS)
    expect(
      resolveTrailGenerateTimeoutMs({
        TRAIL_GENERATE_TIMEOUT_MS: '130000',
      } as NodeJS.ProcessEnv),
    ).toBe(130_000)
  })

  it('remainingTrailGenerateTimeoutMs limita ao tempo restante do orçamento', () => {
    const started = 1_000_000
    expect(
      remainingTrailGenerateTimeoutMs(started, 125_000, started + 200_000, 290_000),
    ).toBe(90_000)
    expect(
      remainingTrailGenerateTimeoutMs(started, 125_000, started + 288_000, 290_000),
    ).toBe(2_000)
    expect(canAffordTrailGenerateCall(2_000)).toBe(false)
    expect(canAffordTrailGenerateCall(5_000)).toBe(true)
  })

  it('friendlyTrailGenerateError esconde generateContent/modelo em timeout', () => {
    expect(
      friendlyTrailGenerateError(
        'generateContent timeout após 25000ms (modelo=gemini-3.7-flash).',
      ),
    ).toBe(TRAIL_GENERATE_TIMEOUT_USER_MESSAGE)
    expect(friendlyTrailGenerateError('Informe habilidades.')).toBe(
      'Informe habilidades.',
    )
  })
})
