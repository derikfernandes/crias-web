import { describe, expect, it } from 'vitest'
import {
  parseSchooling,
  planGabarito,
  planPasswords,
  planStudentsAdd,
  planStudentsEdit,
  planStudentsRemove,
  planTrailStudents,
  planUsersAdd,
  planUsersRemove,
  type GabaritoCell,
} from './bulkActions'
import { pick, type Row } from './tableFiles'
import type { Student } from '../types/student'

const student = (id: string, over: Partial<Student> = {}): Student => ({
  id,
  institution_id: 'i1',
  name: `Aluno ${id}`,
  phone_number: '5511900000001',
  school_level: 'fundamental',
  school_grade: '6º ano',
  student_level: 2,
  active: true,
  created_at: null,
  updated_at: null,
  ...over,
})

describe('cabeçalho com parênteses', () => {
  it('lê "Nome (obrigatório)" como Nome', () => {
    const row: Row = { 'Nome (obrigatório)': 'Ana', 'Ativo (sim / não)': 'sim' }
    expect(pick(row, 'nome')).toBe('Ana')
    expect(pick(row, 'ativo')).toBe('sim')
  })
})

describe('cadastrar alunos em massa', () => {
  const existing = [student('s1', { phone_number: '5511900000001', email: 'a@x.com' })]
  it('exige nome e telefone ou e-mail', () => {
    const p = planStudentsAdd(
      [
        { 'ID Instituição': 'i1', Nome: 'Bia', Telefone: '(11) 90000-0002', 'E-mail': '' },
        { 'ID Instituição': 'i1', Nome: 'Caio', Telefone: '', 'E-mail': 'caio@x.com' },
        { 'ID Instituição': 'i1', Nome: 'Dani', Telefone: '', 'E-mail': '' },
        { 'ID Instituição': 'i1', Nome: '', Telefone: '11 90000-0003', 'E-mail': '' },
        { Nome: 'Sem inst', Telefone: '11 90000-0004' },
      ],
      { institutionId: 'i1', existing },
    )
    expect(p.items.map((i) => i.name)).toEqual(['Bia', 'Caio'])
    expect(p.issues.map((i) => i.error)).toEqual(['Informe o telefone ou o e-mail.', 'Nome obrigatório.', 'ID Instituição obrigatório.'])
  })
  it('deixa de fora telefone ou e-mail já cadastrado e repetido na planilha', () => {
    const p = planStudentsAdd(
      [
        { 'ID Instituição': 'i1', Nome: 'Igual', Telefone: '11900000001' },
        { 'ID Instituição': 'i1', Nome: 'Mesmo email', 'E-mail': 'A@x.com' },
        { 'ID Instituição': 'i1', Nome: 'Nova', Telefone: '11900000009' },
        { 'ID Instituição': 'i1', Nome: 'Nova repetida', Telefone: '(11) 90000-0009' },
      ],
      { institutionId: 'i1', existing },
    )
    expect(p.items.map((i) => i.name)).toEqual(['Nova'])
    expect(p.alreadyRegistered).toBe(3)
    expect(p.issues).toHaveLength(0)
  })
  it('barra instituição diferente, telefone, e-mail e senha inválidos', () => {
    const p = planStudentsAdd(
      [
        { 'ID Instituição': 'i2', Nome: 'A', Telefone: '11900000010' },
        { 'ID Instituição': 'i1', Nome: 'Fulano', Telefone: '123' },
        { 'ID Instituição': 'i1', Nome: 'Fulano', 'E-mail': 'sem-arroba' },
        { 'ID Instituição': 'i1', Nome: 'Fulano', Telefone: '11900000011', Senha: '123' },
      ],
      { institutionId: 'i1', existing: [] },
    )
    expect(p.items).toHaveLength(0)
    expect(p.issues).toHaveLength(4)
  })
  it('ignora linhas vazias', () => {
    const p = planStudentsAdd([{ 'ID Instituição': 'i1', Nome: '', Telefone: '' }], { institutionId: 'i1', existing: [] })
    expect(p.items).toHaveLength(0)
    expect(p.issues).toHaveLength(0)
  })
})

