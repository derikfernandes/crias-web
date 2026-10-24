/**
 * Probe Admin SDK do cache de métricas (sem token de usuário).
 * Preview: aberto (só campos técnicos + KPIs agregados, sem alunos).
 * Production: CRON_SECRET / x-vercel-cron.
 *
 * GET /api/dashboard_metrics_probe?institution_id=i2
 * GET /api/dashboard_metrics_probe?institution_id=i2&ensure=1  (DERIVED se faltar)
 */
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

import {
  ensureMetricsFromExistingCache,
  readMetricsFromCache,
} from './dashboard_summary'

export const config = {
  maxDuration: 60,
}

const CACHE_COLLECTION = 'gestao_dashboard_cache'

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
  const institutionId =
    url.searchParams.get('institution_id')?.trim() || 'i2'
  const ensure = url.searchParams.get('ensure') === '1'
  const started = Date.now()

  try {
    const db = getDb()
    if (ensure) {
      await ensureMetricsFromExistingCache(institutionId)
    }
    const fresh = await readMetricsFromCache(db, institutionId, {
      allowStale: true,
    })
    const metaSnap = await db
      .collection(CACHE_COLLECTION)
      .doc(institutionId)
      .get()
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
      return new Response(
        JSON.stringify({
          ok: false,
          status: 404,
          institution_id: institutionId,
          ms: Date.now() - started,
          meta_bytes: metaBytes,
          sidecar_bytes: sidecarBytes,
          error: 'metrics ausente no cache',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors() },
        },
      )
    }

    const m = fresh.metrics
    return new Response(
      JSON.stringify({
        ok: true,
        status: 200,
        institution_id: institutionId,
        ms: Date.now() - started,
        meta_bytes: metaBytes,
        sidecar_bytes: sidecarBytes,
        stale: fresh.stale,
        computed_at: m.computed_at,
        avg_accuracy: m.avg_accuracy,
        avg_lesson_completion: m.avg_lesson_completion,
        exercise_count: m.exercise_count,
        active_students: m.active_students,
        accuracy_tried: m.accuracy_tried,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors() },
      },
    )
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
