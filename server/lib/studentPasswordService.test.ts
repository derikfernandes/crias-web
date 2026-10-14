import { describe, expect, it } from 'vitest'

import {
  parseStudentImportCsv,
  selectBulkGenerateSlice,
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

describe('selectBulkGenerateSlice', () => {
  const docs = [
    { id: 's3', hasPasswordHash: false },
    { id: 's1', hasPasswordHash: true },
    { id: 's2', hasPasswordHash: false },
    { id: 's10', hasPasswordHash: false },
    { id: 's4', hasPasswordHash: true },
  ]

  it('ignora quem já tem senha (nunca sobrescreve sem force)', () => {
    const slice = selectBulkGenerateSlice(docs, { limit: 100 })
    expect(slice.skippedExisting).toBe(2)
    expect(slice.candidateIds).toEqual(['s10', 's2', 's3'])
    expect(slice.sliceIds).toEqual(['s10', 's2', 's3'])
    expect(slice.done).toBe(true)
    expect(slice.nextCursor).toBeNull()
  })

  it('fatiar com limit + cursor para ~1000 alunos sem timeout', () => {
    const many = Array.from({ length: 1000 }, (_, i) => ({
      id: `s${String(i + 1).padStart(4, '0')}`,
      hasPasswordHash: i % 5 === 0, // 1/5 já tem senha → 800 candidatos
    }))
    const batches: ReturnType<typeof selectBulkGenerateSlice>[] = []
    let cursor: string | null = null
    for (let guard = 0; guard < 20; guard++) {
      const batch = selectBulkGenerateSlice(many, { limit: 100, cursor })
      batches.push(batch)
      if (batch.done) break
      cursor = batch.nextCursor
      expect(cursor).toBeTruthy()
    }
    expect(batches.length).toBe(8)
    expect(batches.every((b, i) => (i < 7 ? !b.done : b.done))).toBe(true)
    expect(batches[0]!.sliceIds).toHaveLength(100)
    expect(batches[7]!.sliceIds).toHaveLength(100)
    expect(batches[7]!.nextCursor).toBeNull()
    const allIds = batches.flatMap((b) => b.sliceIds)
    expect(allIds).toHaveLength(batches[0]!.candidateIds.length)
    expect(new Set(allIds).size).toBe(allIds.length)
  })

  it('com force inclui quem já tem hash', () => {
    const slice = selectBulkGenerateSlice(docs, { force: true, limit: 2 })
    expect(slice.candidateIds).toEqual(['s1', 's10', 's2', 's3', 's4'])
    expect(slice.sliceIds).toEqual(['s1', 's10'])
    expect(slice.nextCursor).toBe('s10')
    expect(slice.done).toBe(false)
  })
})
