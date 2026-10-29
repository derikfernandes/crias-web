import { describe, expect, it } from 'vitest'
import {
  assertCanonicalBrPhone,
  assertSchoolGrade,
  assertStudentName,
  assertTurma,
  isUiCommandText,
  normalizeTurma,
  TURMA_MAX_LEN,
} from './studentFieldValidation.js'

describe('isUiCommandText', () => {
  it('rejeita Continuar e Confirmar cadastro', () => {
    expect(isUiCommandText('Continuar')).toBe(true)
    expect(isUiCommandText('Confirmar cadastro')).toBe(true)
    expect(isUiCommandText('Fundamental · Confirmar cadastro')).toBe(true)
  })

  it('aceita nomes e séries reais', () => {
    expect(isUiCommandText('Maria Silva')).toBe(false)
    expect(isUiCommandText('7º ano')).toBe(false)
  })
})

describe('assertStudentName / assertSchoolGrade', () => {
  it('bloqueia botão Continuar como nome', () => {
    expect(assertStudentName('Continuar')).toMatch(/inválido/i)
  })

  it('bloqueia escolaridade com texto de botão', () => {
    expect(assertSchoolGrade('Fundamental · Confirmar cadastro')).toMatch(
      /inválido/i,
    )
  })
})

describe('assertCanonicalBrPhone', () => {
  it('aceita móvel 13 dígitos', () => {
    expect(assertCanonicalBrPhone('5531971722016')).toBeNull()
  })

  it('rejeita móvel 12 dígitos sem o 9', () => {
    expect(assertCanonicalBrPhone('553171722016')).toMatch(/incompleto|13/i)
  })

  it('aceita fixo 12 dígitos', () => {
    expect(assertCanonicalBrPhone('553132121212')).toBeNull()
  })
})

describe('normalizeTurma / assertTurma', () => {
  it('aceita vazio, null e undefined (opcional)', () => {
    expect(normalizeTurma(undefined)).toBe('')
    expect(normalizeTurma(null)).toBe('')
    expect(normalizeTurma('')).toBe('')
    expect(normalizeTurma('   ')).toBe('')
    expect(assertTurma(undefined)).toBeNull()
    expect(assertTurma(null)).toBeNull()
    expect(assertTurma('')).toBeNull()
    expect(assertTurma('  ')).toBeNull()
  })

  it('trim e limite de tamanho', () => {
    expect(normalizeTurma('  7A  ')).toBe('7A')
    expect(assertTurma('7A')).toBeNull()
    const long = 'x'.repeat(TURMA_MAX_LEN + 5)
    expect(normalizeTurma(long)).toHaveLength(TURMA_MAX_LEN)
    expect(assertTurma(long)).toMatch(/máximo/i)
  })

  it('rejeita tipo não-string no assert', () => {
    expect(assertTurma(12)).toMatch(/inválido/i)
  })
})
