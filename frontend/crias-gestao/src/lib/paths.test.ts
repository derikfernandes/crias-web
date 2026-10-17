import { describe, expect, it } from 'vitest'
import { studentPath } from './paths'

describe('studentPath', () => {
  it('gera caminho simples sem filtro', () => {
    expect(studentPath('abc')).toBe('/alunos/abc')
  })

  it('anexa agent_trail_id para drill-down do dashboard', () => {
    expect(studentPath('abc', { agentTrailId: 'Trilha - Matemática' })).toBe(
      '/alunos/abc?agent_trail_id=Trilha+-+Matem%C3%A1tica',
    )
  })

  it('anexa aliases em agent_trail_ids', () => {
    const href = studentPath('abc', {
      agentTrailId: 'Trilha - Matemática',
      agentTrailIds: ['Trilha - Matemática', 'Tutor - Matemática'],
    })
    expect(href).toContain('agent_trail_ids=')
    expect(href).toContain('Trilha')
    expect(href).toContain('Tutor')
  })

  it('ignora agentTrailId vazio', () => {
    expect(studentPath('abc', { agentTrailId: '  ' })).toBe('/alunos/abc')
  })
})
