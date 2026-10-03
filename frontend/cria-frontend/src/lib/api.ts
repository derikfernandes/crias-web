import { toUserFacingError } from './networkError'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
  /\/$/,
  '',
) ?? ''

/** Timeout de cliente p/ mutate/loads longos (R18-N01 / N04). */
const CLIENT_TIMEOUT_MS = 15_000

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = CLIENT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const external = init?.signal
  if (external?.aborted) {
    throw new ApiRequestError('A conexão demorou demais. Tente de novo.', 408)
  }
  const onAbort = () => controller.abort()
  external?.addEventListener('abort', onAbort)
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (err) {
    if (controller.signal.aborted) {
      throw new ApiRequestError('A conexão demorou demais. Tente de novo.', 408)
    }
    throw err
  } finally {
    window.clearTimeout(timer)
    external?.removeEventListener('abort', onAbort)
  }
}

export type ApiError = {
  status?: string
  code?: string
  message?: string
  error?: string
}

/** Erro HTTP tipado — auth (401/403) vs sistema. */
export class ApiRequestError extends Error {
  readonly status: number
  readonly code?: string
  readonly authFailed: boolean

  constructor(
    message: string,
    status: number,
    opts?: { code?: string; authFailed?: boolean },
  ) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = opts?.code
    this.authFailed =
      opts?.authFailed ?? (status === 401 || status === 403)
  }
}

export function isAuthError(err: unknown): boolean {
  return err instanceof ApiRequestError && err.authFailed
}

export type IdentifyResponse = {
  status: 'ok'
  student_id: string
  institution_id: string
  name: string
  active: boolean
  phone_number: string
}

export type StudentTrailRow = {
  id: string
  student_id: string
  institution_id: string
  trail_id: string
  current_stage_number: number
  current_question_number: number
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked'
}

export type ExerciseOption = {
  key: string
  text: string
}

export type NextContentOk = {
  status: 'ok'
  student_id: string
  trail_id: string
  stage_number: number
  question_number: number
  stage_type: 'ai' | 'fixed' | 'exercise'
  stage_title?: string | null
  prompt: string | null
  content: string | null
  options: Array<ExerciseOption | string> | null
  explanation: string | null
  is_released: boolean
  next_action: string
}

/** Normaliza options do next-content para botões clicáveis (key = resposta enviada). */
export function normalizeExerciseOptions(
  raw: NextContentOk['options'],
): ExerciseOption[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  const out: ExerciseOption[] = []
  for (const item of raw) {
    if (typeof item === 'string') {
      const s = item.trim()
      if (!s) continue
      // A) / A. / A: / (A) …
      const letter = s.match(/^\(?([A-Za-z])\)?\s*[\)\.\:]/)
      out.push({ key: letter ? letter[1].toUpperCase() : s, text: s })
      continue
    }
    if (item && typeof item === 'object') {
      const key = String((item as ExerciseOption).key ?? '').trim()
      const text = String((item as ExerciseOption).text ?? key).trim()
      if (!key) continue
      out.push({ key, text: text || key })
    }
  }
  return out
}

export type NextContentStatus = {
  status: 'blocked' | 'completed' | 'not_found' | 'inactive_student' | 'inactive_trail'
  student_id?: string
  trail_id?: string
  stage_number?: number
  question_number?: number
  message?: string
}

export type AdvanceResponse = {
  status: 'ok' | 'blocked' | 'completed' | 'inactive_student' | 'inactive_trail'
  next_stage_number?: number
  next_question_number?: number
  completed?: boolean
  message?: string
}

export type ConversationLogRow = {
  id: string
  student_id: string
  trail_id: string
  stage_number: number
  question_number: number
  sender: 'system' | 'student' | string
  message_text: string
  institution_id?: string | null
  message_type?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
  created_at_brasilia?: string | null
  created_at_ms?: number | null
}

export type TrailHistoryPage = {
  logs: ConversationLogRow[]
  has_more: boolean
  next_before: number | null
  total_matching?: number
  position?: {
    current_stage_number: number
    current_question_number: number
  } | null
}

export type ExerciseAttemptResult = {
  id: string
  student_id: string
  institution_id: string
  trail_id: string
  stage_number: number
  question_number: number
  student_answer: string
  correct_option?: string
  is_correct: boolean
  score: number | null
  feedback?: string | null
  /** Texto do BLOCO RESPOSTA (stage AI seguinte), quando disponível. */
  pedagogical_feedback?: string | null
  attempt_number: number
}

