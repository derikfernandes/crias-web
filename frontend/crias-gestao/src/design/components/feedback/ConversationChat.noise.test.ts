import { describe, expect, it } from 'vitest'
import { isNoiseMessage } from './ConversationChat'

describe('isNoiseMessage', () => {
  it('esconde 0 e variantes', () => {
    expect(isNoiseMessage('0')).toBe(true)
    expect(isNoiseMessage('"0"')).toBe(true)
    expect(isNoiseMessage("'0'")).toBe(true)
    expect(isNoiseMessage(' 0 ')).toBe(true)
    expect(isNoiseMessage('0.0')).toBe(true)
  })

  it('mantém texto real', () => {
    expect(isNoiseMessage('*continue*')).toBe(false)
    expect(isNoiseMessage('ok')).toBe(false)
  })
})
