import { describe, expect, it } from 'vitest'

import {
  alignBlocoWithAttempt,
  pickExerciseFeedbackText,
  shouldAutoAdvanceAfterExerciseSubmit,
} from './trailMessages'

/** BLOCO em cache da célula t47 S10 q89 (gerado antes de o aluno responder). */
const CACHED_GENERIC_BLOCO = [
  '*🤔 Resposta*',
  '',
  '✅ *A resposta correta é a letra A*.',
  '',
  'Para calcular o *comprimento do arco*, usamos a fórmula _Arco = (θ / 360) ⋅ 2 ⋅ π ⋅ r_. Substituindo os valores do exercício, temos: _(120 / 360) ⋅ 2 ⋅ π ⋅ 6 = (1/3) ⋅ 12π = 4π cm_. Parabéns se você acertou! Se errou dessa vez, não se preocupe: o segredo é simplificar a fração da volta completa com calma.',
  '',
  '💬 _Se surgir alguma dúvida, a Maria te ajuda. Para avançar, *continue*._',
].join('\n')

describe('pickExerciseFeedbackText (bug t47: bolha só “🤔 Resposta” + 💬)', () => {
  it('prefere o feedback da IA desta tentativa e não o poda', () => {
    const pedagogical =
      '*🤔 Resposta*\n\nA resposta correta é a letra A, 4π cm: 120° é 1/3 da volta.\n\n💬 _Continue._'
    const out = pickExerciseFeedbackText({
      pedagogical,
      explanation: CACHED_GENERIC_BLOCO,
      legacyFeedback: null,
      isCorrect: false,
      scored: true,
    })
    expect(out).toBe(pedagogical)
  })

  it('fallback no BLOCO genérico mantém o corpo (não só título + fechamento)', () => {
    const out = pickExerciseFeedbackText({
      pedagogical: null,
      explanation: CACHED_GENERIC_BLOCO,
      legacyFeedback: null,
      isCorrect: false,
      scored: true,
    })
    expect(out).toContain('A resposta correta é a letra A')
    expect(out?.split('\n').filter((l) => l.trim()).length).toBeGreaterThan(2)
  })

  it('sem nenhum texto da escola/IA → null (sem hardcode)', () => {
    expect(
      pickExerciseFeedbackText({
        pedagogical: null,
        explanation: null,
        legacyFeedback: 'Resposta incorreta.',
        isCorrect: false,
        scored: true,
      }),
    ).toBeNull()
  })

  it('align ainda tira celebração explícita em tentativa errada', () => {
    const out = alignBlocoWithAttempt(
      'Parabéns pelo acerto!\n\nA resposta correta é a letra A, pois 120/360 de 12π dá 4π.',
      false,
    )
    expect(out).not.toContain('Parabéns pelo acerto')
    expect(out).toContain('A resposta correta é a letra A')
  })
})

describe('shouldAutoAdvanceAfterExerciseSubmit (pós-Enviar sem Continuar extra)', () => {
  it('avança sozinho quando ainda não há feedback na thread', () => {
    expect(shouldAutoAdvanceAfterExerciseSubmit(false)).toBe(true)
  })

  it('mantém Continuar quando o feedback já foi surfado (pausa de leitura)', () => {
    expect(shouldAutoAdvanceAfterExerciseSubmit(true)).toBe(false)
  })
})
