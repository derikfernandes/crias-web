import { describe, expect, it } from 'vitest'

import {
  buildStudentPasswordFields,
  decryptStudentPassword,
  encryptStudentPassword,
  generateStudentPassword,
  hashStudentPassword,
  isGeneratedPasswordFormat,
  verifyStudentPassword,
} from './studentPassword'

const TEST_KEY_ENV = {
  STUDENT_PASSWORD_KEY: Buffer.alloc(32, 7).toString('base64'),
} as NodeJS.ProcessEnv

describe('studentPassword', () => {
  it('hash e verifica senha válida (formato legado)', () => {
    const hash = hashStudentPassword('@Marina12')
    expect(verifyStudentPassword('@Marina12', hash)).toBe(true)
    expect(verifyStudentPassword('errada', hash)).toBe(false)
  })

  it('rejeita senha curta no hash', () => {
    expect(() => hashStudentPassword('12345')).toThrow(/6/)
  })

  it('gera senha no formato exigido', () => {
    for (let i = 0; i < 40; i++) {
      const p = generateStudentPassword()
      expect(p).toHaveLength(6)
      expect(isGeneratedPasswordFormat(p)).toBe(true)
      expect(/[a-z]/.test(p)).toBe(true)
      expect(/[0-9]/.test(p)).toBe(true)
      expect(/[0o1li]/i.test(p)).toBe(false)
    }
  })

  it('cifra e decifra com AES-256-GCM', () => {
    const plain = generateStudentPassword()
    const enc = encryptStudentPassword(plain, TEST_KEY_ENV)
    expect(enc.startsWith('v1.')).toBe(true)
    expect(enc.includes(plain)).toBe(false)
    expect(decryptStudentPassword(enc, TEST_KEY_ENV)).toBe(plain)
  })

  it('buildStudentPasswordFields gera hash + ciphertext', () => {
    const fields = buildStudentPasswordFields(null, TEST_KEY_ENV, {
      requireEncryption: true,
    })
    expect(isGeneratedPasswordFormat(fields.password_plain)).toBe(true)
    expect(
      verifyStudentPassword(fields.password_plain, fields.password_hash),
    ).toBe(true)
    expect(fields.password_encrypted).toBeTruthy()
    expect(
      decryptStudentPassword(fields.password_encrypted, TEST_KEY_ENV),
    ).toBe(fields.password_plain)
  })

  it('buildStudentPasswordFields aceita senha legada fornecida', () => {
    const fields = buildStudentPasswordFields('@Marina12', TEST_KEY_ENV)
    expect(fields.password_plain).toBe('@Marina12')
    expect(verifyStudentPassword('@Marina12', fields.password_hash)).toBe(true)
  })
})
