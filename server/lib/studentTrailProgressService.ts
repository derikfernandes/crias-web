import type { Firestore } from 'firebase-admin/firestore'
import { FieldValue } from 'firebase-admin/firestore'

import {
  completeStudentTrail,
  getStudentTrailByComposite,
  getStudentTrailPosition,
  studentTrailDocId,
  type StudentTrailRuntimePosition,
} from './studentTrailService'
import type { StudentTrailStatus } from './studentTrailValidation'
import { trailStageQuestionDocId } from './trailStageQuestionService'
import {
  resolveExerciseOptions,
  stripLetteredChoicesFromContent,
} from './exerciseOptions'

export type StageType = 'ai' | 'fixed' | 'exercise'

export type ProgressErrorCode =
  | 'not_found'
  | 'inactive_student'
  | 'inactive_institution'
  | 'inactive_trail'
  | 'blocked'
  | 'completed'
  | 'invalid_payload'
  | 'invalid_credentials'
  | 'password_not_set'
  | 'internal_error'

export type ProgressResult<T> =
  | { ok: true; data: T; background?: Promise<void> }
  | { ok: false; code: ProgressErrorCode; message: string; httpStatus: number }

export type NextContentOk = {
  status: 'ok'
  student_id: string
  trail_id: string
  stage_number: number
  question_number: number
  stage_type: StageType
  stage_title: string | null
  prompt: string | null
  content: string | null
  options: unknown[] | null
  explanation: string | null
  is_released: true
  next_action: 'deliver_content'
}

export type NextContentStatusBody = {
  status: 'blocked' | 'completed' | 'not_found' | 'inactive_student' | 'inactive_trail'
  student_id?: string
  trail_id?: string
  stage_number?: number
  question_number?: number
  message?: string
}

export type AdvanceOk = {
  status: 'ok'
  next_stage_number: number
  next_question_number: number
  completed: boolean
}

export type IdentifyOk = {
  status: 'ok'
  student_id: string
  institution_id: string
  name: string
  active: true
  phone_number: string
}

/** Pure grade logic — aligned with specs/tests.yaml trail_progression. */
export function computeNextPosition(input: {
  current_stage_number: number
  current_question_number: number
  total_stages: number
  total_questions: number
}): {
  next_stage_number: number
  next_question_number: number
  completed: boolean
} {
  const {
    current_stage_number,
    current_question_number,
    total_stages,
    total_questions,
  } = input

  if (current_stage_number < total_stages) {
    return {
      next_stage_number: current_stage_number + 1,
      next_question_number: current_question_number,
      completed: false,
    }
  }

  // At last stage: bump question and reset stage, or complete.
  if (current_question_number >= total_questions) {
    return {
      next_stage_number: current_stage_number,
      next_question_number: current_question_number,
      completed: true,
    }
  }

  return {
    next_stage_number: 1,
    next_question_number: current_question_number + 1,
    completed: false,
  }
}

