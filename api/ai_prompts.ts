/**
 * Master-only: listar/editar prompts de IA (Firestore ai_prompts).
 * Autenticação: Bearer Firebase ID token + papel Master.
 */
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

import {
  getAiPrompt,
  listAiPromptVersions,
  listAiPrompts,
  restoreAiPromptDefault,
  seedAiPrompts,
  updateAiPrompt,
} from '../server/lib/ai-prompts/index.js'
import { requireMasterFromRequest } from '../server/lib/masterAuth.js'

type Json = Record<string, unknown>

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
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
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  let db: ReturnType<typeof getFirestore>
  try {
    db = getDb()
  } catch (e) {
    return respond(500, {
      error: e instanceof Error ? e.message : 'Firebase Admin indisponível.',
    })
  }

  const master = await requireMasterFromRequest(
    db,
    request.headers.get('Authorization'),
  )
  if (!master.ok) {
    return respond(master.status, { error: master.error, code: master.code })
  }

  const url = new URL(request.url)
  const method = request.method.toUpperCase()
  const action = url.searchParams.get('action')?.trim() || ''
  const promptId = url.searchParams.get('id')?.trim() || ''

  if (method === 'GET') {
    if (action === 'versions') {
      if (!promptId) {
        return respond(400, {
          error: 'id é obrigatório.',
          code: 'invalid_payload',
        })
      }
      try {
        const versions = await listAiPromptVersions(db, promptId)
        return respond(200, { id: promptId, versions })
      } catch (e) {
        return respond(500, {
          error: e instanceof Error ? e.message : 'Falha ao listar versões.',
        })
      }
    }

    if (promptId) {
      try {
        const prompt = await getAiPrompt(db, promptId)
        if (!prompt) {
          return respond(404, { error: 'Prompt não encontrado.', code: 'not_found' })
        }
        return respond(200, { prompt })
      } catch (e) {
        return respond(500, {
          error: e instanceof Error ? e.message : 'Falha ao carregar prompt.',
        })
      }
    }

    try {
      const prompts = await listAiPrompts(db)
      return respond(200, { prompts })
    } catch (e) {
      return respond(500, {
        error: e instanceof Error ? e.message : 'Falha ao listar prompts.',
      })
    }
  }

  if (method === 'POST' && action === 'seed') {
    let force = false
    try {
      const body = (await request.json()) as { force?: unknown }
      force = body?.force === true
    } catch {
      // body opcional
    }
    try {
      const result = await seedAiPrompts(db, master.principal, { force })
      return respond(200, { ok: true, ...result })
    } catch (e) {
      return respond(500, {
        error: e instanceof Error ? e.message : 'Falha no seed.',
      })
    }
  }

  // Master aplica o padrão do sistema (texto do código) num prompt: nova versão + auditoria.
  if (method === 'POST' && action === 'restore_default') {
    let id = promptId
    try {
      const b = (await request.json()) as { id?: unknown }
      if (typeof b?.id === 'string' && b.id.trim()) id = b.id.trim()
    } catch {
      // body opcional (id pode vir na query)
    }
    if (!id) {
      return respond(400, { error: 'id é obrigatório.', code: 'invalid_payload' })
    }
    try {
      const prompt = await restoreAiPromptDefault(db, id, master.principal, process.env)
      return respond(200, { ok: true, prompt })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao aplicar o padrão.'
      const status = /inválido/i.test(msg) ? 400 : 500
      return respond(status, { error: msg })
    }
  }

  if (method === 'PUT' || (method === 'POST' && action === 'update')) {
    let body: { id?: unknown; body?: unknown; note?: unknown }
    try {
      body = (await request.json()) as typeof body
    } catch {
      return respond(400, { error: 'JSON inválido.', code: 'invalid_payload' })
    }
    const id =
      (typeof body.id === 'string' ? body.id.trim() : '') || promptId
    const text = typeof body.body === 'string' ? body.body : ''
    const note = typeof body.note === 'string' ? body.note : undefined
    if (!id) {
      return respond(400, { error: 'id é obrigatório.', code: 'invalid_payload' })
    }
    try {
      const prompt = await updateAiPrompt(
        db,
        id,
        text,
        master.principal,
        process.env,
        note,
      )
      return respond(200, { ok: true, prompt })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao salvar prompt.'
      const status = /inválido|vazio/i.test(msg) ? 400 : 500
      return respond(status, { error: msg })
    }
  }

  return respond(405, { error: 'Método não permitido.' })
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
