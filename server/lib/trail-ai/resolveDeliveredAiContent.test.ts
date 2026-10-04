import { describe, expect, it } from 'vitest'

import { trailAiDeliveryDocId } from './resolveDeliveredAiContent'

describe('trailAiDeliveryDocId', () => {
  it('gera id estável por célula', () => {
    expect(trailAiDeliveryDocId('s1', 't47', 8, 87)).toBe('s1_t47_8_87')
  })
})
