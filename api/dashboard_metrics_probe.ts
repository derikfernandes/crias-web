/**
 * Probe Admin SDK do cache de métricas (sem token de usuário).
 * Preview: aberto (só campos técnicos + KPIs agregados, sem alunos).
 * Production: CRON_SECRET / x-vercel-cron.
 *
 * GET /api/dashboard_metrics_probe?institution_id=i2
 * GET /api/dashboard_metrics_probe?institution_id=i2&ensure=1  (DERIVED se faltar)
 * GET /api/dashboard_metrics_probe?institution_id=i2&warm=1   (gera cache)
 * GET /api/dashboard_metrics_probe?warm_all=1                 (todas as instituições)
 *
 * warm / warm_all escrevem só em gestao_dashboard_cache (nunca dados de alunos).
 */
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

import {
  ensureMetricsFromExistingCache,
  readMetricsFromCache,
  warmInstitutionSummary,
} from './dashboard_summary'

export const config = {
  maxDuration: 300,
}

const CACHE_COLLECTION = 'gestao_dashboard_cache'
/** Fallback se a collection institutions estiver vazia/indisponível. */
const DEFAULT_INSTITUTION_IDS = ['i1', 'i2', 'i4']

function cors(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  }
}

function getDb() {
  const saJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON
  if (!saJson) {
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON ausente')
  }
  const serviceAccount = JSON.parse(saJson) as ServiceAccount
  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) })
  }
  return getFirestore()
}

function authorized(request: Request): boolean {
  if (process.env.VERCEL_ENV === 'preview') return true
  const secret = process.env.CRON_SECRET?.trim()
  const auth = request.headers.get('Authorization') ?? ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const vercelCron = request.headers.get('x-vercel-cron') === '1'
  return vercelCron || Boolean(secret && bearer === secret)
}

async function listInstitutionIds(
  db: ReturnType<typeof getFirestore>,
): Promise<string[]> {
  const col = process.env.INSTITUTIONS_COLLECTION ?? 'institutions'
  try {
    const snap = await db.collection(col).select().get()
    const ids = snap.docs.map((d) => d.id).filter(Boolean)
    if (ids.length > 0) return [...new Set(ids)].sort()
  } catch (e) {
    console.warn(
      '[metrics_probe] list institutions falhou',
      e instanceof Error ? e.message : e,
    )
  }
  return [...DEFAULT_INSTITUTION_IDS]
}