describe('editar alunos em massa', () => {
  const students = [
    student('s1'),
    student('s2', { phone_number: '5511900000002', name: 'Beto' }),
    student('s3', { phone_number: '5511900000003' }),
  ]
  it('só muda o que está preenchido e diferente', () => {
    const p = planStudentsEdit(
      [
        { 'ID Aluno': 's1', Nome: 'Aluno novo', Telefone: '', 'E-mail': 'n@x.com', Escolaridade: 'Médio · 1º ano', 'Nível pedagógico': 'Avançado' },
        { 'ID Aluno': 's2', Nome: 'Beto', Telefone: '(11) 90000-0002' },
      ],
      { institutionId: 'i1', students },
    )
    expect(p.items).toHaveLength(1)
    expect(p.items[0].patch).toEqual({
      name: 'Aluno novo',
      email: 'n@x.com',
      school_level: 'médio',
      school_grade: '1º ano',
      student_level: 3,
    })
    expect(p.unchanged).toBe(1)
  })
  it('acusa aluno inexistente, ID repetido, telefone de outro aluno e valores inválidos', () => {
    const p = planStudentsEdit(
      [
        { 'ID Aluno': 's9', Nome: 'X' },
        { 'ID Aluno': 's1', Nome: 'Yara' },
        { 'ID Aluno': 's1', Nome: 'Z' },
        { 'ID Aluno': 's2', Telefone: '11900000001' },
        { 'ID Aluno': 's3', 'Nível pedagógico': 'Mestre' },
        { Nome: 'Sem id' },
      ],
      { institutionId: 'i1', students },
    )
    expect(p.items).toHaveLength(1)
    expect(p.issues.map((i) => i.error)).toEqual([
      'Aluno não encontrado nesta instituição.',
      'ID Aluno repetido na planilha.',
      'Telefone já cadastrado em outro aluno.',
      'Nível pedagógico inválido (Básico, Intermediário ou Avançado).',
      'ID Aluno obrigatório.',
    ])
  })
  it('lê a escolaridade da tabela', () => {
    expect(parseSchooling('Fundamental · 6º ano')).toEqual({ level: 'fundamental', grade: '6º ano' })
    expect(parseSchooling('Médio')).toEqual({ level: 'médio' })
    expect(parseSchooling('Faculdade')).toBeNull()
  })
})

describe('remover alunos em massa', () => {
  const students = [student('s1'), student('s2', { active: false }), student('s3')]
  it('remove só quem está "sim" e ativo', () => {
    const p = planStudentsRemove(
      [
        { 'ID Aluno': 's1', Remover: 'sim' },
        { 'ID Aluno': 's2', Remover: 'sim' },
        { 'ID Aluno': 's3', Remover: 'não' },
        { 'ID Aluno': 's9', Remover: 'sim' },
        { 'ID Aluno': 's3', Remover: 'sim' },
      ],
      { institutionId: 'i1', students },
    )
    expect(p.items.map((i) => i.student.id)).toEqual(['s1'])
    expect(p.unchanged).toBe(2)
    expect(p.issues.map((i) => i.error)).toEqual([
      'Aluno não encontrado nesta instituição.',
      'ID Aluno repetido na planilha.',
    ])
  })
  it('acusa valor que não é sim ou não', () => {
    const p = planStudentsRemove([{ 'ID Aluno': 's1', Remover: 'talvez' }], { institutionId: 'i1', students })
    expect(p.items).toHaveLength(0)
    expect(p.issues[0].error).toContain('sim ou não')
  })
})

describe('ativar ou inativar alunos da trilha em massa', () => {
  const students = [student('s1'), student('s2'), student('s3')]
  const active = new Set(['s1', 's2'])
  it('compara com a situação atual e conta ativados, inativados e sem mudança', () => {
    const p = planTrailStudents(
      [
        { 'ID Trilha': 't1', 'ID Aluno': 's1', Ativo: 'não' },
        { 'ID Trilha': 't1', 'ID Aluno': 's2', Ativo: 'sim' },
        { 'ID Trilha': 't1', 'ID Aluno': 's3', Ativo: 'sim' },
      ],
      { trailId: 't1', students, isActive: (id) => active.has(id) },
    )
    expect(p.activate).toBe(1)
    expect(p.inactivate).toBe(1)
    expect(p.unchanged).toBe(1)
    expect([...p.changes.entries()]).toEqual([
      ['s1', false],
      ['s3', true],
    ])
  })
  it('lista como erro ID inexistente, repetido, outra trilha e ativo inválido ou vazio', () => {
    const p = planTrailStudents(
      [
        { 'ID Aluno': 's9', Ativo: 'sim' },
        { 'ID Aluno': 's1', Ativo: 'sim' },
        { 'ID Aluno': 's1', Ativo: 'não' },
        { 'ID Trilha': 't2', 'ID Aluno': 's2', Ativo: 'sim' },
        { 'ID Aluno': 's3', Ativo: 'talvez' },
        { 'ID Aluno': 's3', Ativo: '' },
      ],
      { trailId: 't1', students, isActive: (id) => active.has(id) },
    )
    expect(p.issues).toHaveLength(5)
    expect(p.unchanged).toBe(1)
  })
})

