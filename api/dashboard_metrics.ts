/**
 * GET /api/dashboard_metrics?institution_id=…
 *
 * Payload pequeno (métricas pré-agregadas). Nunca devolve o mapa de answers.
 * Auth: Bearer Firebase ID token da Gestão (mesmo do dashboard_summary).
 */
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

import {
  ensureMetricsFromExistingCache,
  readMetricsFromCache,
  warmInstitutionSummary,
} from './dashboard_summary'
import {
  canAccessInstitution,
  requireGestaoAdminFromRequest,
} from '../server/lib/gestaoAdminAuth'
import { gestaoCorsHeaders } from '../server/lib/gestaoCors'
import type { InstitutionDashboardMetrics } from '../server/lib/dashboardInstitutionMetrics'

export const config = {
  maxDuration: 300,
}

type Json = Record<string, unknown>

const METRICS_L1_TTL_MS = 5 * 60_000
const metricsL1 = new Map<
  string,
  { expires: number; metrics: InstitutionDashboardMetrics }
>()

function corsHeaders(request: Request): Record<string, string> {
  return gestaoCorsHeaders(request, 'GET,OPTIONS')
}

let cachedDb: ReturnType<typeof getFirestore> | null = null

function getDb() {
  if (cachedDb) return cachedDb
  const saJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON
  if (!saJson) {
    throw new Error(
      'FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON ausente. Defina no ambiente da Vercel.',
    )
  }
  const serviceAccount = JSON.parse(saJson) as ServiceAccount
  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) })
  }
  cachedDb = getFirestore()
  return cachedDb
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    })
  }

  const respond = (
    status: number,
    body: Json,
    extraHeaders?: Record<string, string>,
  ): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...corsHeaders(request),
        ...(extraHeaders ?? {}),
      },
    })

  if (request.method !== 'GET') {
    return respond(405, { error: `Método ${request.method} não permitido` })
  }

  const url = new URL(request.url)
  const institutionId = url.searchParams.get('institution_id')?.trim()
  if (!institutionId) {
    return respond(400, { error: 'Informe "institution_id".' })
  }
  const forceRefresh = url.searchParams.get('refresh') === '1'

  let db: ReturnType<typeof getFirestore>
  try {
    db = getDb()
  } catch (e) {
    return respond(500, {
      error: e instanceof Error ? e.message : 'Erro ao inicializar Firebase Admin.',
    })
  }

  const auth = await requireGestaoAdminFromRequest(
    db,
    request.headers.get('Authorization'),
  )
  if (!auth.ok) {
    return respond(auth.status, { error: auth.error, code: auth.code })
  }
  if (!canAccessInstitution(auth.principal, institutionId)) {
    return respond(403, {
      error: 'Sem permissão para esta instituição.',
      code: 'forbidden',
    })
  }

  if (!forceRefresh) {
    const l1 = metricsL1.get(institutionId)
    if (l1 && l1.expires > Date.now()) {
      return respond(200, l1.metrics as unknown as Json, {
        'Cache-Control': 'private, max-age=60',
        'X-Metrics-Cache': 'HIT',
      })
    }

    try {
      const fromFs = await readMetricsFromCache(db, institutionId, {
        allowStale: true,
      })
      if (fromFs) {
        metricsL1.set(institutionId, {
          expires: Date.now() + METRICS_L1_TTL_MS,
          metrics: fromFs.metrics,
        })
        if (fromFs.stale) {
          // Background refresh (não bloqueia).
          void warmInstitutionSummary(institutionId)
            .then(() => readMetricsFromCache(db, institutionId))
            .then((fresh) => {
              if (fresh) {
                metricsL1.set(institutionId, {
                  expires: Date.now() + METRICS_L1_TTL_MS,
                  metrics: fresh.metrics,
                })
              }
            })
            .catch(() => {
              // ignore
            })
        }
        return respond(200, fromFs.metrics as unknown as Json, {
          'Cache-Control': 'private, max-age=60',
          'X-Metrics-Cache': fromFs.stale ? 'FIRESTORE-STALE' : 'FIRESTORE',
        })
      }
    } catch {
      // miss → compute
    }

    // Cache antigo (answers sem metrics): deriva metrics sem rescanear logs.
    try {
      const derived = await ensureMetricsFromExistingCache(institutionId)
      if (derived) {
        metricsL1.set(institutionId, {
          expires: Date.now() + METRICS_L1_TTL_MS,
          metrics: derived,
        })
        return respond(200, derived as unknown as Json, {
          'Cache-Control': 'private, max-age=60',
          'X-Metrics-Cache': 'DERIVED',
        })
      }
    } catch (e) {
      console.warn(
        '[dashboard_metrics] DERIVED falhou',
        institutionId,
        e instanceof Error ? e.message : e,
      )
    }
  }

  // Miss (ou refresh=1): gera com lock. Nunca 503 por cache vazio.
  try {
    const t0 = Date.now()
    await warmInstitutionSummary(institutionId)
    const fresh = await readMetricsFromCache(db, institutionId, {
      allowStale: true,
    })
    if (!fresh) {
      return respond(500, {
        error: 'Métricas indisponíveis após regeneração.',
      })
    }
    metricsL1.set(institutionId, {
      expires: Date.now() + METRICS_L1_TTL_MS,
      metrics: fresh.metrics,
    })
    return respond(200, fresh.metrics as unknown as Json, {
      'Cache-Control': 'private, max-age=60',
      'X-Metrics-Cache': forceRefresh ? 'REFRESH' : 'MISS',
      'X-Metrics-Warm-Ms': String(Date.now() - t0),
      ...(fresh.metaBytes
        ? { 'X-Metrics-Meta-Bytes': String(fresh.metaBytes) }
        : {}),
    })
  } catch (e) {
    console.error(
      '[dashboard_metrics] warm falhou',
      institutionId,
      e instanceof Error ? e.message : e,
    )
    return respond(500, {
      error: e instanceof Error ? e.message : 'Erro interno',
    })
  }
}

export default async function handler(req: any, res: any): Promise<void> {
  const method = (req?.method ?? 'GET') as string
  const host = (req?.headers?.host ?? 'localhost') as string
  const path = (req?.url ?? '/') as string
  const url = new URL(path, `https://${host}`)
  const headers = new Headers()
  const rawHeaders = (req?.headers ?? {}) as Record<string, unknown>
  for (const [k, v] of Object.entries(rawHeaders)) {
    if (typeof v === 'string') headers.set(k, v)
    else if (Array.isArray(v)) headers.set(k, v.join(','))
  }
  const response = await handleRequest(
    new Request(url.toString(), { method, headers }),
  )
  res.statusCode = response.status
  response.headers.forEach((value: string, key: string) => {
    try {
      res.setHeader(key, value)
    } catch {
      // ignore
    }
  })
  const ab = await response.arrayBuffer()
  res.end(Buffer.from(ab))
}
