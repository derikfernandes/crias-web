/**
 * Cliente HTTP da fachada do Trail Engine (channel=app).
 * Sem Firestore Client — AuthZ via Bearer sessão aluno.
 * Sempre envia Idempotency-Key; trata 409 conflict + replay (Ciclo 1 FE).
 */

import { phoneForLogin } from './phoneNormalize'
import {
  clearTrilhaSession,
  loadTrilhaSession,
  type TrilhaSession,
  type TrilhaStudent,
} from './trilhaSession'

function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim()
  if (raw) return raw.replace(/\/+$/, '')
  return window.location.origin
}

/**
 * Facades conhecidas (server allowlist RT-C1). O client NÃO lê `facade`
 * da URL do browser — só estes literais hardcoded.
 */
export const TRILHA_KNOWN_FACADES = [
  'home',
  'next-content',
  'status',
  'advance',
  'submit-exercise',
  'history',
  'conversation',
  'ensure-ai',
  'ensure-delivery',
] as const

export type TrilhaKnownFacade = (typeof TRILHA_KNOWN_FACADES)[number]

function facadeQuery(facade: TrilhaKnownFacade): URLSearchParams {
  const params = new URLSearchParams()
  params.set('facade', facade)
  return params
}

export class TrilhaApiError extends Error {
  status: number
  code: string
  /** Snapshot opcional em 409 (motor pode devolver posição). */
  snapshot: Record<string, unknown> | null

  constructor(
    message: string,
    status: number,
    code = 'error',
    snapshot: Record<string, unknown> | null = null,
  ) {
    super(message)
    this.name = 'TrilhaApiError'
    this.status = status
    this.code = code
    this.snapshot = snapshot
  }

  get isConflict(): boolean {
    return this.status === 409 || this.code === 'conflict'
  }
}

async function parseError(res: Response): Promise<TrilhaApiError> {
  let message = `Erro HTTP ${res.status}`
  let code = res.status === 409 ? 'conflict' : 'error'
  let snapshot: Record<string, unknown> | null = null
  try {
    const body = (await res.json()) as {
      error?: unknown
      code?: unknown
      message?: unknown
      snapshot?: unknown
      current_stage_number?: unknown
      current_question_number?: unknown
      progress_version?: unknown
    }
    if (typeof body?.error === 'string' && body.error.trim()) {
      message = body.error
    } else if (typeof body?.message === 'string' && body.message.trim()) {
      message = body.message
    }
    if (typeof body?.code === 'string' && body.code.trim()) {
      code = body.code
    }
    if (body?.snapshot && typeof body.snapshot === 'object') {
      snapshot = body.snapshot as Record<string, unknown>
    } else if (
      body.current_stage_number !== undefined ||
      body.progress_version !== undefined
    ) {
      snapshot = {
        current_stage_number: body.current_stage_number,
        current_question_number: body.current_question_number,
        progress_version: body.progress_version,
      }
    }
  } catch {
    // keep defaults
  }
  return new TrilhaApiError(message, res.status, code, snapshot)
}

function authHeaders(token?: string | null): HeadersInit {
  const session = token ? null : loadTrilhaSession()
  const bearer = token ?? session?.token
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (bearer) headers.Authorization = `Bearer ${bearer}`
  return headers
}

export type TrilhaHomeEnrollmentCard = {
  enrollment: {
    student_id: string
    trail_id: string
    institution_id: string
    current_stage_number: number
    current_question_number: number
    progress_status: string
    progress_version: number
    last_channel: string | null
    last_interaction_at?: string | null
  }
  trail: {
    id: string
    title: string
    subject?: string | null
    institution_id?: string | null
    institution_name?: string | null
  }
  next_action?:
    | 'deliver_content'
    | 'await_answer'
    | 'await_release'
    | 'blocked'
    | 'completed'
  is_released?: boolean
  stage_type?: 'fixed' | 'exercise' | 'ai' | null
  progress_ratio?: number | null
  total_stages?: number | null
  total_questions?: number | null
  stages_completed?: number | null
}

