import { describe, expect, it } from 'vitest'
import type { GeneratedTrail } from './types.js'
import { validateGeneratedTrail } from './validate.js'

function baseTrail(overrides: Partial<GeneratedTrail> = {}): GeneratedTrail {
  const phases = [
    {
      position: 1,
      name: 'Explicação',
      type: 'ai' as const,
      pedagogicalFunction: 'Explicar',
      globalAiCommand:
        'Com base no conteúdo-base, explique de forma curta e didática.',
      isFeedback: false,
    },
    {
      position: 2,
      name: 'Exercício',
      type: 'exercise' as const,
      pedagogicalFunction: 'Praticar',
      globalAiCommand: null,
      isFeedback: false,
    },
    {
      position: 3,
      name: 'Feedback',
      type: 'ai' as const,
      pedagogicalFunction: 'Corrigir',
      globalAiCommand:
        'Analise a resposta do exercício anterior e explique o gabarito.',
      isFeedback: true,
    },
    {
      position: 4,
      name: 'Encerramento',
      type: 'fixed' as const,
      pedagogicalFunction: 'Fechar etapa',
      globalAiCommand: null,
      isFeedback: false,
    },
  ]
  const blocks = [
    {
      phasePosition: 1,
      content: 'Conceito de economia circular e reuso de materiais.',
      correctOption: null,
    },
    {
      phasePosition: 2,
      content:
        'O que é economia circular?\nA) Descartar tudo\nB) Reusar e reciclar em ciclo\nC) Ignorar resíduos',
      correctOption: '2',
    },
    {
      phasePosition: 3,
      content: 'Resposta correta: B. Porque fecha o ciclo de materiais.',
      correctOption: null,
    },
    {
      phasePosition: 4,
      content: 'Você concluiu esta etapa! Na próxima seguimos.',
      correctOption: null,
    },
  ]
  return {
    name: 'Economia circular',
    objective: 'Compreender o ciclo de materiais.',
    subject: 'Meio ambiente',
    phases,
    stages: [
      {
        name: 'Etapa 1',
        objective: 'Introdução',
        contents: [{ title: 'Q1', blocks }],
      },
      {
        name: 'Etapa 2',
        objective: 'Aprofundar',
        contents: [
          {
            title: 'Q2',
            blocks: [
              {
                phasePosition: 1,
                content: 'Reparo e reuso na prática comunitária.',
                correctOption: null,
              },
              {
                phasePosition: 2,
                content:
                  'Qual prática reforça a economia circular?\nA) Queimar lixo\nB) Consertar objetos\nC) Comprar descartáveis',
                correctOption: '2',
              },
              {
                phasePosition: 3,
                content: 'Resposta correta: B. Consertar prolonga a vida útil.',
                correctOption: null,
              },
              {
                phasePosition: 4,
                content:
                  'Parabéns! Você concluiu esta etapa e chegou ao final da trilha.',
                correctOption: null,
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe('validateGeneratedTrail', () => {
  it('aceita trilha válida', () => {
    const result = validateGeneratedTrail(baseTrail())
    expect(result.ok).toBe(true)
    expect(result.issues).toEqual([])
  })

  it('exige exercício seguido de IA feedback', () => {
    const trail = baseTrail({
      phases: [
        {
          position: 1,
          name: 'Ex',
          type: 'exercise',
          pedagogicalFunction: 'p',
          globalAiCommand: null,
          isFeedback: false,
        },
        {
          position: 2,
          name: 'Fim',
          type: 'fixed',
          pedagogicalFunction: 'p',
          globalAiCommand: null,
          isFeedback: false,
        },
      ],
      stages: [
        {
          name: 'E1',
          objective: 'o',
          contents: [
            {
              title: 'q',
              blocks: [
                {
                  phasePosition: 1,
                  content: 'P?\nA) a\nB) b\nC) c',
                  correctOption: '1',
                },
                {
                  phasePosition: 2,
                  content: 'Fim da etapa e da trilha.',
                  correctOption: null,
                },
              ],
            },
          ],
        },
      ],
    })
    const result = validateGeneratedTrail(trail)
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.code === 'exercise_feedback')).toBe(true)
  })

  it('exige última fase fixed', () => {
    const trail = baseTrail()
    trail.phases[trail.phases.length - 1]!.type = 'ai'
    trail.phases[trail.phases.length - 1]!.globalAiCommand = 'x'.repeat(20)
    const result = validateGeneratedTrail(trail)
    expect(result.issues.some((i) => i.code === 'last_phase_fixed')).toBe(true)
  })

  it('rejeita placeholders e exercícios sem gabarito', () => {
    const trail = baseTrail()
    trail.stages[0]!.contents[0]!.blocks[0]!.content = '[inserir conteúdo]'
    trail.stages[0]!.contents[0]!.blocks[1]!.correctOption = null
    const result = validateGeneratedTrail(trail)
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.code === 'empty_block')).toBe(true)
    expect(result.issues.some((i) => i.code === 'exercise_correct')).toBe(true)
  })

  it('exige mesma quantidade de blocos que fases', () => {
    const trail = baseTrail()
    trail.stages[0]!.contents[0]!.blocks.pop()
    const result = validateGeneratedTrail(trail)
    expect(result.issues.some((i) => i.code === 'block_count')).toBe(true)
  })
})
