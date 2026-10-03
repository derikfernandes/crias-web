import type { Firestore } from 'firebase-admin/firestore'

import { createConversationLog } from '../conversationLogService'
import { getStudentTrailPosition } from '../studentTrailService'
import { trailStageQuestionDocId } from '../trailStageQuestionService'
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
  upsertTrailAiDeliveryCache,
} from './resolveDeliveredAiContent'

export type EnsureTrailAiResult = {
  content: string
  ai_status: 'ready'
  generated: boolean
  model: string | null
  stage_number: number
  question_number: number
  title: string | null
}

function contextLimit(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.TRAIL_AI_CONTEXT_LIMIT
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n > 0 ? Math.min(50, n) : 20
}

function stageDocId(trailId: string, stageNumber: number): string {
  return `${trailId}_stage_${stageNumber}`
}

/**
 * Idempotente: se já existe delivery em conversation_logs para a célula atual,
 * devolve esse texto. Senão chama Gemini (prompt gerador + CONTEXT) e persiste.
 */
export async function ensureTrailAiContent(
  db: Firestore,
  input: {
    student_id: string
    trail_id: string
    /** Prefetch / célula explícita; default = posição atual do aluno. */
    stage_number?: number
    question_number?: number
  },
  env: NodeJS.ProcessEnv = process.env,
  generateImpl: typeof generateContentWithGemini = generateContentWithGemini,
): Promise<EnsureTrailAiResult> {
  const studentId = input.student_id.trim()
  const trailId = input.trail_id.trim()
  if (!studentId || !trailId) {
    throw new Error('student_id e trail_id são obrigatórios.')
  }

  const studentTrailsCollection =
    process.env.STUDENT_TRAILS_COLLECTION ?? 'student_trails'
  const progress = await getStudentTrailPosition(
    db,
    studentTrailsCollection,
    studentId,
    trailId,
  )
  if (!progress) {
    throw new Error('Vínculo aluno/trilha não encontrado.')
  }

  const stageNumber =
    typeof input.stage_number === 'number' && input.stage_number >= 1
      ? Math.trunc(input.stage_number)
      : progress.current_stage_number
  const questionNumber =
    typeof input.question_number === 'number' && input.question_number >= 1
      ? Math.trunc(input.question_number)
      : progress.current_question_number

  const existing = await resolveDeliveredAiContent(db, {
    student_id: studentId,
    trail_id: trailId,
    stage_number: stageNumber,
    question_number: questionNumber,
  })
  if (existing) {
    // Garante cache O(1) mesmo quando veio do fallback de logs.
    void upsertTrailAiDeliveryCache(db, {
      student_id: studentId,
      trail_id: trailId,
      stage_number: stageNumber,
      question_number: questionNumber,
      message_text: existing.message_text,
      log_id: existing.log_id,
    }).catch(() => {
      /* best-effort */
    })
    return {
      content: existing.message_text,
      ai_status: 'ready',
      generated: false,
      model: null,
      stage_number: stageNumber,
      question_number: questionNumber,
      title: null,
    }
  }

  const stagesCollection = process.env.TRAIL_STAGES_COLLECTION ?? 'trail_stages'
  const questionsCollection =
    process.env.TRAIL_STAGE_QUESTIONS_COLLECTION ?? 'trail_stage_questions'
  const studentsCollection = process.env.STUDENTS_COLLECTION ?? 'students'
  const logsCollection =
    process.env.CONVERSATION_LOGS_COLLECTION ?? 'conversation_logs'

  const [stageSnap, questionSnap, studentSnap] = await Promise.all([
    db.collection(stagesCollection).doc(stageDocId(trailId, stageNumber)).get(),
    db
      .collection(questionsCollection)
      .doc(trailStageQuestionDocId(trailId, stageNumber, questionNumber))
      .get(),
    db.collection(studentsCollection).doc(studentId).get(),
  ])

  const stageData = (stageSnap.data() ?? {}) as Record<string, unknown>
  const questionData = (questionSnap.data() ?? {}) as Record<string, unknown>
  const studentData = (studentSnap.data() ?? {}) as Record<string, unknown>

  if (stageData.stage_type !== 'ai') {
    throw new Error('ensure-ai só aplica a stages do tipo "ai".')
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
  const name = typeof studentData.name === 'string' ? studentData.name : ''
  const school_grade =
    typeof studentData.school_grade === 'string'
      ? studentData.school_grade
      : ''
  const student_level =
    typeof studentData.student_level === 'number'
      ? studentData.student_level
      : typeof studentData.student_level === 'string'
        ? studentData.student_level
        : 2
  const institution_id =
    typeof studentData.institution_id === 'string'
      ? studentData.institution_id
      : typeof progress.institution_id === 'string'
        ? progress.institution_id
        : null

  if (isTrailAiDisabled(env)) {
    throw new Error(
      'Geração IA desligada (TRAIL_AI_DISABLED). Sem delivery prévio nesta célula.',
    )
  }

  const recent = await listRecentContextLogs(db, {
    student_id: studentId,
    trail_id: trailId,
    limit: contextLimit(env),
  })
  const context = formatContextFromLogs(recent, contextLimit(env))
  const built = buildTrailAiPrompt({
    name,
    school_grade,
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
    throw new Error(msg)
  }

  const formatted = formatAiAnswer(rawText)
  if (!formatted) {
    throw new Error('Resposta da IA vazia após formatação.')
  }

  const created = await createConversationLog(db, logsCollection, {
    student_id: studentId,
    trail_id: trailId,
    stage_number: stageNumber,
    question_number: questionNumber,
    sender: 'system',
    message_text: formatted,
    institution_id,
    message_type: 'instruction',
    metadata: {
      source: 'trail-ai',
      stage_type: 'ai',
      model,
      channel: 'app',
    },
  })

  await upsertTrailAiDeliveryCache(db, {
    student_id: studentId,
    trail_id: trailId,
    stage_number: stageNumber,
    question_number: questionNumber,
    message_text: formatted,
    log_id: typeof created?.id === 'string' ? created.id : null,
  })

  return {
    content: formatted,
    ai_status: 'ready',
    generated: true,
    model,
    stage_number: stageNumber,
    question_number: questionNumber,
    title,
  }
}
