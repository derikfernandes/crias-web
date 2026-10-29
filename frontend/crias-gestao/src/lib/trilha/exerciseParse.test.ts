import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { extractAnswerKey, parseExerciseContent } from './exerciseParse'

describe('paridade do parser de exercício (server, Aluno e Gestão)', () => {
  it('os três arquivos são idênticos', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '../../../../../')
    const read = (f: string) => readFileSync(join(root, f), 'utf8')
    const server = read('server/lib/exerciseParse.ts')
    expect(read('frontend/crias-aluno/src/lib/exerciseParse.ts')).toBe(server)
    expect(read('frontend/crias-gestao/src/lib/trilha/exerciseParse.ts')).toBe(server)
  })
})

/** Caso real do bug (t68, Linguagens 8º ano): "I." e "II." no enunciado. */
const MANCHETES = `✏️ *Exercício*

Compare as duas manchetes sobre o mesmo fato:

I. "Prefeitura reforma escola após três anos de espera"
II. "Prefeitura entrega reforma da escola"

Qual efeito de sentido a expressão "após três anos de espera" provoca na manchete I?
A) Destaca a demora, sugerindo uma crítica ao tempo que a reforma levou.
B) Torna a manchete mais neutra do que a manchete II.
C) Elogia a prefeitura pela rapidez da obra.`

describe('parseExerciseContent: enunciado, alternativas e gabarito', () => {
  it('"I." e "II." ficam no enunciado e só A) em diante vira alternativa (bug t68)', () => {
    const r = parseExerciseContent(MANCHETES)
    expect(r.options.map((o) => o.key)).toEqual(['A', 'B', 'C'])
    expect(r.options[0].text).toBe('Destaca a demora, sugerindo uma crítica ao tempo que a reforma levou.')
    expect(r.statement).toContain('I. "Prefeitura reforma escola após três anos de espera"')
    expect(r.statement).toContain('II. "Prefeitura entrega reforma da escola"')
    expect(r.statement).toContain('provoca na manchete I?')
    expect(r.statement).not.toContain('Destaca a demora')
    expect(r.answerKey).toBeNull()
  })

  it('gabarito abaixo das alternativas sai do texto e fica registrado', () => {
    const r = parseExerciseContent('Quanto é 2+2?\n\nA) 3\nB) 4\nC) 5\n\nGabarito: B')
    expect(r.options.map((o) => o.text)).toEqual(['3', '4', '5'])
    expect(r.answerKey).toBe('B')
    expect(r.statement).toBe('Quanto é 2+2?')
  })

  it.each([
    'Resposta correta: C',
    'Resposta correta é a letra C',
    'A resposta é C',
    'A resposta correta é a alternativa C.',
    '**Gabarito:** C',
    '✅ Gabarito: (C)',
  ])('gabarito sem linha em branco: %s', (line) => {
    const r = parseExerciseContent(`P?\nA) um\nB) dois\nC) três\n${line}`)
    expect(r.options).toHaveLength(3)
    expect(r.options[2].text).toBe('três')
    expect(r.answerKey).toBe('C')
  })

  it('aceita A. B: (A) a) **A)** e marcadores de lista', () => {
    for (const body of ['A. um\nB. dois', 'A: um\nB: dois', '(A) um\n(B) dois', 'a) um\nb) dois', '**A)** um\n**B)** dois', '- A) um\n- B) dois', 'A - um\nB - dois']) {
      const r = parseExerciseContent(`Enunciado\n${body}`)
      expect(r.options.map((o) => o.key), body).toEqual(['A', 'B'])
      expect(r.options.map((o) => o.text), body).toEqual(['um', 'dois'])
    }
  })

  it('alternativa em duas linhas continua a mesma alternativa', () => {
    const r = parseExerciseContent('P?\nA) começo da frase\ncontinua aqui\nB) outra')
    expect(r.options[0].text).toBe('começo da frase continua aqui')
    expect(r.options).toHaveLength(2)
  })

  it('alternativas numeradas', () => {
    const r = parseExerciseContent('P?\n\n1) um\n2) dois\n3) três\nGabarito: 2')
    expect(r.style).toBe('number')
    expect(r.options.map((o) => o.key)).toEqual(['1', '2', '3'])
    expect(r.answerKey).toBe('2')
  })

  it('alternativas na mesma linha', () => {
    const r = parseExerciseContent('Qual? A) Lado B) Diagonal C) Ângulo')
    expect(r.options.map((o) => o.text)).toEqual(['Lado', 'Diagonal', 'Ângulo'])
    expect(r.statement).toBe('Qual?')
  })

  it('"A." de nome próprio no enunciado, sem B depois, não vira alternativa', () => {
    const r = parseExerciseContent('A. Silva escreveu o livro. Qual o gênero?\nA) romance\nB) poema')
    expect(r.options.map((o) => o.key)).toEqual(['A', 'B'])
    expect(r.statement).toContain('A. Silva escreveu o livro')
  })

  it('sem alternativas: nada some, exceto linha "Gabarito"', () => {
    const r = parseExerciseContent('Só texto.\nI. item\nGabarito: A')
    expect(r.options).toEqual([])
    expect(r.statement).toBe('Só texto.\nI. item')
    expect(r.answerKey).toBe('A')
  })

  it('parágrafo depois das alternativas e de uma linha em branco volta para o enunciado', () => {
    const r = parseExerciseContent('P?\nA) um\nB) dois\n\nEscolha apenas uma opção.')
    expect(r.options).toHaveLength(2)
    expect(r.statement).toBe('P?\n\nEscolha apenas uma opção.')
  })
})

describe('extractAnswerKey: "A resposta é A" e variações', () => {
  it.each([
    ['A resposta é A', 'A'],
    ['A resposta é a letra B', 'B'],
    ['A resposta correta é a alternativa C.', 'C'],
    ['A resposta correta é (D)', 'D'],
    ['Resposta: B', 'B'],
    ['resposta correta: a letra b', 'B'],
    ['Gabarito: C', 'C'],
    ['Gabarito oficial é a letra E', 'E'],
    ['Alternativa correta: B', 'B'],
    ['A alternativa certa é a B', 'B'],
    ['A letra B é a correta', 'B'],
    ['A alternativa C é a resposta certa', 'C'],
    ['(D) é a correta', 'D'],
    ['A correta é a letra A', 'A'],
    ['Você marcou A, mas a resposta correta é B porque...', 'B'],
    ['Parabéns! A resposta correta é **B**.', 'B'],
    ['Quase! A resposta correta é a letra "C".', 'C'],
    ['Gabarito: 2', '2'],
    ['resposta correta é a alternativa 3', '3'],
  ])('%s', (text, key) => {
    expect(extractAnswerKey(text)).toBe(key)
  })

  it.each([
    'A alternativa A está errada porque confunde os conceitos.',
    'Veja a letra B do exemplo anterior.',
    'A resposta é a mais simples de todas.',
    'A resposta correta é 12 metros.',
    'A resposta não é A.',
    'Sem nada sobre gabarito aqui.',
    '',
  ])('não inventa gabarito: %s', (text) => {
    expect(extractAnswerKey(text)).toBeNull()
  })

  it('respostas diferentes no mesmo texto são ambíguas', () => {
    expect(extractAnswerKey('Gabarito: A. A resposta correta é B.')).toBeNull()
  })

  it('texto curto isolado só vale com allowBare', () => {
    expect(extractAnswerKey('letra B')).toBeNull()
    expect(extractAnswerKey('letra B', { allowBare: true })).toBe('B')
    expect(extractAnswerKey('C', { allowBare: true })).toBe('C')
  })
})