export type MariaReply = {
  status: 'ok'
  reply: string
  model: string
  stage_number: number
  question_number: number
}

function looksLikeHtml(text: string): boolean {
  const t = text.trim()
  return (
    t.startsWith('<') ||
    /<\/?(html|body|head|pre|div|span)\b/i.test(t) ||
    /bad gateway|nginx|cloudflare/i.test(t)
  )
}

/** Extrai mensagem sem crash em body null / HTML (ER03/ER04). */
export function messageFromBody(body: unknown, fallback: string): string {
  if (body == null) return fallback
  if (typeof body === 'string') {
    const t = body.trim()
    if (!t || looksLikeHtml(t)) return fallback
    return t
  }
  if (typeof body === 'object') {
    const o = body as ApiError
    const msg =
      (typeof o.message === 'string' && o.message.trim()) ||
      (typeof o.error === 'string' && o.error.trim()) ||
      ''
    if (!msg || looksLikeHtml(msg)) return fallback
    return msg
  }
  return fallback
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    // HTML / texto não-JSON — não vazar markup (ER04).
    if (looksLikeHtml(text)) return null
    return { error: text.slice(0, 200) }
  }
}

function throwHttpError(
  res: Response,
  body: unknown,
  fallback: string,
): never {
  if (res.status === 401 || res.status === 403) {
    throw new ApiRequestError(
      res.status === 401
        ? 'Sua sessão expirou. Entre de novo para continuar.'
        : 'Você não tem permissão para esta ação. Entre de novo.',
      res.status,
      { authFailed: true },
    )
  }
  const raw = messageFromBody(body, fallback)
  const friendly = toUserFacingError(new Error(raw), fallback)
  throw new ApiRequestError(friendly, res.status)
}

export async function identifyStudent(input: {
  phone_number: string
  institution_code: string
  password: string
}): Promise<IdentifyResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/student/identify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const body = (await parseJson(res)) as IdentifyResponse & ApiError & {
    code?: string
  }
  if (!res.ok || (body as { status?: string } | null)?.status !== 'ok') {
    // ER08: 401/Unauthorized → mesma copy PT de credenciais.
    const code = typeof body?.code === 'string' ? body.code : ''
    const raw = messageFromBody(body, '')
    if (
      res.status === 401 ||
      res.status === 403 ||
      /unauthorized|forbidden|invalid_credentials|password_not_set/i.test(
        `${code} ${raw}`,
      )
    ) {
      throw new ApiRequestError(
        'Telefone, instituição ou senha incorretos.',
        res.status || 401,
        { code: code || undefined, authFailed: false },
      )
    }
    const fallback = 'Não foi possível entrar.'
    throw new ApiRequestError(
      toUserFacingError(new Error(raw || fallback), fallback),
      res.status || 500,
    )
  }
  return body
}

export async function listStudentTrails(
  studentId: string,
): Promise<StudentTrailRow[]> {
  const url = new URL(`${API_BASE}/student_trails`, window.location.origin)
  url.searchParams.set('student_id', studentId)
  const res = await fetchWithTimeout(url.pathname + url.search)
  const body = await parseJson(res)
  if (!res.ok) {
    throwHttpError(res, body, 'Não foi possível carregar suas trilhas.')
  }
  return Array.isArray(body) ? (body as StudentTrailRow[]) : []
}

/** Totais de etapas por trilha (sidebar Maria — progresso). */
export async function fetchTrailStageTotals(): Promise<Record<string, number>> {
  const url = new URL(`${API_BASE}/trail_stages`, window.location.origin)
  url.searchParams.set('simple', '1')
  const res = await fetch(url.pathname + url.search)
  const body = await parseJson(res)
  if (!res.ok || !Array.isArray(body)) return {}
  const map: Record<string, number> = {}
  for (const row of body as Array<{ trail_id?: string; stage_number?: number }>) {
    const tid = row.trail_id
    if (!tid) continue
    const n = typeof row.stage_number === 'number' ? row.stage_number : 0
    map[tid] = Math.max(map[tid] ?? 0, n)
  }
  return map
}