export type TrilhaHomeResponse = {
  status: 'ok'
  student_id: string
  enrollment: {
    student_id: string
    trail_id: string
    institution_id: string
    current_stage_number: number
    current_question_number: number
    progress_status: string
    progress_version: number
    last_channel: string | null
  } | null
  trail: { id: string; title: string } | null
  next_action?:
    | 'deliver_content'
    | 'await_answer'
    | 'await_release'
    | 'blocked'
    | 'completed'
  is_released?: boolean
  stage_type?: 'fixed' | 'exercise' | 'ai' | null
  progress_ratio?: number | null
  total_stages?: number | null
  total_questions?: number | null
  /** Todas as matrículas do aluno (student_trails). */
  enrollments?: TrilhaHomeEnrollmentCard[]
}

export type TrilhaNextContent = {
  status: string
  student_id: string
  trail_id: string
  stage_number: number
  question_number: number
  stage_type: 'fixed' | 'exercise' | 'ai' | null
  prompt: string | null
  content: string | null
  content_source?: 'persisted_delivery' | 'curriculum' | 'none'
  options: unknown
  explanation: string | null
  is_released: boolean
  next_action:
    | 'deliver_content'
    | 'await_answer'
    | 'await_release'
    | 'blocked'
    | 'completed'
  progress_version: number
  title: string | null
  /**
   * Stage ai: ready = log WA/app; pending = falta delivery.
   * POST ensure-ai só no CTA Continuar do player — nunca no GET/open/resume.
   */
  ai_status?: 'ready' | 'pending' | 'not_applicable'
}

export type TrilhaAdvanceResult = {
  status: string
  replay: boolean
  next_stage_number: number
  next_question_number: number
  completed: boolean
  progress_version: number
}

export type TrilhaHistoryItem = {
  stage_number: number
  question_number: number
  stage_type: 'fixed' | 'exercise' | 'ai' | null
  title: string | null
  content: string | null
  prompt: string | null
  options: unknown
  student_answer: string | null
  is_correct: boolean | null
  attempted_at: string | null
}

export type TrilhaHistoryResponse = {
  status: 'ok'
  student_id: string
  trail_id: string
  current_stage_number: number
  current_question_number: number
  progress_status: string
  items: TrilhaHistoryItem[]
}

/** Mensagem de conversation_logs (SoT do chat aluno). */
export type TrilhaConversationMessage = {
  id: string
  student_id: string
  trail_id: string
  stage_number: number
  question_number: number
  sender: 'system' | 'student'
  message_text: string
  message_type: 'text' | 'instruction' | 'exercise' | 'feedback' | null
  institution_id: string | null
  created_at: string | null
  created_at_brasilia: string | null
  metadata: Record<string, unknown> | null
}

export type TrilhaConversationResponse = {
  status: 'ok'
  student_id: string
  trail_id: string
  current_stage_number: number
  current_question_number: number
  progress_status: string
  messages: TrilhaConversationMessage[]
}

/** Resultado tipado para o player: ok/replay vs conflict (resync). */
export type AdvanceOutcome =
  | { kind: 'ok'; result: TrilhaAdvanceResult }
  | { kind: 'replay'; result: TrilhaAdvanceResult }
  | {
      kind: 'conflict'
      error: TrilhaApiError
      /** Re-fetch next-content após 409. */
      resync: () => Promise<TrilhaNextContent>
    }

export async function loginWithPhone(phoneInput: string): Promise<TrilhaSession> {
  const phoneDigits = phoneForLogin(phoneInput)
  const url = new URL('/api/trilha_auth', resolveApiBaseUrl())
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ phone_number: phoneDigits }),
  })
  if (!res.ok) throw await parseError(res)
  const body = (await res.json()) as {
    token?: string
    student?: TrilhaStudent
  }
  if (!body.token || !body.student?.student_id) {
    throw new TrilhaApiError('Resposta de login inválida.', 500, 'invalid_response')
  }
  return { token: body.token, student: body.student }
}

