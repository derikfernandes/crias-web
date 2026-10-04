export const TRAIL_ENGINE_ERROR_CODES = [
  'not_found',
  'inactive_student',
  'inactive_trail',
  'blocked',
  'completed',
  'invalid_payload',
  'invalid_phone',
  'conflict',
  'unauthorized',
  'internal_error',
] as const

export type TrailEngineErrorCode = (typeof TRAIL_ENGINE_ERROR_CODES)[number]

const STATUS_BY_CODE: Record<TrailEngineErrorCode, number> = {
  not_found: 404,
  inactive_student: 404,
  inactive_trail: 409,
  blocked: 409,
  completed: 409,
  invalid_payload: 400,
  invalid_phone: 400,
  conflict: 409,
  unauthorized: 401,
  internal_error: 500,
}

export class TrailEngineError extends Error {
  readonly code: TrailEngineErrorCode
  readonly httpStatus: number
  readonly details: Record<string, unknown> | undefined

  constructor(
    code: TrailEngineErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'TrailEngineError'
    this.code = code
    this.httpStatus = STATUS_BY_CODE[code]
    this.details = details
  }
}

export function isTrailEngineError(e: unknown): e is TrailEngineError {
  return e instanceof TrailEngineError
}

export function trailEngineErrorToJson(e: TrailEngineError): {
  status: 'error'
  code: TrailEngineErrorCode
  message: string
  details?: Record<string, unknown>
} {
  return {
    status: 'error',
    code: e.code,
    message: e.message,
    ...(e.details ? { details: e.details } : {}),
  }
}
