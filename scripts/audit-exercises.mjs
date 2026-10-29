#!/usr/bin/env node
/**
 * Auditoria dos exercícios (pacote 1.2.5): só leitura, não grava nada.
 * Lista, por trilha, exercícios em que enunciado, alternativas e gabarito não se separam direito:
 *   - SEM_ALTERNATIVAS: o aluno vê "Não foi possível carregar as opções deste exercício."
 *   - SEM_GABARITO: nenhuma fonte (correct_option, texto do exercício, etapa seguinte) traz a resposta
 *   - CONFLITO: as fontes discordam (ex.: correct_option = A, mas a etapa seguinte diz "A resposta é B")
 *   - GABARITO_FORA: a letra do gabarito não existe nas alternativas
 *
 * Uso:   npx --yes tsx scripts/audit-exercises.mjs [trail_id ...]
 * Env:   FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON (JSON, caminho ou @caminho)
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadServiceAccountJson() {
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON?.trim()
  if (!raw) throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON ausente.')
  if (raw.startsWith('{')) return JSON.parse(raw)
  return JSON.parse(readFileSync(raw.startsWith('@') ? raw.slice(1) : raw, 'utf8'))
}

async function main() {
  const { cert, getApps, initializeApp } = require('firebase-admin/app')
  const { getFirestore } = require('firebase-admin/firestore')
  if (!getApps().length) initializeApp({ credential: cert(loadServiceAccountJson()) })
  const db = getFirestore()

  const opt = await import(pathToFileURL(join(root, 'server/lib/exerciseOptions.ts')).href)

  const only = new Set(process.argv.slice(2).filter((a) => !a.startsWith('--')))
  const stages = await db.collection('trail_stages').get()
  const typeOf = new Map(stages.docs.map((d) => [d.id, d.data().stage_type]))
  const questions = await db.collection('trail_stage_questions').get()
  const byId = new Map(questions.docs.map((d) => [d.id, d.data()]))

  const problems = []
  let exercises = 0
  for (const d of questions.docs) {
    const q = d.data()
    if (only.size && !only.has(q.trail_id)) continue
    if (q.active === false) continue
    if (typeOf.get(`${q.trail_id}_stage_${q.stage_number}`) !== 'exercise') continue
    exercises += 1
    const content = typeof q.content === 'string' ? q.content : ''
    const next = byId.get(`${q.trail_id}_stage_${q.stage_number + 1}_q_${q.question_number}`)
    const options = opt.resolveExerciseOptions(q.options, content)
    const where = `${q.trail_id} atividade ${q.question_number} etapa ${q.stage_number}`
    if (!options || options.length < 2) {
      problems.push(['SEM_ALTERNATIVAS', where, content.slice(0, 80).replace(/\n/g, ' ')])
      continue
    }
    const r = opt.resolveCorrectKey({
      correctOption: q.correct_option,
      exerciseContent: content,
      nextContent: typeof next?.content === 'string' ? next.content : '',
    })
    if (!r.key) problems.push(['SEM_GABARITO', where, ''])
    else {
      const idx = opt.normalizeAnswerForCompare(r.key)
      const ok = options.some((o, i) => opt.normalizeAnswerForCompare(o.key) === idx || String(i + 1) === idx)
      if (!ok) problems.push(['GABARITO_FORA', where, `gabarito ${r.key} (${r.source})`])
      if (r.conflict.length) problems.push(['CONFLITO', where, `${r.source}=${r.key} x ${r.conflict.map((c) => `${c.source}=${c.key}`).join(', ')}`])
    }
  }
  console.log(`${exercises} exercícios lidos, ${problems.length} problemas.`)
  for (const [kind, where, info] of problems) console.log(`${kind.padEnd(17)} ${where}${info ? `  | ${info}` : ''}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