export async function fetchTrilhaHome(
  token?: string,
): Promise<TrilhaHomeResponse> {
  const url = new URL('/api/student_trails', resolveApiBaseUrl())
  url.search = facadeQuery('home').toString()
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: authHeaders(token),
  })
  if (res.status === 401 || res.status === 403) {
    clearTrilhaSession()
    throw await parseError(res)
  }
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as TrilhaHomeResponse
}

export async function fetchNextContent(
  studentId: string,
  trailId: string,
  token?: string,
): Promise<TrilhaNextContent> {
  const url = new URL('/api/student_trails', resolveApiBaseUrl())
  const params = facadeQuery('next-content')
  params.set('student_id', studentId)
  params.set('trail_id', trailId)
  params.set('channel', 'app')
  url.search = params.toString()
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: authHeaders(token),
  })
  if (res.status === 401 || res.status === 403) {
    clearTrilhaSession()
    throw await parseError(res)
  }
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as TrilhaNextContent
}

/** Gera (ou reusa) conteúdo IA da célula atual — POST, nunca no GET. */
export async function ensureTrailAi(
  studentId: string,
  trailId: string,
  token?: string,
): Promise<TrilhaNextContent & { generated?: boolean }> {
  const url = new URL('/api/student_trails', resolveApiBaseUrl())
  url.search = facadeQuery('ensure-ai').toString()
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      student_id: studentId,
      trail_id: trailId,
      channel: 'app',
    }),
  })
  if (res.status === 401 || res.status === 403) {
    clearTrilhaSession()
    throw await parseError(res)
  }
  if (!res.ok) throw await parseError(res)
  const body = (await res.json()) as {
    content?: string
    ai_status?: string
    generated?: boolean
    progress_version?: number
    stage_number?: number
    question_number?: number
    title?: string | null
  }
  // Re-fetch next-content para payload completo (options, next_action, etc.).
  const next = await fetchNextContent(studentId, trailId, token)
  if (typeof body.content === 'string' && body.content.trim()) {
    return {
      ...next,
      content: body.content,
      ai_status: 'ready',
      generated: body.generated === true,
    }
  }
  return { ...next, generated: body.generated === true }
}

export async function fetchTrailHistory(
  studentId: string,
  trailId: string,
  token?: string,
): Promise<TrilhaHistoryResponse> {
  const url = new URL('/api/student_trails', resolveApiBaseUrl())
  const params = facadeQuery('history')
  params.set('student_id', studentId)
  params.set('trail_id', trailId)
  url.search = params.toString()
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: authHeaders(token),
  })
  if (res.status === 401 || res.status === 403) {
    clearTrilhaSession()
    throw await parseError(res)
  }
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as TrilhaHistoryResponse
}

/** conversation_logs da matrícula — ordem cronológica (chat-first). */
export async function fetchTrailConversation(
  studentId: string,
  trailId: string,
  token?: string,
): Promise<TrilhaConversationResponse> {
  const url = new URL('/api/student_trails', resolveApiBaseUrl())
  const params = facadeQuery('conversation')
  params.set('student_id', studentId)
  params.set('trail_id', trailId)
  url.search = params.toString()
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: authHeaders(token),
  })
  if (res.status === 401 || res.status === 403) {
    clearTrilhaSession()
    throw await parseError(res)
  }
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as TrilhaConversationResponse
}

/**
 * Persiste delivery fixed/exercise em conversation_logs (idempotente).
 * Stage ai → no-op aqui; usar ensureTrailAi no Continuar.
 */
