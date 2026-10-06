import type { Firestore } from 'firebase-admin/firestore'

import { createConversationLog } from '../conversationLogService'
import { normalizeAnswerForCompare, resolveExerciseOptions } from '../exerciseOptions'
import { getStudentTrailPosition } from '../studentTrailService'
import { trailStageQuestionDocId } from '../trailStageQuestionService'
import {
  buildTrailAiPrompt,
  formatContextFromLogs,
} from './buildTrailAiPrompt'
import {
  blocoMismatchesSubject,
  contentFingerprint,
  enrichBlocoContent,
  extractCorrectLetterFromText,
  filterContextForBloco,
  isBlocoRespostaPrompt,
} from './blocoSubjectGuard'
import { formatAiAnswer } from './formatAiAnswer'
import {
  generateContentWithGemini,
  isTrailAiDisabled,
} from './geminiClient'
import {
  claimTrailAiGeneration,
  invalidateTrailAiDelivery,
  listRecentContextLogs,
  readTrailAiDeliveryFingerprint,
  releaseTrailAiClaim,
  resolveDeliveredAiContent,
  trailAiDeliveryDocId,
  type DeliveredAiContent,
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
  /**
   * true quando o texto desta célula já foi mostrado ao aluno como o feedback
   * do exercício anterior (gerado no envio com a resposta dele).
   */
  shown_as_exercise_feedback: boolean
  /** Log trail-ai da entrega (quando existe). */
  log_id: string | null
  /** Entrega já marcada como vista pelo aluno (ordem do histórico). */
  delivered_marked: boolean
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
  delivery?: Partial<DeliveredAiContent> | null,
): EnsureTrailAiResult {
  return {
    content,
    ai_status: 'ready',
    generated,
    model,
    stage_number: stageNumber,
    question_number: questionNumber,
    title,
    shown_as_exercise_feedback: delivery?.shown_as_exercise_feedback === true,
    log_id: typeof delivery?.log_id === 'string' ? delivery.log_id : null,
    delivered_marked: Boolean(delivery?.delivered_at_brasilia),
  }
}

type CellMeta = {
  prompt: string
  baseContent: string
  enrichedContent: string
  title: string | null
  fingerprint: string
  subjectSource: string
  isBloco: boolean
  /** Stage anterior (mesma aula) é exercício → esta célula é o feedback dele. */
  followsExercise: boolean
}

type DocData = Record<string, unknown>

/** Docs já lidos pelo caller (evita reler no caminho quente do feedback). */
export type CellMetaPreload = {
  stage?: DocData | null
  question?: DocData | null
  prevStage?: DocData | null
  prevQuestion?: DocData | null
}

function readStageType(data: DocData | null | undefined): string {
  return typeof data?.stage_type === 'string'
    ? data.stage_type.trim().toLowerCase()
    : ''
}

async function loadPreviousExercise(
  db: Firestore,
  trailId: string,
  stageNumber: number,
  questionNumber: number,
): Promise<{
  content: string
  title: string | null
  correct_option: string | null
} | null> {
  const stagesCollection = process.env.TRAIL_STAGES_COLLECTION ?? 'trail_stages'
  const questionsCollection =
    process.env.TRAIL_STAGE_QUESTIONS_COLLECTION ?? 'trail_stage_questions'

  for (let s = stageNumber - 1; s >= Math.max(1, stageNumber - 6); s--) {
    const stageSnap = await db
      .collection(stagesCollection)
      .doc(stageDocId(trailId, s))
      .get()
    if (!stageSnap.exists) continue
    const stageData = (stageSnap.data() ?? {}) as Record<string, unknown>
    const stageType =
      typeof stageData.stage_type === 'string'
        ? stageData.stage_type.trim().toLowerCase()
        : ''
    if (stageType !== 'exercise') continue

    const qSnap = await db
      .collection(questionsCollection)
      .doc(trailStageQuestionDocId(trailId, s, questionNumber))
      .get()
    if (!qSnap.exists) continue
    const qData = (qSnap.data() ?? {}) as Record<string, unknown>
    const content = typeof qData.content === 'string' ? qData.content : ''
    if (!content.trim()) continue
    return {
      content,
      title:
        typeof stageData.title === 'string'
          ? stageData.title
          : typeof qData.title === 'string'
            ? qData.title
            : null,
      correct_option:
        typeof qData.correct_option === 'string' ? qData.correct_option : null,
    }
  }
  return null
}

