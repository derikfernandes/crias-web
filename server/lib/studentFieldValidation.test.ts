import { describe, expect, it } from 'vitest'
import {
  assertCanonicalBrPhone,
  assertSchoolGrade,
  assertStudentName,
  isUiCommandText,
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