export async function ensureStepDelivery(
  studentId: string,
  trailId: string,
  token?: string,
): Promise<{ content: string | null; persisted: boolean }> {
  const url = new URL('/api/student_trails', resolveApiBaseUrl())
  url.search = facadeQuery('ensure-delivery').toString()
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      student_id: studentId,
      trail_id: trailId,
      channel: 'app',
    }),
  })
  if (res.status === 401 || res.status === 403) {
    clearTrilhaSession()
    throw await parseError(res)
  }
  if (!res.ok) throw await parseError(res)
  const body = (await res.json()) as {
    content?: string | null
    persisted?: boolean
  }
  return {
    content: typeof body.content === 'string' ? body.content : null,
    persisted: body.persisted === true,
  }
}

export async function advanceProgress(input: {
  studentId: string
  trailId: string
  idempotencyKey: string
  expectedVersion?: number
  reason?: 'delivered' | 'answered' | 'skip'
  token?: string
}): Promise<TrilhaAdvanceResult> {
  if (!input.idempotencyKey.trim()) {
    throw new TrilhaApiError(
      'Idempotency-Key é obrigatória.',
      400,
      'invalid_payload',
    )
  }
  const url = new URL('/api/student_trails', resolveApiBaseUrl())
  url.search = facadeQuery('advance').toString()
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      ...authHeaders(input.token),
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({
      student_id: input.studentId,
      trail_id: input.trailId,
      channel: 'app',
      reason: input.reason ?? 'delivered',
      expected_version: input.expectedVersion,
      idempotency_key: input.idempotencyKey,
    }),
  })
  if (res.status === 401 || res.status === 403) {
    clearTrilhaSession()
    throw await parseError(res)
  }
  if (res.status === 409) {
    throw await parseError(res)
  }
  if (!res.ok) throw await parseError(res)
  const body = (await res.json()) as TrilhaAdvanceResult & { replay?: boolean }
  return {
    status: body.status ?? 'ok',
    replay: body.replay === true,
    next_stage_number: body.next_stage_number,
    next_question_number: body.next_question_number,
    completed: body.completed,
    progress_version: body.progress_version,
  }
}

/**
 * Advance com tratamento de 409: devolve conflict + callback de resync
 * (re-fetch getNextContent) sem mensagem assustadora no container.
 */
export async function advanceWithConflictHandling(input: {
  studentId: string
  trailId: string
  idempotencyKey: string
  expectedVersion?: number
  reason?: 'delivered' | 'answered' | 'skip'
  token?: string
}): Promise<AdvanceOutcome> {
  try {
    const result = await advanceProgress(input)
    if (result.replay) return { kind: 'replay', result }
    return { kind: 'ok', result }
  } catch (e) {
    if (e instanceof TrilhaApiError && e.isConflict) {
      return {
        kind: 'conflict',
        error: e,
        resync: () =>
          fetchNextContent(input.studentId, input.trailId, input.token),
      }
    }
    throw e
  }
}

export async function submitExercise(input: {
  studentId: string
  trailId: string
  institutionId: string
  stageNumber: number
  questionNumber: number
  answer: string
  idempotencyKey: string
  expectedVersion?: number
  token?: string
}): Promise<{ status: string; is_correct?: boolean; advanced?: boolean }> {
  if (!input.idempotencyKey.trim()) {
    throw new TrilhaApiError(
      'Idempotency-Key é obrigatória.',
      400,
      'invalid_payload',
    )
  }
  const url = new URL('/api/student_trails', resolveApiBaseUrl())
  url.search = facadeQuery('submit-exercise').toString()
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      ...authHeaders(input.token),
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({
      student_id: input.studentId,
      trail_id: input.trailId,
      institution_id: input.institutionId,
      stage_number: input.stageNumber,
      question_number: input.questionNumber,
      student_answer: input.answer,
      channel: 'app',
      expected_version: input.expectedVersion,
      idempotency_key: input.idempotencyKey,
    }),
  })
  if (res.status === 401 || res.status === 403) {
    clearTrilhaSession()
    throw await parseError(res)
  }
  if (res.status === 409) {
    throw await parseError(res)
  }
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as {
    status: string
    is_correct?: boolean
    advanced?: boolean
  }
}