describe('alterar gabarito em massa', () => {
  const cells: GabaritoCell[] = [
    { id: 'c1', activity: 1, exercise: 1, letter: 'A', annulled: false },
    { id: 'c2', activity: 1, exercise: 2, letter: '', annulled: false },
    { id: 'c3', activity: 2, exercise: 1, letter: 'C', annulled: true },
  ]
  it('altera letra e anulação e conta o que fica igual', () => {
    const p = planGabarito(
      [
        { 'ID Trilha': 't1', Atividade: '1', Exercício: '1', Gabarito: 'B', Anular: 'sim' },
        { Atividade: '1', Exercício: '2', Gabarito: 'D', Anular: '' },
        { Atividade: '2', Exercício: '1', Gabarito: 'C', Anular: 'não' },
        { Atividade: '2', Exercício: '1', Gabarito: '', Anular: '' },
      ],
      { trailId: 't1', cells, optionCount: 4 },
    )
    expect(p.items).toEqual([
      { cellId: 'c1', letter: 'B', annulled: true },
      { cellId: 'c2', letter: 'D' },
      { cellId: 'c3', annulled: false },
    ])
    expect(p.changedLetters).toBe(2)
    expect(p.annulled).toBe(1)
    expect(p.reactivated).toBe(1)
    expect(p.issues.map((i) => i.error)).toEqual(['Exercício repetido na planilha.'])
  })
  it('barra letra fora das alternativas, exercício inexistente e anular inválido', () => {
    const p = planGabarito(
      [
        { Atividade: '1', Exercício: '1', Gabarito: 'E' },
        { Atividade: '5', Exercício: '1', Gabarito: 'A' },
        { Atividade: '1', Exercício: '2', Anular: 'talvez' },
      ],
      { trailId: 't1', cells, optionCount: 4 },
    )
    expect(p.items).toHaveLength(0)
    expect(p.issues).toHaveLength(3)
  })
})

describe('alterar senhas em massa', () => {
  const students = [student('s1'), student('s2')]
  it('só altera senhas preenchidas', () => {
    const p = planPasswords(
      [
        { 'ID Aluno': 's1', Senha: 'abc12345' },
        { 'ID Aluno': 's2', Senha: '' },
        { 'ID Aluno': 's9', Senha: 'abc12345' },
        { 'ID Aluno': 's2', Senha: '123' },
      ],
      { institutionId: 'i1', students },
    )
    expect(p.items.map((i) => i.student.id)).toEqual(['s1'])
    expect(p.unchanged).toBe(1)
    expect(p.issues).toHaveLength(2)
  })
})

describe('usuários em massa', () => {
  it('adiciona exigindo nome, e-mail válido e perfil', () => {
    const p = planUsersAdd(
      [
        { 'ID Instituição': 'i1', Nome: 'Ana', Telefone: '11900000001', 'E-mail': 'ana@x.com', Perfil: 'Admin' },
        { 'ID Instituição': 'i1', Nome: 'Bia', 'E-mail': 'bia@x.com', Perfil: 'Básico' },
        { 'ID Instituição': 'i1', Nome: 'Caio', 'E-mail': 'caio', Perfil: 'Admin' },
        { 'ID Instituição': 'i1', Nome: 'Fone', Telefone: '11900000077', Perfil: 'Admin' },
        { 'ID Instituição': 'i1', Nome: 'Nada', Perfil: 'Admin' },
        { 'ID Instituição': 'i1', Nome: 'Duda', 'E-mail': 'duda@x.com', Perfil: 'Chefe' },
        { 'ID Instituição': 'i1', Nome: '', 'E-mail': 'e@x.com', Perfil: 'Admin' },
        { 'ID Instituição': 'i1', Nome: 'Já', 'E-mail': 'ANA@x.com', Perfil: 'Admin' },
      ],
      { institutionId: 'i1', existingEmails: new Set(['velho@x.com']) },
    )
    expect(p.items.map((i) => [i.email, i.profile])).toEqual([
      ['ana@x.com', 'admin'],
      ['bia@x.com', 'basico'],
      ['', 'admin'],
    ])
    expect(p.alreadyRegistered).toBe(1)
    expect(p.issues.map((i) => i.error)).toEqual([
      'E-mail inválido.',
      'Informe o telefone ou o e-mail.',
      'Perfil inválido (use Admin ou Básico).',
      'Nome obrigatório.',
    ])
  })
  it('remove pelo e-mail e protege quem não pode sair', () => {
    const users = [
      { id: 'u1', email: 'ana@x.com' },
      { id: 'u2', email: 'eu@x.com' },
      { id: 'u3', email: 'bia@x.com' },
    ]
    const p = planUsersRemove(
      [
        { 'E-mail': 'ana@x.com', Remover: 'sim' },
        { 'E-mail': 'eu@x.com', Remover: 'sim' },
        { 'E-mail': 'bia@x.com', Remover: 'não' },
        { 'E-mail': 'x@x.com', Remover: 'sim' },
      ],
      { users, protectedEmails: new Set(['eu@x.com']) },
    )
    expect(p.items.map((i) => i.user.id)).toEqual(['u1'])
    expect(p.unchanged).toBe(1)
    expect(p.issues).toHaveLength(2)
  })
})
