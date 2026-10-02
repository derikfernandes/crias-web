const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
  /\/$/,
  '',
) ?? ''

export type ApiError = {
  status?: string
  code?: string
  message?: string
  error?: string
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
  options: unknown[] | null
  explanation: string | null
  is_released: boolean
  next_action: string
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

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return { error: text }
  }
}

export async function identifyStudent(input: {
  phone_number: string
  institution_code: string
}): Promise<IdentifyResponse> {
  const res = await fetch(`${API_BASE}/student/identify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const body = (await parseJson(res)) as IdentifyResponse & ApiError
  if (!res.ok || body.status !== 'ok') {
    throw new Error(body.message || body.error || 'Não foi possível entrar.')
  }
  return body
}

export async function listStudentTrails(
  studentId: string,
): Promise<StudentTrailRow[]> {
  const url = new URL(`${API_BASE}/student_trails`, window.location.origin)
  url.searchParams.set('student_id', studentId)
  const res = await fetch(url.pathname + url.search)
  const body = await parseJson(res)
  if (!res.ok) {
    const err = body as ApiError
    throw new Error(err.message || err.error || 'Falha ao listar trilhas.')
  }
  return Array.isArray(body) ? (body as StudentTrailRow[]) : []
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
  const res = await fetch(url.pathname + url.search)
  const body = (await parseJson(res)) as NextContentOk | NextContentStatus | ApiError
  if (!res.ok) {
    const err = body as ApiError
    throw new Error(err.message || err.error || 'Falha ao carregar conteúdo.')
  }
  return body as NextContentOk | NextContentStatus
}

export async function advanceTrail(
  studentId: string,
  trailId: string,
): Promise<AdvanceResponse> {
  const res = await fetch(`${API_BASE}/student_trails/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: studentId, trail_id: trailId }),
  })
  const body = (await parseJson(res)) as AdvanceResponse & ApiError
  if (!res.ok) {
    throw new Error(body.message || body.error || 'Falha ao avançar.')
  }
  return body
}
