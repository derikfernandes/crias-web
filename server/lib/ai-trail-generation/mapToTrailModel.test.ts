import { describe, expect, it } from 'vitest'
import { mapGeneratedTrailToDraft } from './mapToTrailModel.js'
import type { GeneratedTrail } from './types.js'

const sample: GeneratedTrail = {
  name: 'Água na cidade',
  objective: 'Entender o ciclo urbano da água.',
  subject: 'Ciências',
  phases: [
    {
      position: 1,
      name: 'IA',
      type: 'ai',
      pedagogicalFunction: 'Explicar',
      globalAiCommand: 'Explique com base no conteúdo-base.',
      isFeedback: false,
    },
    {
      position: 2,
      name: 'Exercício',
      type: 'exercise',
      pedagogicalFunction: 'Praticar',
      globalAiCommand: null,
      isFeedback: false,
    },
    {
      position: 3,
      name: 'Feedback',
      type: 'ai',
      pedagogicalFunction: 'Corrigir',
      globalAiCommand: 'Analise a resposta anterior.',
      isFeedback: true,
    },
    {
      position: 4,
      name: 'Fim',
      type: 'fixed',
      pedagogicalFunction: 'Encerrar',
      globalAiCommand: null,
      isFeedback: false,
    },
  ],
  stages: [
    {
      name: 'Captação',
      objective: 'Origem da água',
      contents: [
        {
          title: 'Conteúdo 1',
          blocks: [
            {
              phasePosition: 1,
              content: 'A água chega por redes e reservatórios.',
              correctOption: null,
            },
            {
              phasePosition: 2,
              content:
                'De onde vem a água da torneira?\nA) Só chuva\nB) Rede tratada\nC) Oceano direto',
              correctOption: 'B',
            },
            {
              phasePosition: 3,
              content: 'Resposta correta: B.',
              correctOption: null,
            },
            {
              phasePosition: 4,
              content: 'Etapa concluída.',
              correctOption: null,
            },
          ],
        },
      ],
    },
    {
      name: 'Uso consciente',
      objective: 'Economizar',
      contents: [
        {
          title: 'C1',
          blocks: [
            {
              phasePosition: 1,
              content: 'Pequenas ações reduzem desperdício.',
              correctOption: null,
            },
            {
              phasePosition: 2,
              content:
                'Qual ação economiza água?\nA) Torneira aberta\nB) Reuso de água da chuva\nC) Banho longo',
              correctOption: '2',
            },
            {
              phasePosition: 3,
              content: 'Resposta correta: B.',
              correctOption: null,
            },
            {
              phasePosition: 4,
              content: 'Parabéns! Fim da trilha.',
              correctOption: null,
            },
          ],
        },
        {
          title: 'C2',
          blocks: [
            {
              phasePosition: 1,
              content: 'Vazamentos importam.',
              correctOption: null,
            },
            {
              phasePosition: 2,
              content:
                'O que fazer ao ver vazamento?\nA) Ignorar\nB) Reportar\nC) Aumentar pressão',
              correctOption: '2',
            },
            {
              phasePosition: 3,
              content: 'Resposta correta: B.',
              correctOption: null,
            },
            { phasePosition: 4, content: 'Fim.', correctOption: null },
          ],
        },
      ],
    },
  ],
}

describe('mapGeneratedTrailToDraft', () => {
  it('mapeia fases e etapas para o formato do editor', () => {
    const draft = mapGeneratedTrailToDraft(sample)
    expect(draft.name).toBe('Água na cidade')
    expect(draft.description).toBe('Entender o ciclo urbano da água.')
    expect(draft.subject).toBe('Ciências')
    expect(draft.default_total_steps_per_stage).toBe(4)
    expect(draft.structurePhases).toHaveLength(4)
    expect(draft.structurePhases[0]!.stage_type).toBe('ai')
    expect(draft.structurePhases[0]!.prompt).toContain('conteúdo-base')
    expect(draft.structurePhases[1]!.stage_type).toBe('exercise')
    expect(draft.structurePhases[1]!.prompt).toBe('')
    expect(draft.contentEtapas).toHaveLength(3)
    expect(draft.contentEtapas[0]!.released).toBe(true)
    expect(draft.contentEtapas[1]!.released).toBe(false)
    expect(draft.contentEtapas[0]!.questions).toHaveLength(1)
    expect(draft.contentEtapas[0]!.questions[0]!.phases).toHaveLength(4)
    expect(draft.contentEtapas[0]!.questions[0]!.phases[1]!.correctOption).toBe(
      '2',
    )
    expect(draft.contentEtapas[0]!.questions[0]!.phases[1]!.fixedText).toContain(
      'torneira',
    )
    expect(draft.contentEtapas[2]!.name).toContain('Uso consciente')
  })
})
