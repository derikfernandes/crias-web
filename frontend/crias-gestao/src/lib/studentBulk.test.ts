import { describe, expect, it } from 'vitest'
import { parseAddRows, parseRemoveRows, phoneKey } from './studentBulk'
import { parseYesNo, pick, toCsv } from './tableFiles'
import type { Student } from '../types/student'
import type { Trail } from '../types/trail'

const student = (id: string, phone: string): Student =>
  ({ id, institution_id: 'i1', name: id, phone_number: phone, school_level: 'fundamental', school_grade: '', student_level: 2, active: true, created_at: null, updated_at: null }) as Student
const trail = { id: 't1', name: 'Matemática básica' } as Trail

describe('cadastrar alunos em massa', () => {
  const existing = [student('s1', '11900000001')]
  it('valida nome, celular, duplicidade, senha e trilha', () => {
    const r = parseAddRows(
      [
        { Nome: 'Maria', celular: '11 98888-0001', senha: '', trilha: 'matemática básica' },
        { Nome: 'João', celular: '(11) 98888-0002', senha: 'abc12345', trilha: '' },
        { Nome: '', celular: '11 97777-0000' },
        { Nome: 'Sem celular', celular: '' },
        { Nome: 'Dup', celular: '5511900000001' },
        { Nome: 'Senha curta', celular: '11 96666-0000', senha: '123' },
        { Nome: 'Trilha', celular: '11 95555-0000', trilha: 'Outra' },
        { Nome: 'Repetido', celular: '11988880001' },
      ],
      existing,
      [trail],
    )
    expect(r.rows.map((x) => x.name)).toEqual(['Maria', 'João'])
    expect(r.rows[0].phone).toBe('5511988880001')
    expect(r.errors.map((e) => e.line)).toEqual([4, 5, 6, 7, 8, 9])
  })
})

describe('remover alunos em massa', () => {
  it('só marca quem tem remover = sim e existe na instituição', () => {
    const r = parseRemoveRows(
      [
        { Nome: 'A', celular: '11900000001', remover: 'sim' },
        { Nome: 'B', celular: '11900000002', remover: 'não' },
        { Nome: 'C', celular: '11911111111', remover: 'sim' },
      ],
      [student('s1', '11900000001'), student('s2', '11900000002')],
    )
    expect(r.ids).toEqual(['s1'])
    expect(r.errors).toHaveLength(1)
  })
})

describe('planilhas', () => {
  it('normaliza telefone com e sem 55', () => {
    expect(phoneKey('5511988880001')).toBe(phoneKey('(11) 98888-0001'))
  })
  it('lê sim e não, e colunas sem acento ou maiúscula', () => {
    expect(parseYesNo('Sim')).toBe(true)
    expect(parseYesNo('Não')).toBe(false)
    expect(parseYesNo('talvez')).toBeNull()
    expect(pick({ 'Código': '3' }, 'codigo')).toBe('3')
  })
  it('CSV com BOM e ponto e vírgula, escapando aspas e quebras de linha', () => {
    const csv = toCsv(['a', 'b'], [['x;y', 'diz "oi"\nlinha']])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('"x;y";"diz ""oi""\nlinha"')
    expect(toCsv(['a'], [['1']], { sep: ',', bom: false })).toBe('a\r\n1\r\n')
  })
})
