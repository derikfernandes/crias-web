/**
 * Testes de contrato das validações de backend (sem hit no banco).
 * Garante que enums e campos obrigatórios documentados permanecem iguais.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('studentTrailValidation preserva statuses do contrato', () => {
  const src = readFileSync(
    join(root, 'server/lib/studentTrailValidation.ts'),
    'utf8',
  )
  for (const status of [
    'not_started',
    'in_progress',
    'completed',
    'blocked',
  ]) {
    assert.match(src, new RegExp(`['"]${status}['"]`), `status ausente: ${status}`)
  }
  assert.match(src, /student_id/)
  assert.match(src, /institution_id/)
  assert.match(src, /trail_id/)
  assert.match(src, /current_stage_number/)
  assert.match(src, /current_question_number/)
})

test('exerciseAttemptValidation e conversationLogValidation existem', () => {
  const exercise = readFileSync(
    join(root, 'server/lib/exerciseAttemptValidation.ts'),
    'utf8',
  )
  const conversation = readFileSync(
    join(root, 'server/lib/conversationLogValidation.ts'),
    'utf8',
  )
  assert.match(exercise, /export\s+function/)
  assert.match(conversation, /export\s+function/)
})

test('coleções Firestore usadas pelo admin permanecem com os nomes do contrato', () => {
  const checks = [
    ['institutionFirestore.ts', 'institutions'],
    ['studentFirestore.ts', 'students'],
    ['trailFirestore.ts', 'trails'],
    ['trailStageFirestore.ts', 'trail_stages'],
    ['trailStageQuestionFirestore.ts', 'trail_stage_questions'],
    ['studentTrailFirestore.ts', 'student_trails'],
    ['conversationLogFirestore.ts', 'conversation_logs'],
  ]
  for (const [file, collection] of checks) {
    const src = readFileSync(
      join(root, 'frontend/crias-painel/src/lib', file),
      'utf8',
    )
    assert.match(
      src,
      new RegExp(`['"]${collection}['"]`),
      `${file} deve referenciar a coleção "${collection}"`,
    )
  }
})