async function loadCellMeta(
  db: Firestore,
  trailId: string,
  stageNumber: number,
  questionNumber: number,
  preload?: CellMetaPreload,
): Promise<CellMeta & { stageType: string }> {
  const stagesCollection = process.env.TRAIL_STAGES_COLLECTION ?? 'trail_stages'
  const questionsCollection =
    process.env.TRAIL_STAGE_QUESTIONS_COLLECTION ?? 'trail_stage_questions'

  const readDoc = async (
    collection: string,
    id: string,
    known: DocData | null | undefined,
  ): Promise<DocData | null> => {
    if (known !== undefined) return known
    const snap = await db.collection(collection).doc(id).get()
    return snap.exists ? ((snap.data() ?? {}) as DocData) : null
  }

  // Stage + questão + stage anterior em paralelo (estrutura, não título).
  const [stageData, questionData, prevStageData] = await Promise.all([
    readDoc(stagesCollection, stageDocId(trailId, stageNumber), preload?.stage),
    readDoc(
      questionsCollection,
      trailStageQuestionDocId(trailId, stageNumber, questionNumber),
      preload?.question,
    ),
    stageNumber > 1
      ? readDoc(
          stagesCollection,
          stageDocId(trailId, stageNumber - 1),
          preload?.prevStage,
        )
      : Promise.resolve(null),
  ])

  const stageType = readStageType(stageData)
  const prompt = typeof stageData?.prompt === 'string' ? stageData.prompt : ''
  const baseContent =
    typeof questionData?.content === 'string' ? questionData.content : ''
  const title =
    typeof stageData?.title === 'string'
      ? stageData.title
      : typeof questionData?.title === 'string'
        ? questionData.title
        : null

  // Fase AI logo após um exercício = feedback desse exercício (estrutural).
  // Marcadores no comando seguem valendo para BLOCO legado mais distante.
  const followsExercise = readStageType(prevStageData) === 'exercise'
  const isBloco = followsExercise || isBlocoRespostaPrompt(prompt, title)
  let enrichedContent = baseContent
  let subjectSource = baseContent
  let prevContent = ''
  let prevCorrect: string | null = null
  let prevTitle: string | null = null

  if (isBloco) {
    let prev: {
      content: string
      title: string | null
      correct_option: string | null
    } | null = null
    if (followsExercise) {
      const prevQuestion = await readDoc(
        questionsCollection,
        trailStageQuestionDocId(trailId, stageNumber - 1, questionNumber),
        preload?.prevQuestion,
      )
      const content =
        typeof prevQuestion?.content === 'string' ? prevQuestion.content : ''
      if (content.trim()) {
        prev = {
          content,
          title:
            typeof prevStageData?.title === 'string'
              ? prevStageData.title
              : typeof prevQuestion?.title === 'string'
                ? prevQuestion.title
                : null,
          correct_option:
            typeof prevQuestion?.correct_option === 'string'
              ? prevQuestion.correct_option
              : null,
        }
      }
    } else {
      prev = await loadPreviousExercise(
        db,
        trailId,
        stageNumber,
        questionNumber,
      )
    }
    if (prev) {
      prevContent = prev.content
      prevCorrect = prev.correct_option
      prevTitle = prev.title
      subjectSource = prev.content
      const letter =
        extractCorrectLetterFromText(baseContent) ||
        (prev.correct_option
          ? /^\d+$/.test(prev.correct_option)
            ? String.fromCharCode(64 + Number(prev.correct_option))
            : prev.correct_option.toUpperCase()
          : null)
      enrichedContent = enrichBlocoContent({
        blocoContent: baseContent,
        exerciseContent: prev.content,
        exerciseTitle: prev.title,
        correctOption: prev.correct_option,
        correctLetter: letter,
      })
    }
  }

  const fingerprint = contentFingerprint([
    prompt,
    baseContent,
    prevContent,
    prevCorrect,
    prevTitle,
    title,
  ])

  return {
    prompt,
    baseContent,
    enrichedContent,
    title,
    fingerprint,
    subjectSource,
    isBloco,
    followsExercise,
    stageType,
  }
}

