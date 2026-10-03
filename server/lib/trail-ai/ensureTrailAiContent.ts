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
  claimTrailAiGeneration,
  invalidateTrailAiDelivery,
  listRecentContextLogs,
  releaseTrailAiClaim,
  resolveDeliveredAiContent,
  trailAiDeliveryDocId,
  upsertTrailAiDeliveryCache,
  waitForTrailAiDelivery,
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

function asResult(
  content: string,
  generated: boolean,
  model: string | null,
  stageNumber: number,
  questionNumber: number,
  title: string | null,
): EnsureTrailAiResult {
  return {
    content,
    ai_status: 'ready',
    generated,
    model,
    stage_number: stageNumber,
    question_number: questionNumber,
    title,
  }
}

/**
 * Idempotente: no máximo um generate + um log trail-ai por célula.
 * Prefetch / advance / next-content compartilham o mesmo gate
 * (`trail_ai_deliveries` create-if-absent + cache ready).
 */
export async function ensureTrailAiContent(
  db: Firestore,
  input: {
    student_id: string
    trail_id: string
    /** Prefetch / célula explícita; default = posição atual do aluno. */
    stage_number?: number
    question_number?: number
    /** QA/admin: apaga cache da célula e regenera Gemini. */
    force_regenerate?: boolean
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

  const cell = {
    student_id: studentId,
    trail_id: trailId,
    stage_number: stageNumber,
    question_number: questionNumber,
  }

  const forceRegenerate = input.force_regenerate === true
  if (forceRegenerate) {
    await invalidateTrailAiDelivery(db, cell)
  }

  if (!forceRegenerate) {
    const claim = await claimTrailAiGeneration(db, cell)
    if (claim.kind === 'ready') {
      return asResult(
        claim.content.message_text,
        false,
        null,
        stageNumber,
        questionNumber,
        null,
      )
    }

    if (claim.kind === 'pending') {
      const waited = await waitForTrailAiDelivery(db, cell)
      if (waited) {
        return asResult(
          waited.message_text,
          false,
          null,
          stageNumber,
          questionNumber,
          null,
        )
      }
      // Timeout / failed: tenta reclaim; se outro vencer, espera de novo.
      const reclaim = await claimTrailAiGeneration(db, cell)
      if (reclaim.kind === 'ready') {
        return asResult(
          reclaim.content.message_text,
          false,
          null,
          stageNumber,
          questionNumber,
          null,
        )
      }
      if (reclaim.kind === 'pending') {
        const waited2 = await waitForTrailAiDelivery(db, cell, {
          timeoutMs: 6_000,
        })
        if (waited2) {
          return asResult(
            waited2.message_text,
            false,
            null,
            stageNumber,
            questionNumber,
            null,
          )
        }
        throw new Error('Timeout aguardando geração trail-ai da célula.')
      }
      // reclaim.kind === 'claimed' → segue para generate abaixo
    }
  } else {
    // force: marca pending sem tratar log antigo como ready.
    const id = trailAiDeliveryDocId(
      studentId,
      trailId,
      stageNumber,
      questionNumber,
    )
    const deliveries =
      process.env.TRAIL_AI_DELIVERIES_COLLECTION ?? 'trail_ai_deliveries'
    const now = Date.now()
    await db.collection(deliveries).doc(id).set({
      student_id: studentId,
      trail_id: trailId,
      stage_number: stageNumber,
      question_number: questionNumber,
      status: 'pending',
      source: 'trail-ai',
      claimed_at_ms: now,
      updated_at_ms: now,
      message_text: null,
      log_id: null,
      force_regenerate: true,
    })
  }

  // claimed — único gerador desta célula
  try {
    // Re-check logs (outra via pode ter persistido) — skip se force.
    if (!forceRegenerate) {
      const existingLog = await resolveDeliveredAiContent(db, cell)
      if (existingLog) {
        await upsertTrailAiDeliveryCache(db, {
          ...cell,
          message_text: existingLog.message_text,
          log_id: existingLog.log_id,
        })
        return asResult(
          existingLog.message_text,
          false,
          null,
          stageNumber,
          questionNumber,
          null,
        )
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
      await releaseTrailAiClaim(db, cell)
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
      await releaseTrailAiClaim(db, cell)
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
      await releaseTrailAiClaim(db, cell)
      const msg = e instanceof Error ? e.message : 'Falha na geração Gemini.'
      throw new Error(msg)
    }

    const formatted = formatAiAnswer(rawText)
    if (!formatted) {
      await releaseTrailAiClaim(db, cell)
      throw new Error('Resposta da IA vazia após formatação.')
    }

    // Nunca segundo log trail-ai na mesma célula (exceto force_regenerate).
    if (!forceRegenerate) {
      const raced = await resolveDeliveredAiContent(db, cell)
      if (raced) {
        await upsertTrailAiDeliveryCache(db, {
          ...cell,
          message_text: raced.message_text,
          log_id: raced.log_id,
        })
        return asResult(
          raced.message_text,
          false,
          null,
          stageNumber,
          questionNumber,
          title,
        )
      }
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
        ...(forceRegenerate ? { force_regenerate: true } : {}),
      },
    })

    await upsertTrailAiDeliveryCache(db, {
      ...cell,
      message_text: formatted,
      log_id: typeof created?.id === 'string' ? created.id : null,
    })

    return asResult(
      formatted,
      true,
      model,
      stageNumber,
      questionNumber,
      title,
    )
  } catch (e) {
    await releaseTrailAiClaim(db, cell).catch(() => {
      /* ignore */
    })
    throw e
  }
}
