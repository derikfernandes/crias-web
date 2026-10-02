import { describe, expect, it } from 'vitest'

import {
  hashStudentPassword,
  verifyStudentPassword,
} from './studentPassword'

describe('studentPassword', () => {
  it('hash e verifica senha válida', () => {
    const hash = hashStudentPassword('segredo123')
    expect(verifyStudentPassword('segredo123', hash)).toBe(true)
    expect(verifyStudentPassword('errada', hash)).toBe(false)
  })

  it('rejeita senha curta no hash', () => {
    expect(() => hashStudentPassword('12345')).toThrow(/6/)
  })
})