/** Pure release gate for next-content — aligned with specs/tests.yaml student_player. */
export function evaluateContentAvailability(input: {
  is_released: boolean
  active_stage?: boolean
  active_question?: boolean
}): 'ok' | 'blocked' {
  if (
    !input.is_released ||
    input.active_stage === false ||
    input.active_question === false
  ) {
    return 'blocked'
  }
  return 'ok'
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function asStageType(v: unknown): StageType {
  if (v === 'ai' || v === 'fixed' || v === 'exercise') return v
  return 'fixed'
}

function stageDocId(trailId: string, stageNumber: number): string {
  return `${trailId}_stage_${stageNumber}`
}

export async function identifyStudent(
  db: Firestore,
  input: {
    phone_number: string
    institution_code: string
    password: string
  },
): Promise<ProgressResult<IdentifyOk>> {
  const phone = input.phone_number.replace(/\D/g, '')
  const institutionCode = input.institution_code.trim()
  const password = typeof input.password === 'string' ? input.password : ''
  if (!phone || !institutionCode || !password.trim()) {
    return {
      ok: false,
      code: 'invalid_payload',
      message:
        'phone_number, institution_code e password são obrigatórios.',
      httpStatus: 400,
    }
  }

  const institutionsCollection =
    process.env.INSTITUTIONS_COLLECTION ?? 'institutions'
  const studentsCollection = process.env.STUDENTS_COLLECTION ?? 'students'

  const instSnap = await db
    .collection(institutionsCollection)
    .doc(institutionCode)
    .get()
  if (!instSnap.exists) {
    return {
      ok: false,
      code: 'not_found',
      message: 'Instituição não encontrada.',
      httpStatus: 404,
    }
  }
  const instData = (instSnap.data() ?? {}) as Record<string, unknown>
  if (asBool(instData.active, true) === false) {
    return {
      ok: false,
      code: 'inactive_institution',
      message: 'Instituição inativa.',
      httpStatus: 403,
    }
  }

  const snap = await db
    .collection(studentsCollection)
    .where('phone_number', '==', phone)
    .where('institution_id', '==', institutionCode)
    .limit(1)
    .get()

  if (snap.empty) {
    return {
      ok: false,
      code: 'not_found',
      message: 'Aluno não encontrado para telefone e instituição informados.',
      httpStatus: 404,
    }
  }

  const doc = snap.docs[0]
  const data = (doc.data() ?? {}) as Record<string, unknown>
  if (asBool(data.active, true) === false) {
    return {
      ok: false,
      code: 'inactive_student',
      message: 'Aluno inativo.',
      httpStatus: 403,
    }
  }

  const { verifyStudentPassword } = await import('./studentPassword.js')
  const passwordHash =
    typeof data.password_hash === 'string' ? data.password_hash : null
  if (!passwordHash) {
    return {
      ok: false,
      code: 'password_not_set',
      message:
        'Senha ainda não definida. Peça à instituição para configurar sua senha de acesso.',
      httpStatus: 403,
    }
  }
  if (!verifyStudentPassword(password, passwordHash)) {
    return {
      ok: false,
      code: 'invalid_credentials',
      message: 'Telefone, instituição ou senha incorretos.',
      httpStatus: 401,
    }
  }

  return {
    ok: true,
    data: {
      status: 'ok',
      student_id: doc.id,
      institution_id: institutionCode,
      name: typeof data.name === 'string' ? data.name : '',
      active: true,
      phone_number: phone,
    },
  }
}

export async function listStudentTrailsForStudent(
  db: Firestore,
  studentId: string,
): Promise<
  ProgressResult<
    Array<{
      id: string
      student_id: string
      institution_id: string
      trail_id: string
      current_stage_number: number
      current_question_number: number
      status: StudentTrailStatus
    }>
  >
> {
  const collection = process.env.STUDENT_TRAILS_COLLECTION ?? 'student_trails'
  const snap = await db
    .collection(collection)
    .where('student_id', '==', studentId)
    .get()

  const rows = snap.docs.map((d) => {
    const data = (d.data() ?? {}) as Record<string, unknown>
    const statusRaw =
      typeof data.status === 'string' ? data.status : 'not_started'
    const status: StudentTrailStatus =
      statusRaw === 'in_progress' ||
      statusRaw === 'completed' ||
      statusRaw === 'blocked'
        ? statusRaw
        : 'not_started'
    return {
      id: d.id,
      student_id:
        typeof data.student_id === 'string' ? data.student_id : studentId,
      institution_id:
        typeof data.institution_id === 'string' ? data.institution_id : '',
      trail_id: typeof data.trail_id === 'string' ? data.trail_id : '',
      current_stage_number:
        typeof data.current_stage_number === 'number' &&
        Number.isFinite(data.current_stage_number)
          ? data.current_stage_number
          : 1,
      current_question_number:
        typeof data.current_question_number === 'number' &&
        Number.isFinite(data.current_question_number)
          ? data.current_question_number
          : 1,
      status,
    }
  })

  return { ok: true, data: rows }
}

async function loadTrailCounts(
  db: Firestore,
  trailId: string,
): Promise<{ totalStages: number; maxQuestion: number }> {
  const stagesCollection = process.env.TRAIL_STAGES_COLLECTION ?? 'trail_stages'
  const questionsCollection =
    process.env.TRAIL_STAGE_QUESTIONS_COLLECTION ?? 'trail_stage_questions'

  const [stagesSnap, questionsSnap] = await Promise.all([
    db.collection(stagesCollection).where('trail_id', '==', trailId).get(),
    db.collection(questionsCollection).where('trail_id', '==', trailId).get(),
  ])

  let totalStages = 0
  for (const d of stagesSnap.docs) {
    const n = (d.data() as Record<string, unknown>).stage_number
    if (typeof n === 'number' && Number.isFinite(n) && n > totalStages) {
      totalStages = n
    }
  }

  let maxQuestion = 0
  for (const d of questionsSnap.docs) {
    const n = (d.data() as Record<string, unknown>).question_number
    if (typeof n === 'number' && Number.isFinite(n) && n > maxQuestion) {
      maxQuestion = n
    }
  }

  return { totalStages, maxQuestion }
}

export async function getNextContent(
  db: Firestore,
  studentId: string,
  trailId: string,
): Promise<ProgressResult<NextContentOk | NextContentStatusBody>> {
  const studentsCollection = process.env.STUDENTS_COLLECTION ?? 'students'
  const trailsCollection = process.env.TRAILS_COLLECTION ?? 'trails'
  const stagesCollection = process.env.TRAIL_STAGES_COLLECTION ?? 'trail_stages'
  const questionsCollection =
    process.env.TRAIL_STAGE_QUESTIONS_COLLECTION ?? 'trail_stage_questions'
  const studentTrailsCollection =
    process.env.STUDENT_TRAILS_COLLECTION ?? 'student_trails'

  const [studentSnap, trailSnap, pos] = await Promise.all([
    db.collection(studentsCollection).doc(studentId).get(),
    db.collection(trailsCollection).doc(trailId).get(),
    getStudentTrailPosition(db, studentTrailsCollection, studentId, trailId),
  ])

  if (!studentSnap.exists) {
    return {
      ok: false,
      code: 'not_found',
      message: 'Aluno não encontrado.',
      httpStatus: 404,
    }
  }
  const studentData = (studentSnap.data() ?? {}) as Record<string, unknown>
  if (asBool(studentData.active, true) === false) {
    return {
      ok: true,
      data: {
        status: 'inactive_student',
        student_id: studentId,
        trail_id: trailId,
        message: 'Aluno inativo.',
      },
    }
  }

  if (!trailSnap.exists) {
    return {
      ok: false,
      code: 'not_found',
      message: 'Trilha não encontrada.',
      httpStatus: 404,
    }
  }
  const trailData = (trailSnap.data() ?? {}) as Record<string, unknown>
  if (asBool(trailData.active, true) === false) {
    return {
      ok: true,
      data: {
        status: 'inactive_trail',
        student_id: studentId,
        trail_id: trailId,
        message: 'Trilha inativa.',
      },
    }
  }

  if (!pos) {
    return {
      ok: false,
      code: 'not_found',
      message: 'Vínculo aluno/trilha não encontrado.',
      httpStatus: 404,
    }
  }

  if (pos.status === 'completed') {
    return {
      ok: true,
      data: {
        status: 'completed',
        student_id: studentId,
        trail_id: trailId,
        stage_number: pos.current_stage_number,
        question_number: pos.current_question_number,
        message: 'Trilha concluída.',
      },
    }
  }

  if (pos.status === 'blocked') {
    return {
      ok: true,
      data: {
        status: 'blocked',
        student_id: studentId,
        trail_id: trailId,
        stage_number: pos.current_stage_number,
        question_number: pos.current_question_number,
        message: 'Progresso bloqueado.',
      },
    }
  }

  const stageId = stageDocId(trailId, pos.current_stage_number)
  const questionId = trailStageQuestionDocId(
    trailId,
    pos.current_stage_number,
    pos.current_question_number,
  )

  const [stageSnap, questionSnap] = await Promise.all([
    db.collection(stagesCollection).doc(stageId).get(),
    db.collection(questionsCollection).doc(questionId).get(),
  ])

  if (!stageSnap.exists || !questionSnap.exists) {
    return {
      ok: true,
      data: {
        status: 'completed',
        student_id: studentId,
        trail_id: trailId,
        stage_number: pos.current_stage_number,
        question_number: pos.current_question_number,
        message: 'Não há próximo conteúdo.',
      },
    }
  }

  const stageData = (stageSnap.data() ?? {}) as Record<string, unknown>
  const questionData = (questionSnap.data() ?? {}) as Record<string, unknown>

  // Liberation is per aula (trail_stage_questions.is_released). Stages stay
  // structural (often is_released=false) and must not block released content.
  const questionReleased = asBool(questionData.is_released, false)
  const stageActive = asBool(stageData.active, true)
  const questionActive = asBool(questionData.active, true)

  const availability = evaluateContentAvailability({
    is_released: questionReleased,
    active_stage: stageActive,
    active_question: questionActive,
  })

  if (availability === 'blocked') {
    return {
      ok: true,
      data: {
        status: 'blocked',
        student_id: studentId,
        trail_id: trailId,
        stage_number: pos.current_stage_number,
        question_number: pos.current_question_number,
        message: 'Conteúdo ainda não liberado.',
      },
    }
  }

  const stageType = asStageType(stageData.stage_type)
  const prompt =
    stageType === 'ai' && typeof stageData.prompt === 'string'
      ? stageData.prompt
      : null
  let content =
    typeof questionData.content === 'string' ? questionData.content : null
  const explanation =
    typeof questionData.explanation === 'string'
      ? questionData.explanation
      : null
  const stageTitle =
    typeof stageData.title === 'string' ? stageData.title : null

  // stage_type=ai → gera/recupera conteúdo via Gemini (Vertex gemini-3.7-flash).
  if (stageType === 'ai') {
    try {
      const { ensureTrailAiContent } = await import(
        './trail-ai/ensureTrailAiContent.js'
      )
      const ensured = await ensureTrailAiContent(db, {
        student_id: studentId,
        trail_id: trailId,
        stage_number: pos.current_stage_number,
        question_number: pos.current_question_number,
      })
      content = ensured.content
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Falha ao gerar conteúdo de IA.'
      return {
        ok: false,
        code: 'internal_error',
        message: msg,
        httpStatus: 500,
      }
    }
  }

  // Exercise: options do doc, ou parse A/B/C/(A) do content quando Firestore vem null.
  const options =
    stageType === 'exercise'
      ? resolveExerciseOptions(questionData.options, content)
      : Array.isArray(questionData.options)
        ? (questionData.options as unknown[])
        : null

  // Com botões clicáveis, não deixar as opções só como texto estático no content.
  if (stageType === 'exercise' && options && options.length > 0) {
    content = stripLetteredChoicesFromContent(content) ?? content
  }

  // Prefetch da próxima célula AI — caller deve waitUntil(background) no Vercel.
  const background = schedulePrefetchNextAiStage(db, {
    student_id: studentId,
    trail_id: trailId,
    current_stage_number: pos.current_stage_number,
    current_question_number: pos.current_question_number,
  })

  return {
    ok: true,
    data: {
      status: 'ok',
      student_id: studentId,
      trail_id: trailId,
      stage_number: pos.current_stage_number,
      question_number: pos.current_question_number,
      stage_type: stageType,
      stage_title: stageTitle,
      prompt,
      content,
      options,
      explanation,
      is_released: true,
      next_action: 'deliver_content',
    },
    background,
  }
}

/**
 * Gate de avanço: checa liberação/ativo da célula atual SEM chamar ensure-ai/Gemini.
 * (Antes advance → getNextContent regenerava IA a cada Continuar.)
 */
export async function getAdvanceGate(
  db: Firestore,
  studentId: string,
  trailId: string,
): Promise<ProgressResult<NextContentOk | NextContentStatusBody>> {
  const studentsCollection = process.env.STUDENTS_COLLECTION ?? 'students'
  const trailsCollection = process.env.TRAILS_COLLECTION ?? 'trails'
  const stagesCollection = process.env.TRAIL_STAGES_COLLECTION ?? 'trail_stages'
  const questionsCollection =
    process.env.TRAIL_STAGE_QUESTIONS_COLLECTION ?? 'trail_stage_questions'
  const studentTrailsCollection =
    process.env.STUDENT_TRAILS_COLLECTION ?? 'student_trails'

  const [studentSnap, trailSnap, pos] = await Promise.all([
    db.collection(studentsCollection).doc(studentId).get(),
    db.collection(trailsCollection).doc(trailId).get(),
    getStudentTrailPosition(db, studentTrailsCollection, studentId, trailId),
  ])

  if (!studentSnap.exists) {
    return {
      ok: false,
      code: 'not_found',
      message: 'Aluno não encontrado.',
      httpStatus: 404,
    }
  }
  const studentData = (studentSnap.data() ?? {}) as Record<string, unknown>
  if (asBool(studentData.active, true) === false) {
    return {
      ok: true,
      data: {
        status: 'inactive_student',
        student_id: studentId,
        trail_id: trailId,
        message: 'Aluno inativo.',
      },
    }
  }

  if (!trailSnap.exists) {
    return {
      ok: false,
      code: 'not_found',
      message: 'Trilha não encontrada.',
      httpStatus: 404,
    }
  }
  const trailData = (trailSnap.data() ?? {}) as Record<string, unknown>
  if (asBool(trailData.active, true) === false) {
    return {
      ok: true,
      data: {
        status: 'inactive_trail',
        student_id: studentId,
        trail_id: trailId,
        message: 'Trilha inativa.',
      },
    }
  }

  if (!pos) {
    return {
      ok: false,
      code: 'not_found',
      message: 'Vínculo aluno/trilha não encontrado.',
      httpStatus: 404,
    }
  }

  if (pos.status === 'completed') {
    return {
      ok: true,
      data: {
        status: 'completed',
        student_id: studentId,
        trail_id: trailId,
        stage_number: pos.current_stage_number,
        question_number: pos.current_question_number,
        message: 'Trilha concluída.',
      },
    }
  }

  if (pos.status === 'blocked') {
    return {
      ok: true,
      data: {
        status: 'blocked',
        student_id: studentId,
        trail_id: trailId,
        stage_number: pos.current_stage_number,
        question_number: pos.current_question_number,
        message: 'Progresso bloqueado.',
      },
    }
  }

  const stageId = stageDocId(trailId, pos.current_stage_number)
  const questionId = trailStageQuestionDocId(
    trailId,
    pos.current_stage_number,
    pos.current_question_number,
  )

  const [stageSnap, questionSnap] = await Promise.all([
    db.collection(stagesCollection).doc(stageId).get(),
    db.collection(questionsCollection).doc(questionId).get(),
  ])

  if (!stageSnap.exists || !questionSnap.exists) {
    return {
      ok: true,
      data: {
        status: 'completed',
        student_id: studentId,
        trail_id: trailId,
        stage_number: pos.current_stage_number,
        question_number: pos.current_question_number,
        message: 'Não há próximo conteúdo.',
      },
    }
  }

  const stageData = (stageSnap.data() ?? {}) as Record<string, unknown>
  const questionData = (questionSnap.data() ?? {}) as Record<string, unknown>
  const questionReleased = asBool(questionData.is_released, false)
  const stageActive = asBool(stageData.active, true)
  const questionActive = asBool(questionData.active, true)

  const availability = evaluateContentAvailability({
    is_released: questionReleased,
    active_stage: stageActive,
    active_question: questionActive,
  })

  if (availability === 'blocked') {
    return {
      ok: true,
      data: {
        status: 'blocked',
        student_id: studentId,
        trail_id: trailId,
        stage_number: pos.current_stage_number,
        question_number: pos.current_question_number,
        message: 'Conteúdo ainda não liberado.',
      },
    }
  }

  // Payload mínimo — advance só precisa do status ok (sem Gemini).
  return {
    ok: true,
    data: {
      status: 'ok',
      student_id: studentId,
      trail_id: trailId,
      stage_number: pos.current_stage_number,
      question_number: pos.current_question_number,
      stage_type: asStageType(stageData.stage_type),
      stage_title: null,
      prompt: null,
      content: null,
      options: null,
      explanation: null,
      is_released: true,
      next_action: 'deliver_content',
    },
  }
}

/**
 * Prefetch best-effort: gera a próxima célula AI se ainda não houver delivery.
 * Retorna a Promise para o caller agendar com waitUntil (Vercel serverless
 * mata fire-and-forget após o response).
 */
export function schedulePrefetchNextAiStage(
  db: Firestore,
  input: {
    student_id: string
    trail_id: string
    current_stage_number: number
    current_question_number: number
  },
): Promise<void> {
  return (async () => {
    try {
      const { totalStages, maxQuestion } = await loadTrailCounts(
        db,
        input.trail_id,
      )
      if (totalStages < 1 || maxQuestion < 1) return
      const next = computeNextPosition({
        current_stage_number: input.current_stage_number,
        current_question_number: input.current_question_number,
        total_stages: totalStages,
        total_questions: maxQuestion,
      })
      if (next.completed) return

      const stagesCollection =
        process.env.TRAIL_STAGES_COLLECTION ?? 'trail_stages'
      const questionsCollection =
        process.env.TRAIL_STAGE_QUESTIONS_COLLECTION ?? 'trail_stage_questions'
      const [stageSnap, questionSnap] = await Promise.all([
        db
          .collection(stagesCollection)
          .doc(stageDocId(input.trail_id, next.next_stage_number))
          .get(),
        db
          .collection(questionsCollection)
          .doc(
            trailStageQuestionDocId(
              input.trail_id,
              next.next_stage_number,
              next.next_question_number,
            ),
          )
          .get(),
      ])
      if (!stageSnap.exists || !questionSnap.exists) return
      const stageData = (stageSnap.data() ?? {}) as Record<string, unknown>
      const questionData = (questionSnap.data() ?? {}) as Record<string, unknown>
      if (asStageType(stageData.stage_type) !== 'ai') return
      if (
        evaluateContentAvailability({
          is_released: asBool(questionData.is_released, false),
          active_stage: asBool(stageData.active, true),
          active_question: asBool(questionData.active, true),
        }) === 'blocked'
      ) {
        return
      }

      const { ensureTrailAiContent } = await import(
        './trail-ai/ensureTrailAiContent.js'
      )
      await ensureTrailAiContent(db, {
        student_id: input.student_id,
        trail_id: input.trail_id,
        stage_number: next.next_stage_number,
        question_number: next.next_question_number,
      })
    } catch {
      // Prefetch nunca deve falhar o next-content.
    }
  })()
}

export async function advanceStudentTrailProgress(
  db: Firestore,
  studentId: string,
  trailId: string,
): Promise<ProgressResult<AdvanceOk | NextContentStatusBody>> {
  const studentTrailsCollection =
    process.env.STUDENT_TRAILS_COLLECTION ?? 'student_trails'
  const trailsCollection = process.env.TRAILS_COLLECTION ?? 'trails'
  const studentsCollection = process.env.STUDENTS_COLLECTION ?? 'students'

  const [studentSnap, trailSnap, currentSnap] = await Promise.all([
    db.collection(studentsCollection).doc(studentId).get(),
    db.collection(trailsCollection).doc(trailId).get(),
    getStudentTrailByComposite(
      db,
      studentTrailsCollection,
      studentId,
      trailId,
    ),
  ])

  if (!studentSnap.exists || !trailSnap.exists || !currentSnap.exists) {
    return {
      ok: false,
      code: 'not_found',
      message: 'Aluno, trilha ou vínculo não encontrado.',
      httpStatus: 404,
    }
  }

  const studentData = (studentSnap.data() ?? {}) as Record<string, unknown>
  if (asBool(studentData.active, true) === false) {
    return {
      ok: true,
      data: {
        status: 'inactive_student',
        student_id: studentId,
        trail_id: trailId,
      },
    }
  }

  const trailData = (trailSnap.data() ?? {}) as Record<string, unknown>
  if (asBool(trailData.active, true) === false) {
    return {
      ok: true,
      data: {
        status: 'inactive_trail',
        student_id: studentId,
        trail_id: trailId,
      },
    }
  }

  const data = (currentSnap.data() ?? {}) as Record<string, unknown>
  const statusRaw =
    typeof data.status === 'string' ? data.status : 'not_started'
  if (statusRaw === 'completed') {
    return {
      ok: true,
      data: {
        status: 'completed',
        student_id: studentId,
        trail_id: trailId,
        message: 'Trilha já concluída.',
      },
    }
  }
  if (statusRaw === 'blocked') {
    return {
      ok: true,
      data: {
        status: 'blocked',
        student_id: studentId,
        trail_id: trailId,
        message: 'Progresso bloqueado.',
      },
    }
  }

  // Current cell must be released before advancing past it.
  // Usa gate leve (sem ensure-ai) — evita Gemini a cada Continuar.
  const gate = await getAdvanceGate(db, studentId, trailId)
  if (gate.ok && gate.data.status === 'blocked') {
    return { ok: true, data: gate.data }
  }
  if (gate.ok && gate.data.status !== 'ok') {
    return { ok: true, data: gate.data as NextContentStatusBody }
  }
  if (!gate.ok) {
    return gate as ProgressResult<AdvanceOk | NextContentStatusBody>
  }

  const currentStage =
    typeof data.current_stage_number === 'number' &&
    Number.isFinite(data.current_stage_number)
      ? data.current_stage_number
      : 1
  const currentQuestion =
    typeof data.current_question_number === 'number' &&
    Number.isFinite(data.current_question_number)
      ? data.current_question_number
      : 1

  const { totalStages, maxQuestion } = await loadTrailCounts(db, trailId)
  if (totalStages < 1 || maxQuestion < 1) {
    return {
      ok: true,
      data: {
        status: 'completed',
        student_id: studentId,
        trail_id: trailId,
        message: 'Trilha sem conteúdo configurado.',
      },
    }
  }

  const next = computeNextPosition({
    current_stage_number: currentStage,
    current_question_number: currentQuestion,
    total_stages: totalStages,
    total_questions: maxQuestion,
  })

  if (next.completed) {
    await completeStudentTrail(
      db,
      studentTrailsCollection,
      studentId,
      trailId,
    )
    return {
      ok: true,
      data: {
        status: 'ok',
        next_stage_number: currentStage,
        next_question_number: currentQuestion,
        completed: true,
      },
    }
  }

  // Destination must exist; if missing → completed.
  const destStageId = stageDocId(trailId, next.next_stage_number)
  const destQuestionId = trailStageQuestionDocId(
    trailId,
    next.next_stage_number,
    next.next_question_number,
  )
  const stagesCollection = process.env.TRAIL_STAGES_COLLECTION ?? 'trail_stages'
  const questionsCollection =
    process.env.TRAIL_STAGE_QUESTIONS_COLLECTION ?? 'trail_stage_questions'

  const [destStage, destQuestion] = await Promise.all([
    db.collection(stagesCollection).doc(destStageId).get(),
    db.collection(questionsCollection).doc(destQuestionId).get(),
  ])

  if (!destStage.exists || !destQuestion.exists) {
    await completeStudentTrail(
      db,
      studentTrailsCollection,
      studentId,
      trailId,
    )
    return {
      ok: true,
      data: {
        status: 'ok',
        next_stage_number: next.next_stage_number,
        next_question_number: next.next_question_number,
        completed: true,
      },
    }
  }

  const id = studentTrailDocId(studentId, trailId)
  const now = FieldValue.serverTimestamp()
  const patch: Record<string, unknown> = {
    current_stage_number: next.next_stage_number,
    current_question_number: next.next_question_number,
    status: 'in_progress',
    last_interaction_at: now,
    updated_at: now,
  }
  if (!data.started_at) {
    patch.started_at = now
  }

  await db.collection(studentTrailsCollection).doc(id).update(patch)

  // Se o destino é AI, aquece/garante o conteúdo ANTES de responder o Continuar.
  // Com cache hit (prefetch ou delivery prévia) fica ~O(1); senão gera uma vez aqui
  // e o next-content seguinte não chama Gemini de novo.
  const destStageData = (destStage.data() ?? {}) as Record<string, unknown>
  const destQuestionData = (destQuestion.data() ?? {}) as Record<string, unknown>
  let background: Promise<void> | undefined
  if (
    asStageType(destStageData.stage_type) === 'ai' &&
    evaluateContentAvailability({
      is_released: asBool(destQuestionData.is_released, false),
      active_stage: asBool(destStageData.active, true),
      active_question: asBool(destQuestionData.active, true),
    }) === 'ok'
  ) {
    try {
      const { ensureTrailAiContent } = await import(
        './trail-ai/ensureTrailAiContent.js'
      )
      await ensureTrailAiContent(db, {
        student_id: studentId,
        trail_id: trailId,
        stage_number: next.next_stage_number,
        question_number: next.next_question_number,
      })
    } catch {
      // Não bloqueia o avanço se a geração falhar — next-content tenta de novo.
    }
    // Já no destino AI: prefetch da célula *seguinte* enquanto o aluno lê.
    background = schedulePrefetchNextAiStage(db, {
      student_id: studentId,
      trail_id: trailId,
      current_stage_number: next.next_stage_number,
      current_question_number: next.next_question_number,
    })
  } else {
    // Prefetch da célula seguinte (após o destino) em background best-effort.
    background = schedulePrefetchNextAiStage(db, {
      student_id: studentId,
      trail_id: trailId,
      current_stage_number: next.next_stage_number,
      current_question_number: next.next_question_number,
    })
  }

  return {
    ok: true,
    data: {
      status: 'ok',
      next_stage_number: next.next_stage_number,
      next_question_number: next.next_question_number,
      completed: false,
    },
    background,
  }
}

export async function getStudentTrailStatus(
  db: Firestore,
  studentId: string,
  trailId: string,
): Promise<ProgressResult<StudentTrailRuntimePosition>> {
  const collection = process.env.STUDENT_TRAILS_COLLECTION ?? 'student_trails'
  const pos = await getStudentTrailPosition(db, collection, studentId, trailId)
  if (!pos) {
    return {
      ok: false,
      code: 'not_found',
      message: 'Progresso não encontrado.',
      httpStatus: 404,
    }
  }
  return { ok: true, data: pos }
}
