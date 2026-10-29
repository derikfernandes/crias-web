import { describe, expect, it } from 'vitest'
import { stageLabel, stageRoles } from './stageRoles'

const st = (type: string, title = '') => ({ stage_number: 0, stage_type: type, title })

describe('papéis das etapas', () => {
  const roles = stageRoles([st('ai'), st('ai'), st('exercise'), st('ai', 'Feedback'), st('ai', 'Conclusão')])
  it('depois do exercício é feedback e a última de IA com título Conclusão é conclusão', () => {
    expect(roles).toEqual(['c', 'c', 'e', 'f', 'k'])
  })
  it('rótulos da régua', () => {
    expect(roles.map((_, i) => stageLabel(roles, i))).toEqual(['Etapa 1 de 5', 'Etapa 2 de 5', 'Exercício 1 de 1', 'Feedback', 'Conclusão'])
  })
  it('sem conclusão, a última etapa de conteúdo continua conteúdo', () => {
    expect(stageRoles([st('fixed'), st('exercise'), st('ai')])).toEqual(['c', 'e', 'f'])
  })
})
