import { describe, expect, it } from 'vitest'
import {
  assertCanonicalBrPhone,
  assertSchoolGrade,
  assertStudentName,
  isUiCommandText,
} from './studentFieldValidation'

describe('studentFieldValidation (gestão)', () => {
  it('rejeita textos de botão', () => {
    expect(isUiCommandText('Continuar')).toBe(true)
    expect(assertStudentName('Continuar')).not.toBeNull()
    expect(assertSchoolGrade('Fundamental · Confirmar cadastro')).not.toBeNull()
  })

  it('valida telefone BR', () => {
    expect(assertCanonicalBrPhone('5531971722016')).toBeNull()
    expect(assertCanonicalBrPhone('553171722016')).not.toBeNull()
  })
})
