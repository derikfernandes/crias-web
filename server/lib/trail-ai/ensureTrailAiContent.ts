import type { Firestore } from 'firebase-admin/firestore'

import { TrailEngineError } from '../trail-engine/errors'
import {
  questionDocId,
  requireEnrollment,
  stageDocId,
} from '../trail-engine/enrollment'
import { recordDelivery } from '../trail-engine/recordMessage'
import type { CollectionNames, TrailChannel } from '../trail-engine/types'
import { defaultCollectionNames } from '../trail-engine/types'
import {
  buildTrailAiPrompt,
  formatContextFromLogs,
} from './buildTrailAiPrompt'
import { formatAiAnswer } from './formatAiAnswer'
import {
  generateContentWithGemini,
  isTrailAiDisabled,
} from './geminiClient'
import {
  listRecentContextLogs,
  resolveDeliveredAiContent,
} from './resolveDeliveredAiContent'

export type EnsureTrailAiResult = {
  content: string
  ai_status: 'ready'
  generated: boolean
  model: string | null
  progress_version: number
  stage_number: number
  question_number: number
  title: string | null
}

function contextLimit(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.TRAIL_AI_CONTEXT_LIMIT
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n > 0 ? Math.min(50, n) : 20
}

/**
 * Idempotente: se já existe delivery em conversation_logs para a célula atual,
 * devolve esse texto. Senão chama Gemini (prompt WA + CONTEXT) e persiste.
 */
export async function ensureTrailAiContent(
  db: Firestore,
  input: {
    student_id: string
    trail_id: string
    channel?: TrailChannel
  },
  collections: CollectionNames = defaultCollectionNames(),
  env: NodeJS.ProcessEnv = process.env,
  generateImpl: typeof generateContentWithGemini = generateContentWithGemini,
): Promise<EnsureTrailAiResult> {
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

  const existing = await resolveDeliveredAiContent(
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
      content: existing.message_text,
      ai_status: 'ready',
      generated: false,
      model: null,
      progress_version: progress.progress_version,
      stage_number: stageNumber,
      question_number: questionNumber,
      title: null,
    }
  }

  const [stageSnap, questionSnap, studentSnap] = await Promise.all([
    db
      .collection(collections.trailStages)
      .doc(stageDocId(trailId, stageNumber))
      .get(),
    db
      .collection(collections.trailStageQuestions)
      .doc(questionDocId(trailId, stageNumber, questionNumber))
      .get(),
    db.collection(collections.students).doc(studentId).get(),
  ])

  const stageData = (stageSnap.data() ?? {}) as Record<string, unknown>
  const questionData = (questionSnap.data() ?? {}) as Record<string, unknown>
  const studentData = (studentSnap.data() ?? {}) as Record<string, unknown>

  if (stageData.stage_type !== 'ai') {
    throw new TrailEngineError(
      'invalid_payload',
      'ensure-ai só aplica a stages do tipo "ai".',
      { stage_type: stageData.stage_type ?? null },
    )
  }

  const prompt = typeof stageData.prompt === 'string' ? stageData.prompt : ''
  const content =
    typeof questionData.content === 'string' ? questionData.content : ''
  const title =
    typeof stageData.title === 'string'
      ? stageData.title
      : typeof questionData.title === 'string'
        ? questionData.title
        : null
  const name = typeof studentData.name === 'string' ? studentData.name : 'Aluno'
  const student_level =
    typeof studentData.student_level === 'number'
      ? studentData.student_level
      : typeof studentData.student_level === 'string'
        ? studentData.student_level
        : 2

  if (isTrailAiDisabled(env)) {
    throw new TrailEngineError(
      'internal_error',
      'Geração IA desligada (TRAIL_AI_DISABLED). Sem delivery prévio nesta célula.',
    )
  }

  const recent = await listRecentContextLogs(
    db,
    {
      student_id: studentId,
      trail_id: trailId,
      limit: contextLimit(env),
    },
    collections,
  )
  const context = formatContextFromLogs(recent, contextLimit(env))
  const built = buildTrailAiPrompt({
    name,
    student_level,
    prompt,
    content,
    context,
    trail_title: title,
  })

  let rawText: string
  let model: string
  try {
    const gen = await generateImpl(
      {
        systemInstruction: built.systemInstruction,
        userText: built.userText,
      },
      env,
    )
    rawText = gen.text
    model = gen.model
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha na geração Gemini.'
    throw new TrailEngineError('internal_error', msg)
  }

  const formatted = formatAiAnswer(rawText)
  if (!formatted) {
    throw new TrailEngineError(
      'internal_error',
      'Resposta da IA vazia após formatação.',
    )
  }

  const channel = input.channel ?? 'app'
  const idemKey = `trail_ai_${studentId}_${trailId}_${stageNumber}_${questionNumber}`
  await recordDelivery(
    db,
    {
      student_id: studentId,
      trail_id: trailId,
      stage_number: stageNumber,
      question_number: questionNumber,
      message_text: formatted,
      channel,
      institution_id: progress.institution_id,
      message_type: 'instruction',
      idempotency_key: idemKey,
      metadata: {
        source: 'trail-ai',
        stage_type: 'ai',
        model,
      },
    },
    collections,
  )

  return {
    content: formatted,
    ai_status: 'ready',
    generated: true,
    model,
    progress_version: progress.progress_version,
    stage_number: stageNumber,
    question_number: questionNumber,
    title,
  }
}
