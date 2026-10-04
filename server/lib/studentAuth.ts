/**
 * Sessão aluno (Wave B / ADR-010) — token HTTP assinado (HMAC-SHA256).
 * Prova de telefone v1: resolveStudentByPhone → emite sessão ligada a sN.
 * Chatis continua com Bearer de serviço (TRAIL_ENGINE_SERVICE_TOKEN).
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

export type StudentSessionClaims = {
  student_id: string
  institution_id: string
  name: string
  phone_number: string
  /** unix seconds */
  iat: number
  /** unix seconds */
  exp: number
}

export type AuthPrincipal =
  | { kind: 'service' }
  | { kind: 'student'; claims: StudentSessionClaims }
  | { kind: 'anonymous' }

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 14 // 14 dias

function b64urlEncode(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf
  return b
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const normalized = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  return Buffer.from(normalized, 'base64')
}

export function getStudentSessionSecret(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const explicit = env.STUDENT_SESSION_SECRET?.trim()
  if (explicit) return explicit

  const isProd =
    env.VERCEL_ENV === 'production' ||
    env.NODE_ENV === 'production' ||
    env.STUDENT_SESSION_REQUIRE_SECRET === '1'

  // RT-M3: fail-closed em produção — sem secret previsível.
  if (isProd) {
    throw new Error(
      'STUDENT_SESSION_SECRET ausente. Defina um secret forte em produção.',
    )
  }

  // Dev/preview sem secret: deriva do SA JSON se existir; senão secret de lab
  // marcado (nunca usar em prod — gated acima).
  const sa = env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON?.trim()
  if (sa) {
    return createHmac('sha256', 'crias-student-session-v1')
      .update(sa.slice(0, 256))
      .digest('hex')
  }
  return 'crias-dev-student-session-secret-LAB-ONLY'
}

export function getServiceBearerToken(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const t =
    env.TRAIL_ENGINE_SERVICE_TOKEN?.trim() ||
    env.CHATIS_SERVICE_TOKEN?.trim() ||
    null
  return t && t.length > 0 ? t : null
}

export function issueStudentSessionToken(
  input: {
    student_id: string
    institution_id: string
    name: string
    phone_number: string
    ttlSeconds?: number
  },
  env: NodeJS.ProcessEnv = process.env,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): { token: string; claims: StudentSessionClaims } {
  const ttl = input.ttlSeconds ?? DEFAULT_TTL_SECONDS
  const claims: StudentSessionClaims = {
    student_id: input.student_id,
    institution_id: input.institution_id,
    name: input.name,
    phone_number: input.phone_number,
    iat: nowSeconds,
    exp: nowSeconds + ttl,
  }
  const payload = b64urlEncode(JSON.stringify(claims))
  const secret = getStudentSessionSecret(env)
  const sig = b64urlEncode(
    createHmac('sha256', secret).update(`v1.${payload}`).digest(),
  )
  return { token: `v1.${payload}.${sig}`, claims }
}

export function verifyStudentSessionToken(
  token: string,
  env: NodeJS.ProcessEnv = process.env,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): StudentSessionClaims | null {
  const parts = token.trim().split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') return null
  const [, payload, sig] = parts
  if (!payload || !sig) return null

  const secret = getStudentSessionSecret(env)
  const expected = b64urlEncode(
    createHmac('sha256', secret).update(`v1.${payload}`).digest(),
  )
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  let claims: StudentSessionClaims
  try {
    claims = JSON.parse(b64urlDecode(payload).toString('utf8')) as StudentSessionClaims
  } catch {
    return null
  }

  if (
    typeof claims.student_id !== 'string' ||
    !claims.student_id.trim() ||
    typeof claims.exp !== 'number' ||
    claims.exp < nowSeconds
  ) {
    return null
  }

  return {
    student_id: claims.student_id.trim(),
    institution_id:
      typeof claims.institution_id === 'string' ? claims.institution_id : '',
    name: typeof claims.name === 'string' ? claims.name : '',
    phone_number:
      typeof claims.phone_number === 'string' ? claims.phone_number : '',
    iat: typeof claims.iat === 'number' ? claims.iat : 0,
    exp: claims.exp,
  }
}

export function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null
  const m = authorizationHeader.match(/^Bearer\s+(.+)$/i)
  if (!m?.[1]) return null
  const t = m[1].trim()
  return t.length ? t : null
}

/**
 * Resolve o principal do request.
 * - Bearer == TRAIL_ENGINE_SERVICE_TOKEN → service (Chatis / integrações)
 * - Bearer == sessão aluno válida → student
 * - caso contrário → anonymous
 */
export function resolveAuthPrincipal(
  authorizationHeader: string | null,
  env: NodeJS.ProcessEnv = process.env,
  nowSeconds?: number,
): AuthPrincipal {
  const bearer = extractBearerToken(authorizationHeader)
  if (!bearer) return { kind: 'anonymous' }

  const service = getServiceBearerToken(env)
  if (service) {
    const a = Buffer.from(bearer)
    const b = Buffer.from(service)
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return { kind: 'service' }
    }
  }

  const claims = verifyStudentSessionToken(bearer, env, nowSeconds)
  if (claims) return { kind: 'student', claims }

  return { kind: 'anonymous' }
}

/**
 * AuthZ para leitura/mutação de progresso de um student_id alvo (I8 / ADR-010).
 * - service: ok
 * - student: só se claims.student_id === targetStudentId
 * - anonymous: negado
 */
export function authorizeStudentResource(
  principal: AuthPrincipal,
  targetStudentId: string,
): { ok: true } | { ok: false; status: 401 | 403; code: string; error: string } {
  const target = targetStudentId.trim()
  if (!target) {
    return {
      ok: false,
      status: 401,
      code: 'invalid_payload',
      error: 'student_id ausente.',
    }
  }

  if (principal.kind === 'service') return { ok: true }

  if (principal.kind === 'student') {
    if (principal.claims.student_id === target) return { ok: true }
    return {
      ok: false,
      status: 403,
      code: 'forbidden',
      error: 'Acesso negado a progresso de outro aluno.',
    }
  }

  return {
    ok: false,
    status: 401,
    code: 'unauthorized',
    error: 'Autenticação necessária.',
  }
}
