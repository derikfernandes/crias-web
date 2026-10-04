export type ExerciseAttemptCreatePayload = {
  student_id: string
  institution_id: string
  trail_id: string
  stage_number: number
  question_number: number
  student_answer: string
  feedback: string | null
  /** Optimistic lock (C2-R23); omitido → sem check de versão. */
  expected_version?: number
  idempotency_key?: string | null
}

export function sanitizeString(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s.length ? s : null
}

export function parseIntLoose(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v)) {
    return v
  }
  if (typeof v !== 'string') return null
  const n = Number.parseInt(v.trim(), 10)
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null
  return n
}

function parseOptionalString(v: unknown): string | null {
  if (v === undefined || v === null) return null
  const s = sanitizeString(v)
  return s ?? null
}

export function validateExerciseAttemptCreate(
  payload: unknown,
):
  | { ok: true; data: ExerciseAttemptCreatePayload }
  | { ok: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Payload inválido' }
  }

  const body = payload as Record<string, unknown>

  const student_id = sanitizeString(body.student_id)
  const institution_id = sanitizeString(body.institution_id)
  const trail_id = sanitizeString(body.trail_id)

  if (!student_id) {
    return { ok: false, error: 'Campo "student_id" é obrigatório' }
  }
  if (!institution_id) {
    return { ok: false, error: 'Campo "institution_id" é obrigatório' }
  }
  if (!trail_id) {
    return { ok: false, error: 'Campo "trail_id" é obrigatório' }
  }

  const stage_number = parseIntLoose(body.stage_number)
  if (stage_number === null || stage_number < 1) {
    return {
      ok: false,
      error: 'Campo "stage_number" é obrigatório e deve ser um inteiro >= 1',
    }
  }

  const question_number = parseIntLoose(body.question_number)
  if (question_number === null || question_number < 1) {
    return {
      ok: false,
      error:
        'Campo "question_number" é obrigatório e deve ser um inteiro >= 1',
    }
  }

  const student_answer = sanitizeString(body.student_answer)
  if (!student_answer) {
    return {
      ok: false,
      error: 'Campo "student_answer" é obrigatório',
    }
  }

  const feedback = parseOptionalString(body.feedback)

  const expectedRaw = body.expected_version
  let expected_version: number | undefined
  if (expectedRaw !== undefined && expectedRaw !== null) {
    const n = parseIntLoose(expectedRaw)
    if (n === null || n < 0) {
      return {
        ok: false,
        error: 'Campo "expected_version" deve ser um inteiro >= 0',
      }
    }
    expected_version = n
  }

  const idempotency_key = parseOptionalString(body.idempotency_key)

  return {
    ok: true,
    data: {
      student_id,
      institution_id,
      trail_id,
      stage_number,
      question_number,
      student_answer,
      feedback,
      expected_version,
      idempotency_key,
    },
  }
}
