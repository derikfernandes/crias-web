import type { Firestore } from 'firebase-admin/firestore'

import { requireEnrollment, questionDocId, stageDocId } from './enrollment'
import { TrailEngineError } from './errors'
import { getNextContent } from './getNextContent'
import { recordDelivery } from './recordMessage'
import { resolvePersistedDeliveryText } from './resolvePersistedDelivery'
import type { CollectionNames, TrailChannel } from './types'
import { defaultCollectionNames } from './types'

export type EnsureStepDeliveryResult = {
  content: string | null
  persisted: boolean
  already_had_delivery: boolean
  stage_number: number
  question_number: number
  stage_type: 'fixed' | 'exercise' | 'ai' | null
  progress_version: number
}

/**
 * Garante delivery em conversation_logs para a célula atual (fixed/exercise).
 * Stage `ai` NÃO gera aqui — use ensureTrailAiContent (CTA Continuar + gate).
 * Idempotente: se já existe log system na célula, devolve sem escrever.
 */
export async function ensureStepDelivery(
  db: Firestore,
  input: {
    student_id: string
    trail_id: string
    channel?: TrailChannel
  },
  collections: CollectionNames = defaultCollectionNames(),
): Promise<EnsureStepDeliveryResult> {
  const studentId = input.student_id.trim()
  const trailId = input.trail_id.trim()
  if (!studentId || !trailId) {
    throw new TrailEngineError(
      'invalid_payload',
      'student_id e trail_id são obrigatórios.',
    )
  }

  const progress = await requireEnrollment(db, studentId, trailId, collections)
  const stageNumber = progress.current_stage_number
  const questionNumber = progress.current_question_number
  const channel = input.channel ?? 'app'

  const next = await getNextContent(
    db,
    { student_id: studentId, trail_id: trailId, channel },
    collections,
  )

  const existing = await resolvePersistedDeliveryText(
    db,
    {
      student_id: studentId,
      trail_id: trailId,
      stage_number: stageNumber,
      question_number: questionNumber,
    },
    collections,
  )
  if (existing) {
    return {
      content: existing,
      persisted: false,
      already_had_delivery: true,
      stage_number: stageNumber,
      question_number: questionNumber,
      stage_type: next.stage_type,
      progress_version: progress.progress_version,
    }
  }

  if (next.stage_type === 'ai') {
    // Sem LLM neste helper — caller usa ensure-ai no Continuar.
    return {
      content: next.content,
      persisted: false,
      already_had_delivery: false,
      stage_number: stageNumber,
      question_number: questionNumber,
      stage_type: 'ai',
      progress_version: progress.progress_version,
    }
  }

  const text = next.content?.trim() || next.prompt?.trim() || ''
  if (!text) {
    // Fallback curriculum se getNextContent ainda não expôs body
    const [stageSnap, questionSnap] = await Promise.all([
      db.collection(collections.trailStages).doc(stageDocId(trailId, stageNumber)).get(),
      db
        .collection(collections.trailStageQuestions)
        .doc(questionDocId(trailId, stageNumber, questionNumber))
        .get(),
    ])
    const q = (questionSnap.data() ?? {}) as Record<string, unknown>
    const s = (stageSnap.data() ?? {}) as Record<string, unknown>
    const fallback =
      (typeof q.content === 'string' && q.content.trim()) ||
      (typeof s.prompt === 'string' && s.prompt.trim()) ||
      ''
    if (!fallback) {
      return {
        content: null,
        persisted: false,
        already_had_delivery: false,
        stage_number: stageNumber,
        question_number: questionNumber,
        stage_type: next.stage_type,
        progress_version: progress.progress_version,
      }
    }
    await recordDelivery(
      db,
      {
        student_id: studentId,
        trail_id: trailId,
        stage_number: stageNumber,
        question_number: questionNumber,
        message_text: fallback,
        channel,
        institution_id: progress.institution_id,
        message_type:
          next.stage_type === 'exercise' ? 'exercise' : 'instruction',
        kind: 'delivery',
      },
      collections,
    )
    return {
      content: fallback,
      persisted: true,
      already_had_delivery: false,
      stage_number: stageNumber,
      question_number: questionNumber,
      stage_type: next.stage_type,
      progress_version: progress.progress_version,
    }
  }

  await recordDelivery(
    db,
    {
      student_id: studentId,
      trail_id: trailId,
      stage_number: stageNumber,
      question_number: questionNumber,
      message_text: text,
      channel,
      institution_id: progress.institution_id,
      message_type: next.stage_type === 'exercise' ? 'exercise' : 'instruction',
      kind: 'delivery',
    },
    collections,
  )

  return {
    content: text,
    persisted: true,
    already_had_delivery: false,
    stage_number: stageNumber,
    question_number: questionNumber,
    stage_type: next.stage_type,
    progress_version: progress.progress_version,
  }
}
