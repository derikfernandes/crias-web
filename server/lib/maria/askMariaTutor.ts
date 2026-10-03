import type { Firestore } from 'firebase-admin/firestore'

import { createConversationLog } from '../conversationLogService'
import { formatAiAnswer } from '../trail-ai/formatAiAnswer'
import {
  generateContentWithGemini,
  isTrailAiDisabled,
} from '../trail-ai/geminiClient'
import {
  formatContextFromLogs,
  listRecentContextLogs,
} from '../trail-ai'
import { MARIA_TUTORA_SYSTEM_PROMPT } from './mariaTutoraPrompt'

export type MariaTutorInput = {
  student_id: string
  trail_id: string
  message: string
  stage_number?: number
  question_number?: number
}

export type MariaTutorResult = {
  status: 'ok'
  reply: string
  model: string
  stage_number: number
  question_number: number
}

function firstName(raw: string): string {
  const t = String(raw ?? '').trim()
  if (!t) return ''
  return t.split(/\s+/)[0] ?? ''
}

function applyVars(template: string, vars: Record<string, string>): string {
  let out = template
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`\${${key}}`).join(value)
  }
  return out
}

function contextLimit(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.TRAIL_AI_CONTEXT_LIMIT
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n > 0 ? Math.min(50, n) : 20
}

/**
 * Free-text → Maria tutora geral. NÃO avança a trilha.
 */
export async function askMariaTutor(
  db: Firestore,
  input: MariaTutorInput,
  env: NodeJS.ProcessEnv = process.env,
  generateImpl: typeof generateContentWithGemini = generateContentWithGemini,
): Promise<MariaTutorResult> {
  const studentId = input.student_id.trim()
  const trailId = input.trail_id.trim()
  const message = String(input.message ?? '').trim()
  if (!studentId || !trailId || !message) {
    throw new Error('student_id, trail_id e message são obrigatórios.')
  }

  if (isTrailAiDisabled(env)) {
    throw new Error('Geração IA desligada (TRAIL_AI_DISABLED).')
  }

  const studentsCollection = process.env.STUDENTS_COLLECTION ?? 'students'
  const studentTrailsCollection =
    process.env.STUDENT_TRAILS_COLLECTION ?? 'student_trails'
  const logsCollection =
    process.env.CONVERSATION_LOGS_COLLECTION ?? 'conversation_logs'

  const [studentSnap, progressSnap] = await Promise.all([
    db.collection(studentsCollection).doc(studentId).get(),
    db
      .collection(studentTrailsCollection)
      .doc(`${studentId}_${trailId}`)
      .get(),
  ])

  if (!studentSnap.exists) {
    throw new Error('Aluno não encontrado.')
  }

  const studentData = (studentSnap.data() ?? {}) as Record<string, unknown>
  const progressData = (progressSnap.data() ?? {}) as Record<string, unknown>

  const stage_number =
    typeof input.stage_number === 'number' && input.stage_number >= 1
      ? input.stage_number
      : typeof progressData.current_stage_number === 'number'
        ? progressData.current_stage_number
        : 1
  const question_number =
    typeof input.question_number === 'number' && input.question_number >= 1
      ? input.question_number
      : typeof progressData.current_question_number === 'number'
        ? progressData.current_question_number
        : 1

  const name = firstName(
    typeof studentData.name === 'string' ? studentData.name : '',
  )
  const school_grade =
    typeof studentData.school_grade === 'string'
      ? studentData.school_grade
      : ''
  const student_level =
    typeof studentData.student_level === 'number'
      ? String(studentData.student_level)
      : typeof studentData.student_level === 'string'
        ? studentData.student_level
        : '2'
  const institution_id =
    typeof studentData.institution_id === 'string'
      ? studentData.institution_id
      : typeof progressData.institution_id === 'string'
        ? progressData.institution_id
        : null

  const recent = await listRecentContextLogs(db, {
    student_id: studentId,
    trail_id: trailId,
    limit: contextLimit(env),
  })
  const context = formatContextFromLogs(recent, contextLimit(env))

  const systemInstruction = applyVars(MARIA_TUTORA_SYSTEM_PROMPT, {
    NAME: name,
    SCHOOL_GRADE: school_grade,
    STUDENT_LEVEL: student_level,
    CONTEXT: context || '(sem histórico recente)',
  })

  const userText = [
    `NAME: ${name || '(vazio)'}`,
    `SCHOOL_GRADE: ${school_grade || '(vazio)'}`,
    `STUDENT_LEVEL: ${student_level}`,
    'CONTEXT (conversas recentes):',
    context || '(sem histórico recente)',
    'Mensagem do estudante:',
    message,
  ].join('\n\n')

  await createConversationLog(db, logsCollection, {
    student_id: studentId,
    trail_id: trailId,
    stage_number,
    question_number,
    sender: 'student',
    message_text: message,
    institution_id,
    message_type: 'text',
    metadata: { source: 'maria-tutor', channel: 'app' },
  })

  const gen = await generateImpl(
    { systemInstruction, userText },
    env,
  )
  const reply = formatAiAnswer(gen.text)
  if (!reply) {
    throw new Error('Resposta da Maria vazia.')
  }

  await createConversationLog(db, logsCollection, {
    student_id: studentId,
    trail_id: trailId,
    stage_number,
    question_number,
    sender: 'system',
    message_text: reply,
    institution_id,
    message_type: 'text',
    metadata: {
      source: 'maria-tutor',
      model: gen.model,
      channel: 'app',
    },
  })

  return {
    status: 'ok',
    reply,
    model: gen.model,
    stage_number,
    question_number,
  }
}