async function cachedDeliveryIsValid(
  db: Firestore,
  cell: {
    student_id: string
    trail_id: string
    stage_number: number
    question_number: number
  },
  messageText: string,
  meta: CellMeta,
): Promise<boolean> {
  if (meta.isBloco && blocoMismatchesSubject(messageText, meta.subjectSource)) {
    return false
  }
  const cached = await readTrailAiDeliveryFingerprint(db, cell)
  if (cached?.content_fingerprint) {
    return cached.content_fingerprint === meta.fingerprint
  }
  // Legado sem fingerprint: se é BLOCO e o texto não contém âncoras do exercício
  // quando o exercício tem termos claros, força regeneração uma vez.
  if (meta.isBloco && meta.subjectSource.trim().length > 40) {
    const subjectTokens = meta.subjectSource
      .toLowerCase()
      .match(
        /\b(di[aâ]metro|raio|circunfer[eê]ncia|c[ií]rculo|gostar|reg[eê]ncia)\b/gi,
      )
    if (subjectTokens && subjectTokens.length > 0) {
      const lower = messageText.toLowerCase()
      const hit = subjectTokens.some((t) => lower.includes(t.toLowerCase()))
      if (!hit) return false
    }
  }
  return true
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

  const meta = await loadCellMeta(db, trailId, stageNumber, questionNumber)

  const forceRegenerate = input.force_regenerate === true
  if (forceRegenerate) {
    await invalidateTrailAiDelivery(db, cell)
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
      content_fingerprint: null,
    })
  }

  let hasClaim = forceRegenerate
  if (!forceRegenerate) {
    // Até 3 tentativas: ready inválido (matéria errada) → invalidate → reclaim.
    for (let attempt = 0; attempt < 3; attempt++) {
      const claim = await claimTrailAiGeneration(db, cell)
      if (claim.kind === 'ready') {
        const valid = await cachedDeliveryIsValid(
          db,
          cell,
          claim.content.message_text,
          meta,
        )
        if (valid) {
          return asResult(
            claim.content.message_text,
            false,
            null,
            stageNumber,
            questionNumber,
            meta.title,
            claim.content,
          )
        }
        await invalidateTrailAiDelivery(db, cell)
        continue
      }
      if (claim.kind === 'pending') {
        const waited = await waitForTrailAiDelivery(db, cell, {
          timeoutMs: attempt === 0 ? 12_000 : 6_000,
        })
        if (waited) {
          const valid = await cachedDeliveryIsValid(
            db,
            cell,
            waited.message_text,
            meta,
          )
          if (valid) {
            return asResult(
              waited.message_text,
              false,
              null,
              stageNumber,
              questionNumber,
              meta.title,
              waited,
            )
          }
          await invalidateTrailAiDelivery(db, cell)
          continue
        }
        continue
      }
      // claim.kind === 'claimed'
      hasClaim = true
      break
    }
    if (!hasClaim) {
      throw new Error('Timeout aguardando geração trail-ai da célula.')
    }
  }

  // claimed — único gerador desta célula
  try {
    // Re-check logs (outra via pode ter persistido) — skip se force.
    if (!forceRegenerate) {
      const existingLog = await resolveDeliveredAiContent(db, cell)
      if (existingLog) {
        const valid = await cachedDeliveryIsValid(
          db,
          cell,
          existingLog.message_text,
          meta,
        )
        if (valid) {
          await upsertTrailAiDeliveryCache(db, {
            ...cell,
            message_text: existingLog.message_text,
            log_id: existingLog.log_id,
            content_fingerprint: meta.fingerprint,
          })
          return asResult(
            existingLog.message_text,
            false,
            null,
            stageNumber,
            questionNumber,
            meta.title,
            existingLog,
          )
        }
        // log legado inválido (matéria errada): não reusa — gera de novo
      }
    }

    if (meta.stageType !== 'ai') {
      await releaseTrailAiClaim(db, cell)
      throw new Error('ensure-ai só aplica a stages do tipo "ai".')
    }

    if (isTrailAiDisabled(env)) {
      await releaseTrailAiClaim(db, cell)
      throw new Error(
        'Geração IA desligada (TRAIL_AI_DISABLED). Sem delivery prévio nesta célula.',
      )
    }

    const studentsCollection = process.env.STUDENTS_COLLECTION ?? 'students'
    // Aluno + CONTEXT em paralelo (antes: leituras em série antes do Gemini).
    const [studentSnap, recent] = await Promise.all([
      db.collection(studentsCollection).doc(studentId).get(),
      listRecentContextLogs(db, {
        student_id: studentId,
        trail_id: trailId,
        limit: contextLimit(env),
      }),
    ])
    const studentData = (studentSnap.data() ?? {}) as Record<string, unknown>

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

    let context = formatContextFromLogs(recent, contextLimit(env))
    if (meta.isBloco) {
      context = filterContextForBloco(context, {
        stage_number: stageNumber,
        question_number: questionNumber,
        subjectSource: meta.subjectSource,
      })
    }

    const built = buildTrailAiPrompt({
      name,
      school_grade,
      student_level,
      prompt: meta.prompt,
      content: meta.enrichedContent,
      context,
      trail_title: meta.title,
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

    let formatted = formatAiAnswer(rawText)
    if (!formatted) {
      await releaseTrailAiClaim(db, cell)
      throw new Error('Resposta da IA vazia após formatação.')
    }

    // Guardrail pós-geração: se ainda veio matéria errada, não cacheia.
    if (
      meta.isBloco &&
      blocoMismatchesSubject(formatted, meta.subjectSource)
    ) {
      await releaseTrailAiClaim(db, cell)
      throw new Error(
        'Geração BLOCO RESPOSTA incoerente com o exercício (matéria divergente). Tente novamente.',
      )
    }

    // Nunca segundo log trail-ai na mesma célula (exceto force_regenerate).
    if (!forceRegenerate) {
      const raced = await resolveDeliveredAiContent(db, cell)
      if (raced) {
        const valid = await cachedDeliveryIsValid(
          db,
          cell,
          raced.message_text,
          meta,
        )
        if (valid) {
          await upsertTrailAiDeliveryCache(db, {
            ...cell,
            message_text: raced.message_text,
            log_id: raced.log_id,
            content_fingerprint: meta.fingerprint,
          })
          return asResult(
            raced.message_text,
            false,
            null,
            stageNumber,
            questionNumber,
            meta.title,
            raced,
          )
        }
      }
    }

    const created = await createConversationLog(db, logsCollectionName(), {
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
        content_fingerprint: meta.fingerprint,
        ...(forceRegenerate ? { force_regenerate: true } : {}),
      },
    })

    await upsertTrailAiDeliveryCache(db, {
      ...cell,
      message_text: formatted,
      log_id: typeof created?.id === 'string' ? created.id : null,
      content_fingerprint: meta.fingerprint,
    })

    return asResult(
      formatted,
      true,
      model,
      stageNumber,
      questionNumber,
      meta.title,
      { log_id: typeof created?.id === 'string' ? created.id : undefined },
    )
  } catch (e) {
    await releaseTrailAiClaim(db, cell).catch(() => {
      /* ignore */
    })
    throw e
  }
}