export async function fetchNextContent(
  studentId: string,
  trailId: string,
): Promise<NextContentOk | NextContentStatus> {
  const url = new URL(
    `${API_BASE}/student_trails/next-content`,
    window.location.origin,
  )
  url.searchParams.set('student_id', studentId)
  url.searchParams.set('trail_id', trailId)
  const res = await fetchWithTimeout(url.pathname + url.search)
  const body = await parseJson(res)
  if (!res.ok) {
    throwHttpError(res, body, 'Não foi possível carregar a aula.')
  }
  return body as NextContentOk | NextContentStatus
}

export async function fetchTrailHistoryPage(
  studentId: string,
  trailId: string,
  opts?: {
    limit?: number
    before?: number | null
    includeAhead?: boolean
  },
): Promise<TrailHistoryPage> {
  const url = new URL(
    `${API_BASE}/student_trails/history`,
    window.location.origin,
  )
  url.searchParams.set('student_id', studentId)
  url.searchParams.set('trail_id', trailId)
  url.searchParams.set('limit', String(opts?.limit ?? 40))
  if (opts?.before != null && Number.isFinite(opts.before)) {
    url.searchParams.set('before', String(opts.before))
  }
  if (opts?.includeAhead) {
    url.searchParams.set('include_ahead', '1')
  }
  const res = await fetchWithTimeout(url.pathname + url.search)
  const body = await parseJson(res)
  if (!res.ok) {
    throwHttpError(res, body, 'Não foi possível carregar o histórico.')
  }
  // Backcompat: array puro (deploy antigo).
  if (Array.isArray(body)) {
    return {
      logs: body as ConversationLogRow[],
      has_more: false,
      next_before: null,
    }
  }
  if (body && typeof body === 'object') {
    const obj = body as Partial<TrailHistoryPage> & { logs?: unknown }
    const logs = Array.isArray(obj.logs) ? (obj.logs as ConversationLogRow[]) : []
    return {
      logs,
      has_more: Boolean(obj.has_more),
      next_before:
        typeof obj.next_before === 'number' ? obj.next_before : null,
      total_matching:
        typeof obj.total_matching === 'number' ? obj.total_matching : undefined,
      position: obj.position ?? null,
    }
  }
  return { logs: [], has_more: false, next_before: null }
}

/** @deprecated Prefer fetchTrailHistoryPage — mantido p/ callers simples. */
export async function fetchTrailHistory(
  studentId: string,
  trailId: string,
): Promise<ConversationLogRow[]> {
  const page = await fetchTrailHistoryPage(studentId, trailId, { limit: 40 })
  return page.logs
}

export async function createConversationLog(input: {
  student_id: string
  trail_id: string
  stage_number: number
  question_number: number
  sender: 'system' | 'student'
  message_text: string
  institution_id?: string | null
  message_type?: 'text' | 'instruction' | 'exercise' | 'feedback' | null
  metadata?: Record<string, unknown> | null
}): Promise<ConversationLogRow> {
  const res = await fetchWithTimeout(`${API_BASE}/conversation_logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const body = await parseJson(res)
  if (!res.ok) {
    throwHttpError(res, body, 'Não foi possível gravar a mensagem.')
  }
  return body as ConversationLogRow
}

export async function advanceTrail(
  studentId: string,
  trailId: string,
): Promise<AdvanceResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/student_trails/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: studentId, trail_id: trailId }),
  })
  const body = await parseJson(res)
  if (!res.ok) {
    throwHttpError(res, body, 'Não foi possível avançar a trilha.')
  }
  return body as AdvanceResponse
}

export async function askMaria(input: {
  student_id: string
  trail_id: string
  message: string
  stage_number?: number
  question_number?: number
}): Promise<MariaReply> {
  const res = await fetchWithTimeout(`${API_BASE}/student_trails/maria`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const body = await parseJson(res)
  if (!res.ok) {
    throwHttpError(res, body, 'Não foi possível falar com Maria.')
  }
  const reply = body as MariaReply & ApiError
  if (reply?.status !== 'ok') {
    throw new ApiRequestError(
      messageFromBody(body, 'Não foi possível falar com Maria.'),
      500,
    )
  }
  return reply
}

export async function submitExerciseAttempt(input: {
  student_id: string
  institution_id: string
  trail_id: string
  stage_number: number
  question_number: number
  student_answer: string
  feedback?: string | null
}): Promise<ExerciseAttemptResult> {
  const res = await fetchWithTimeout(`${API_BASE}/exercise_attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const body = await parseJson(res)
  if (!res.ok) {
    throwHttpError(res, body, 'Não foi possível enviar a resposta.')
  }
  return body as ExerciseAttemptResult
}
