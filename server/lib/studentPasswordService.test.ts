import { describe, expect, it } from 'vitest'

import {
  parseStudentImportCsv,
  studentsToCsv,
} from './studentPasswordService'

describe('studentPasswordService CSV', () => {
  it('parseia header e linhas', () => {
    const csv = `nome,celular,escola,trilha,senha
Ana,11999999999,Instituto Sol,Matemática,
Bob,11988888888,Instituto Sol,,abc123
`
    const { rows, headerErrors } = parseStudentImportCsv(csv)
    expect(headerErrors).toEqual([])
    expect(rows).toHaveLength(2)
    expect(rows[0]?.nome).toBe('Ana')
    expect(rows[0]?.senha).toBe('')
    expect(rows[1]?.senha).toBe('abc123')
  })

  it('exige colunas obrigatórias', () => {
    const { headerErrors } = parseStudentImportCsv('foo,bar\n1,2')
    expect(headerErrors.length).toBeGreaterThan(0)
  })

  it('studentsToCsv escapa campos', () => {
    const out = studentsToCsv(
      [
        {
          school: 'Instituto Sol',
          name: 'Ana, Maria',
          phone_number: '11999999999',
          password: 'ab2cde',
        },
      ],
    )
    expect(out).toContain('"Ana, Maria"')
    expect(out.startsWith('escola,nome,celular,senha')).toBe(true)
  })
})