export type ExerciseAttemptForFeedback = {
  /** Célula do exercício respondido. */
  stage_number: number
  question_number: number
  /** Chave da alternativa escolhida (ex.: "B"). */
  student_answer: string
  /** null = questão sem gabarito (attempt unscored). */
  is_correct: boolean | null
}

/**
 * Bloco de dados da tentativa para o CONTENT do BLOCO RESPOSTA.
 * Só dados (alternativa escolhida + resultado pelo gabarito da escola);
 * o texto pedagógico continua vindo do comando do bloco + IA.
 */
export function buildAttemptContentSection(input: {
  student_answer: string
  is_correct: boolean | null
  options: Array<{ key: string; text: string }> | null
}): string {
  const answer = String(input.student_answer ?? '').trim()
  const norm = normalizeAnswerForCompare(answer)
  const match = (input.options ?? []).find(
    (o, idx) =>
      o.key.trim().toUpperCase() === answer.toUpperCase() ||
      normalizeAnswerForCompare(o.key) === norm ||
      String(idx + 1) === norm,
  )
  const chosen = match?.text?.trim() || answer
  const lines = [
    '=== RESPOSTA DO ALUNO NESTA TENTATIVA ===',
    `Alternativa escolhida pelo aluno: ${chosen}`,
  ]
  if (input.is_correct === true) lines.push('Resultado pelo gabarito: CORRETA')
  else if (input.is_correct === false) {
    lines.push('Resultado pelo gabarito: INCORRETA')
  }
  return lines.join('\n')
}