async function readProbeBody(
  db: ReturnType<typeof getFirestore>,
  institutionId: string,
  started: number,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const fresh = await readMetricsFromCache(db, institutionId, {
    allowStale: true,
  })
  const metaSnap = await db.collection(CACHE_COLLECTION).doc(institutionId).get()
  const sidecarSnap = await db
    .collection(CACHE_COLLECTION)
    .doc(`${institutionId}_m`)
    .get()

  const metaBytes = metaSnap.exists
    ? Buffer.byteLength(JSON.stringify(metaSnap.data()), 'utf8')
    : 0
  const sidecarBytes = sidecarSnap.exists
    ? Buffer.byteLength(JSON.stringify(sidecarSnap.data()), 'utf8')
    : 0

  if (!fresh) {
    return {
      status: 404,
      body: {
        ok: false,
        status: 404,
        institution_id: institutionId,
        ms: Date.now() - started,
        meta_bytes: metaBytes,
        sidecar_bytes: sidecarBytes,
        error: 'metrics ausente no cache',
      },
    }
  }

  const m = fresh.metrics
  const agentBy = m.agent_usage_by_period ?? {}
  const agentSnap = (key: '0' | '7' | '30') => {
    const a = agentBy[key] as
      | { total_messages?: number; unique_students?: number; agents?: Array<{ unique_students?: number }> }
      | undefined
    if (!a) return { total_messages: 0, unique_students: 0 }
    const unique =
      typeof a.unique_students === 'number' && a.unique_students > 0
        ? a.unique_students
        : (a.agents ?? []).reduce((n, row) => n + (row.unique_students || 0), 0)
    return {
      total_messages: typeof a.total_messages === 'number' ? a.total_messages : 0,
      unique_students: unique,
    }
  }
  return {
    status: 200,
    body: {
      ok: true,
      status: 200,
      institution_id: institutionId,
      ms: Date.now() - started,
      meta_bytes: metaBytes,
      sidecar_bytes: sidecarBytes,
      stale: fresh.stale,
      computed_at: m.computed_at,
      avg_accuracy: m.avg_accuracy,
      avg_completion: m.avg_completion,
      avg_lesson_completion: m.avg_lesson_completion,
      exercise_count: m.exercise_count,
      active_students: m.active_students,
      accuracy_tried: m.accuracy_tried,
      agent_0: agentSnap('0'),
      agent_7: agentSnap('7'),
      agent_30: agentSnap('30'),
    },
  }
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() })
  }
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...cors() },
    })
  }
  if (!authorized(request)) {
    return new Response(
      JSON.stringify({ error: 'Não autorizado', code: 'unauthorized' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...cors() },
      },
    )
  }

  const url = new URL(request.url)
  const warmAll = url.searchParams.get('warm_all') === '1'
  const warm = url.searchParams.get('warm') === '1'
  const ensure = url.searchParams.get('ensure') === '1'
  const institutionId =
    url.searchParams.get('institution_id')?.trim() || 'i2'
  const started = Date.now()

  try {
    const db = getDb()

    if (warmAll) {
      const ids = await listInstitutionIds(db)
      // Sol primeiro (maior).
      ids.sort((a, b) => {
        if (a === 'i2') return -1
        if (b === 'i2') return 1
        return a.localeCompare(b)
      })
      const warmed: Record<
        string,
        {
          ok: boolean
          ms: number
          meta_bytes?: number
          sidecar_bytes?: number
          avg_accuracy?: number | null
          exercise_count?: number
          error?: string
        }
      > = {}
      for (const id of ids) {
        const t0 = Date.now()
        try {
          await warmInstitutionSummary(id)
          const probe = await readProbeBody(db, id, t0)
          warmed[id] = {
            ok: probe.body.ok === true,
            ms: Date.now() - t0,
            meta_bytes:
              typeof probe.body.meta_bytes === 'number'
                ? probe.body.meta_bytes
                : undefined,
            sidecar_bytes:
              typeof probe.body.sidecar_bytes === 'number'
                ? probe.body.sidecar_bytes
                : undefined,
            avg_accuracy:
              typeof probe.body.avg_accuracy === 'number' ||
              probe.body.avg_accuracy === null
                ? (probe.body.avg_accuracy as number | null)
                : undefined,
            exercise_count:
              typeof probe.body.exercise_count === 'number'
                ? probe.body.exercise_count
                : undefined,
            error:
              typeof probe.body.error === 'string'
                ? probe.body.error
                : undefined,
          }
        } catch (e) {
          warmed[id] = {
            ok: false,
            ms: Date.now() - t0,
            error: e instanceof Error ? e.message : 'erro',
          }
        }
      }
      return new Response(
        JSON.stringify({
          ok: Object.values(warmed).every((r) => r.ok),
          status: 200,
          warm_all: true,
          ms: Date.now() - started,
          institutions: ids,
          warmed,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            ...cors(),
          },
        },
      )
    }

    if (warm) {
      await warmInstitutionSummary(institutionId)
    } else if (ensure) {
      await ensureMetricsFromExistingCache(institutionId)
    }

    const probe = await readProbeBody(db, institutionId, started)
    return new Response(JSON.stringify(probe.body), {
      status: probe.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors() },
    })
  } catch (e) {
    return new Response(
      JSON.stringify({
        ok: false,
        status: 500,
        institution_id: institutionId,
        ms: Date.now() - started,
        error: e instanceof Error ? e.message : 'erro',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors() },
      },
    )
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
