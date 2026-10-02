import type { Firestore } from 'firebase-admin/firestore'

import { questionDocId, requireEnrollment, stageDocId } from './enrollment'
import { TrailEngineError } from './errors'
import {
  resolvePersistedDeliveryText,
  resolveStepDisplayBody,
} from './resolvePersistedDelivery'
import type {
  AiContentStatus,
  CollectionNames,
  NextContentResult,
  StageType,
  TrailChannel,
} from './types'
import { defaultCollectionNames } from './types'

function parseStageType(raw: unknown): StageType | null {
  if (raw === 'ai' || raw === 'fixed' || raw === 'exercise') return raw
  return null
}

/**
 * Compõe posição + stage + question + release numa única resposta (I4).
 * Pure decision helper exportado para testes.
 * GET nunca chama LLM — stage `ai` sem log → ai_status=pending.
 */
export function decideNextAction(input: {
  status: string
  stageExists: boolean
  questionExists: boolean
  is_released: boolean
  stage_type: StageType | null
}): NextContentResult['next_action'] {
  if (input.status === 'completed') return 'completed'
  if (input.status === 'blocked') return 'blocked'
  if (!input.stageExists || !input.questionExists) return 'blocked'
  if (!input.is_released) return 'await_release'
  if (input.stage_type === 'exercise') return 'await_answer'
  return 'deliver_content'
}

function resolveAiStatus(input: {
  stage_type: StageType | null
  next_action: NextContentResult['next_action']
  content_source: NextContentResult['content_source']
}): AiContentStatus {
  if (input.stage_type !== 'ai' || input.next_action !== 'deliver_content') {
    return 'not_applicable'
  }
  if (input.content_source === 'persisted_delivery') return 'ready'
  return 'pending'
}

export async function getNextContent(
  db: Firestore,
  input: {
    student_id: string
    trail_id: string
    channel?: TrailChannel
  },
  collections: CollectionNames = defaultCollectionNames(),
): Promise<NextContentResult> {
  const studentId = input.student_id.trim()
  const trailId = input.trail_id.trim()
  if (!studentId || !trailId) {
    throw new TrailEngineError(
      'invalid_payload',
      'student_id e trail_id são obrigatórios.',
    )
  }

  const progress = await requireEnrollment(db, studentId, trailId, collections)

  if (progress.status === 'completed') {
    return {
      status: 'completed',
      student_id: studentId,
      trail_id: trailId,
      stage_number: progress.current_stage_number,
      question_number: progress.current_question_number,
      stage_type: null,
      prompt: null,
      content: null,
      content_source: 'none',
      options: null,
      explanation: null,
      is_released: false,
      next_action: 'completed',
      progress_version: progress.progress_version,
      title: null,
      ai_status: 'not_applicable',
    }
  }

  if (progress.status === 'blocked') {
    return {
      status: 'blocked',
      student_id: studentId,
      trail_id: trailId,
      stage_number: progress.current_stage_number,
      question_number: progress.current_question_number,
      stage_type: null,
      prompt: null,
      content: null,
      content_source: 'none',
      options: null,
      explanation: null,
      is_released: false,
      next_action: 'blocked',
      progress_version: progress.progress_version,
      title: null,
      ai_status: 'not_applicable',
    }
  }

  const stageNumber = progress.current_stage_number
  const questionNumber = progress.current_question_number

  const [stageSnap, questionSnap] = await Promise.all([
    db
      .collection(collections.trailStages)
      .doc(stageDocId(trailId, stageNumber))
      .get(),
    db
      .collection(collections.trailStageQuestions)
      .doc(questionDocId(trailId, stageNumber, questionNumber))
      .get(),
  ])

  const stageData = stageSnap.exists
    ? ((stageSnap.data() ?? {}) as Record<string, unknown>)
    : null
  const questionData = questionSnap.exists
    ? ((questionSnap.data() ?? {}) as Record<string, unknown>)
    : null

  const stage_type = stageData ? parseStageType(stageData.stage_type) : null
  const prompt =
    stage_type === 'ai' && typeof stageData?.prompt === 'string'
      ? stageData.prompt
      : null
  const title =
    typeof stageData?.title === 'string'
      ? stageData.title
      : typeof questionData?.title === 'string'
        ? questionData.title
        : null

  const curriculumContent =
    typeof questionData?.content === 'string' ? questionData.content : null
  const persistedDelivery = await resolvePersistedDeliveryText(
    db,
    {
      student_id: studentId,
      trail_id: trailId,
      stage_number: stageNumber,
      question_number: questionNumber,
    },
    collections,
  )
  const resolvedBody = resolveStepDisplayBody({
    stage_type,
    curriculum_content: curriculumContent,
    persisted_delivery: persistedDelivery,
  })
  const content = resolvedBody.body
  const options = questionData?.options ?? null
  const explanation =
    typeof questionData?.explanation === 'string'
      ? questionData.explanation
      : null
  const is_released =
    typeof questionData?.is_released === 'boolean'
      ? questionData.is_released
      : typeof stageData?.is_released === 'boolean'
        ? stageData.is_released
        : false

  const next_action = decideNextAction({
    status: progress.status,
    stageExists: stageSnap.exists,
    questionExists: questionSnap.exists,
    is_released,
    stage_type,
  })

  const status: NextContentResult['status'] =
    next_action === 'await_release'
      ? 'await_release'
      : next_action === 'blocked'
        ? 'blocked'
        : next_action === 'completed'
          ? 'completed'
          : 'ok'

  const ai_status = resolveAiStatus({
    stage_type,
    next_action,
    content_source: resolvedBody.source,
  })

  return {
    status,
    student_id: studentId,
    trail_id: trailId,
    stage_number: stageNumber,
    question_number: questionNumber,
    stage_type,
    prompt,
    content,
    content_source: resolvedBody.source,
    options,
    explanation,
    is_released,
    next_action,
    progress_version: progress.progress_version,
    title,
    ai_status,
  }
}
