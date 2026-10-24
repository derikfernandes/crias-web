/**
 * Aquecimento / regeneração do `gestao_dashboard_cache`.
 * Cron Vercel (`x-vercel-cron: 1`) ou `Authorization: Bearer $CRON_SECRET`.
 * Só escreve a collection derivada — não altera dados de alunos.
 *
 * GET /api/dashboard_summary_warm
 * GET /api/dashboard_summary_warm?institution_ids=i1,i2,i4
 */
import { warmInstitutionSummary } from './dashboard_summary'

export const config = {
  maxDuration: 60,
}

function cors(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
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

  const secret = process.env.CRON_SECRET?.trim()
  const auth = request.headers.get('Authorization') ?? ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const vercelCron = request.headers.get('x-vercel-cron') === '1'
  if (!vercelCron && (!secret || bearer !== secret)) {
    return new Response(
      JSON.stringify({ error: 'Não autorizado', code: 'unauthorized' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...cors() },
      },
    )
  }

  const url = new URL(request.url)
  const single = url.searchParams.get('institution_id')?.trim()
  const multi = url.searchParams.get('institution_ids')?.trim()
  const ids = [
    ...(single ? [single] : []),
    ...(multi
      ? multi
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []),
  ]
  const unique = [...new Set(ids)]
  // Default: Sol (maior) — 1º acesso do dia das escolas.
  if (unique.length === 0) unique.push('i2')

  const results: Record<string, string> = {}
  for (const id of unique) {
    try {
      await warmInstitutionSummary(id)
      results[id] = 'ok'
    } catch (e) {
      results[id] = e instanceof Error ? e.message : 'erro'
    }
  }

  return new Response(JSON.stringify({ warmed: results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors() },
  })
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
