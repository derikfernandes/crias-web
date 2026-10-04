import { describe, expect, it } from 'vitest'

import {
  blocoMismatchesSubject,
  contentFingerprint,
  enrichBlocoContent,
  extractCorrectLetterFromText,
  filterContextForBloco,
  isBlocoRespostaPrompt,
} from './blocoSubjectGuard'

describe('blocoSubjectGuard', () => {
  it('detecta BLOCO RESPOSTA / FINAL', () => {
    expect(
      isBlocoRespostaPrompt('OBJETIVO - BLOCO RESPOSTA\n...', '🤔 Resposta'),
    ).toBe(true)
    expect(isBlocoRespostaPrompt('OBJETIVO - BLOCO FINAL', 'Resposta Final')).toBe(
      true,
    )
    expect(isBlocoRespostaPrompt('Gere introdução', '📖 Nova aula')).toBe(false)
  })

  it('fingerprint estável', () => {
    expect(contentFingerprint(['a', 'b'])).toBe(contentFingerprint(['a', 'b']))
    expect(contentFingerprint(['a', 'b'])).not.toBe(
      contentFingerprint(['a', 'c']),
    )
  })

  it('extrai letra do gabarito', () => {
    expect(
      extractCorrectLetterFromText(
        '✅ A resposta correta é a letra B. Parabéns!',
      ),
    ).toBe('B')
    expect(extractCorrectLetterFromText('alternativa A')).toBe('A')
  })

  it('enriquece CONTENT com exercício anterior', () => {
    const out = enrichBlocoContent({
      blocoContent: '✅ A resposta correta é a letra B',
      exerciseContent:
        'Se o raio mede 5 cm, qual o diâmetro?\nA) 5\nB) 10\nC) 15',
      correctOption: '2',
      correctLetter: 'B',
    })
    expect(out).toMatch(/diâmetro/i)
    expect(out).toMatch(/GABARITO: letra B/)
    expect(out).toMatch(/EXERCÍCIO ANTERIOR/)
  })

  it('detecta regência verbal em aula de diâmetro', () => {
    const subject =
      'Se o raio de uma circunferência mede 5 cm, qual é a medida do diâmetro?'
    const bad =
      'O verbo gostar sempre pede a preposição "de" pelas regras de regência verbal.'
    const good =
      'O diâmetro é o dobro do raio: 5 cm × 2 = 10 cm. A resposta correta é a letra B.'
    expect(blocoMismatchesSubject(bad, subject)).toBe(true)
    expect(blocoMismatchesSubject(good, subject)).toBe(false)
  })

  it('filtra CONTEXT poluído de outra disciplina', () => {
    const subject = 'raio e diâmetro da circunferência'
    const ctx = [
      '[S10 Q86] Sistema: regência verbal e preposição de',
      '[S9 Q86] Aluno: B) 10 cm',
      '[S9 Q86] Sistema: exercício sobre diâmetro',
      '[S1 Q86] Sistema: introdução à circunferência',
    ].join('\n')
    const filtered = filterContextForBloco(ctx, {
      stage_number: 10,
      question_number: 86,
      subjectSource: subject,
    })
    expect(filtered).not.toMatch(/regência/i)
    expect(filtered).toMatch(/diâmetro|10 cm|circunferência/i)
  })
})