function feedbackTimeoutMs(env: NodeJS.ProcessEnv): number {
  const raw = env.TRAIL_AI_FEEDBACK_TIMEOUT_MS
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : 30_000
}

/** Leituras do feedback já feitas em paralelo pelo caller (ex.: durante o insert do attempt). */
export type AttemptFeedbackPreload = {
  /** Stage/questão da célula de feedback (stage AI logo após o exercício). */
  feedbackStage?: DocData | null
  feedbackQuestion?: DocData | null
  /** Stage/questão do exercício respondido. */
  exerciseStage?: DocData | null
  exerciseQuestion?: DocData | null
  student?: DocData | null
  recentLogs?: Awaited<ReturnType<typeof listRecentContextLogs>>
}

/**
 * Feedback do exercício para UMA tentativa: comando + conteúdo da fase de
 * feedback (stage AI logo após o exercício) + exercício/gabarito + a resposta
 * do aluno e o resultado. O texto vem só do que a escola configurou + IA.
 *
 * O caller persiste o resultado como entrega da célula de feedback
 * (`persistExerciseFeedbackDelivery`), então o Continuar reusa este texto em
 * vez de gerar um segundo feedback.
 */
export async function generateExerciseAttemptFeedback(
  db: Firestore,
  input: {
    student_id: string
    trail_id: string
    /** Célula de feedback (stage AI seguinte ao exercício). */
    stage_number: number
    question_number: number
    attempt: ExerciseAttemptForFeedback
  },
  env: NodeJS.ProcessEnv = process.env,
  generateImpl: typeof generateContentWithGemini = generateContentWithGemini,
  preload?: AttemptFeedbackPreload,
): Promise<{ content: string; model: string; fingerprint: string }> {
  const studentId = input.student_id.trim()
  const trailId = input.trail_id.trim()
  if (!studentId || !trailId) {
    throw new Error('student_id e trail_id são obrigatórios.')
  }
  if (isTrailAiDisabled(env)) {
    throw new Error('Geração IA desligada (TRAIL_AI_DISABLED).')
  }

  const questionsCollection =
    process.env.TRAIL_STAGE_QUESTIONS_COLLECTION ?? 'trail_stage_questions'
  const studentsCollection = process.env.STUDENTS_COLLECTION ?? 'students'
  const exerciseIsPrevStage =
    input.attempt.stage_number === input.stage_number - 1 &&
    input.attempt.question_number === input.question_number

  const readDoc = async (
    collection: string,
    id: string,
    known: DocData | null | undefined,
  ): Promise<DocData | null> => {
    if (known !== undefined) return known
    const snap = await db.collection(collection).doc(id).get()
    return snap.exists ? ((snap.data() ?? {}) as DocData) : null
  }

  // Tudo que não depende de nada roda junto (antes: 4–6 idas em série).
  const [meta, exerciseData, studentData, recent] = await Promise.all([
    loadCellMeta(db, trailId, input.stage_number, input.question_number, {
      stage: preload?.feedbackStage,
      question: preload?.feedbackQuestion,
      ...(exerciseIsPrevStage
        ? {
            prevStage: preload?.exerciseStage,
            prevQuestion: preload?.exerciseQuestion,
          }
        : {}),
    }),
    readDoc(
      questionsCollection,
      trailStageQuestionDocId(
        trailId,
        input.attempt.stage_number,
        input.attempt.question_number,
      ),
      preload?.exerciseQuestion,
    ),
    readDoc(studentsCollection, studentId, preload?.student),
    preload?.recentLogs
      ? Promise.resolve(preload.recentLogs)
      : listRecentContextLogs(db, {
          student_id: studentId,
          trail_id: trailId,
          limit: contextLimit(env),
        }),
  ])
  if (meta.stageType !== 'ai') {
    throw new Error('Célula seguinte ao exercício não é uma fase de IA.')
  }

  const exerciseContent =
    typeof exerciseData?.content === 'string' ? exerciseData.content : ''
  const options = resolveExerciseOptions(exerciseData?.options, exerciseContent)

  let content = meta.enrichedContent
  let subjectSource = meta.subjectSource
  // Sem exercício anterior encontrado pela célula: usa o da própria tentativa.
  if (content === meta.baseContent && exerciseContent.trim()) {
    content = enrichBlocoContent({
      blocoContent: meta.baseContent,
      exerciseContent,
      correctOption:
        typeof exerciseData?.correct_option === 'string'
          ? exerciseData.correct_option
          : null,
      correctLetter: extractCorrectLetterFromText(meta.baseContent),
    })
    subjectSource = exerciseContent
  }
  content = [
    content,
    buildAttemptContentSection({
      student_answer: input.attempt.student_answer,
      is_correct: input.attempt.is_correct,
      options,
    }),
  ]
    .filter((p) => p.trim())
    .join('\n\n')

  const name = typeof studentData?.name === 'string' ? studentData.name : ''
  const school_grade =
    typeof studentData?.school_grade === 'string' ? studentData.school_grade : ''
  const student_level =
    typeof studentData?.student_level === 'number' ||
    typeof studentData?.student_level === 'string'
      ? studentData.student_level
      : 2

  const context = filterContextForBloco(
    formatContextFromLogs(recent, contextLimit(env)),
    {
      stage_number: input.stage_number,
      question_number: input.question_number,
      subjectSource,
    },
  )

  const built = buildTrailAiPrompt({
    name,
    school_grade,
    student_level,
    prompt: meta.prompt,
    content,
    context,
    trail_title: meta.title,
  })

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Timeout na geração do feedback do exercício.')),
      feedbackTimeoutMs(env),
    )
  })
  let gen: { text: string; model: string }
  try {
    gen = await Promise.race([
      generateImpl(
        {
          systemInstruction: built.systemInstruction,
          userText: built.userText,
        },
        env,
      ),
      timeout,
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }

  const formatted = formatAiAnswer(gen.text)
  if (!formatted) {
    throw new Error('Resposta da IA vazia após formatação.')
  }
  if (blocoMismatchesSubject(formatted, subjectSource)) {
    throw new Error(
      'Feedback do exercício incoerente com o exercício (matéria divergente).',
    )
  }
  return { content: formatted, model: gen.model, fingerprint: meta.fingerprint }
}

function logsCollectionName(): string {
  return process.env.CONVERSATION_LOGS_COLLECTION ?? 'conversation_logs'
}
