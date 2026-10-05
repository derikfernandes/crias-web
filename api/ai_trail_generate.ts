/**
 * POST /api/ai_trail_generate — gera rascunho de trilha via LLM (não grava no Firestore).
 * GET  /api/ai_trail_generate — devolve o prompt padrão.
 *
 * Body JSON:
 * {
 *   prompt?: string,
 *   files: [{ filename, mimeType, base64 }]
 * }
 */
import {
  generateAiTrail,
  getDefaultAiTrailPrompt,
  type UploadedDoc,
} from '../server/lib/ai-trail-generation/index.js'

export const config = {
  maxDuration: 300,
}

type Json = Record<string, unknown>

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function respond(status: number, body: Json): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(),
    },
  })
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  if (request.method === 'GET') {
    return respond(200, {
      defaultPrompt: getDefaultAiTrailPrompt(),
      limits: {
        maxFiles: 8,
        maxFileBytes: 4 * 1024 * 1024,
        maxTotalChars: 120_000,
        accepted: ['pdf', 'docx', 'txt', 'md'],
      },
    })
  }

  if (request.method !== 'POST') {
    return respond(405, { error: 'Método não permitido.' })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return respond(400, { error: 'JSON inválido.' })
  }

  if (!body || typeof body !== 'object') {
    return respond(400, { error: 'Body inválido.' })
  }

  const o = body as Record<string, unknown>
  const prompt = typeof o.prompt === 'string' ? o.prompt : undefined
  const rawFiles = o.files
  if (!Array.isArray(rawFiles) || rawFiles.length === 0) {
    return respond(400, {
      error: 'Envie files: [{ filename, mimeType, base64 }].',
    })
  }

  const files: UploadedDoc[] = []
  for (const item of rawFiles) {
    if (!item || typeof item !== 'object') {
      return respond(400, { error: 'Arquivo inválido na lista.' })
    }
    const f = item as Record<string, unknown>
    const filename = typeof f.filename === 'string' ? f.filename.trim() : ''
    const mimeType =
      typeof f.mimeType === 'string' ? f.mimeType : 'application/octet-stream'
    const base64 = typeof f.base64 === 'string' ? f.base64 : ''
    if (!filename || !base64) {
      return respond(400, {
        error: 'Cada arquivo precisa de filename e base64.',
      })
    }
    files.push({ filename, mimeType, base64 })
  }

  try {
    const result = await generateAiTrail({ files, prompt })
    if (!result.ok) {
      return respond(422, {
        ok: false,
        error: result.error ?? 'Falha na geração/validação.',
        issues: result.issues,
        model: result.model,
        repaired: result.repaired,
        truncatedSources: result.truncatedSources,
        totalSourceChars: result.totalSourceChars,
        trail: result.trail,
      })
    }
    return respond(200, {
      ok: true,
      model: result.model,
      repaired: result.repaired,
      truncatedSources: result.truncatedSources,
      totalSourceChars: result.totalSourceChars,
      trail: result.trail,
      draft: result.draft,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const status =
      /muito grande|não suportado|pelo menos|máximo|insuficiente|vazio/i.test(
        message,
      )
        ? 400
        : 500
    return respond(status, { ok: false, error: message })
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

  const init: RequestInit = { method, headers }
  if (!['GET', 'HEAD'].includes(method.toUpperCase())) {
    const body = req?.body
    if (body !== undefined && body !== null) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body)
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json; charset=utf-8')
      }
    }
  }

  const response = await handleRequest(new Request(url.toString(), init))
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    try {
      res.setHeader(key, value)
    } catch {
      // ignore
    }
  })
  const ab = await response.arrayBuffer()
  res.end(Buffer.from(ab))
}
