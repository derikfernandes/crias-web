import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

import {
  canAccessInstitution,
  filterInstitutionsByAccess,
  requireGestaoAdminFromRequest,
  type GestaoAdminPrincipal,
} from '../server/lib/gestaoAdminAuth'
import { gestaoCorsHeaders } from '../server/lib/gestaoCors'

type Json = Record<string, unknown>

function jsonResponse(
  body: Json | Json[] | string,
  init?: ResponseInit,
): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(init?.headers ?? {}),
    },
  })
}

function corsHeaders(request: Request): Record<string, string> {
  return gestaoCorsHeaders(request, 'GET,POST,PUT,DELETE,OPTIONS')
}

function serializeTs(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'object' && value && 'toDate' in value) {
    try {
      // firebase-admin Timestamp
      const d = (value as { toDate: () => Date }).toDate()
      return d.toISOString()
    } catch {
      return null
    }
  }
  return null
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
    initializeApp({
      credential: cert(serviceAccount),
    })
  }

  cachedDb = getFirestore()
  return cachedDb
}

function publicLinkFor(id: string): string {
  const origin =
    (process.env.PUBLIC_APP_ORIGIN ?? 'https://crias-trilhas.vercel.app')
      .trim()
      .replace(/\/$/, '')
  return `${origin}/instituicoes/${id}`
}

function sanitizeString(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s.length ? s : null
}

async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')?.trim()
    const simple = url.searchParams.get('simple') === '1'

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      })
    }

    let db: ReturnType<typeof getFirestore>
    try {
      db = getDb()
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'Erro ao inicializar Firebase Admin.'
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...corsHeaders(request),
        },
      })
    }

    const auth = await requireGestaoAdminFromRequest(
      db,
      request.headers.get('Authorization'),
    )
    if (!auth.ok) {
      return new Response(
        JSON.stringify({ error: auth.error, code: auth.code }),
        {
          status: auth.status,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            ...corsHeaders(request),
          },
        },
      )
    }
    const principal: GestaoAdminPrincipal = auth.principal

    const collection = process.env.INSTITUTIONS_COLLECTION ?? 'institutions'

    const respond = (status: number, body: Json): Response => {
      return new Response(JSON.stringify(body), {
        status,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...corsHeaders(request),
        },
      })
    }

    try {
      // GET /institution/
      // GET /institution/simple
      // GET /institution/:id
      if (request.method === 'GET') {
        if (id) {
          if (!canAccessInstitution(principal, id)) {
            return respond(403, {
              error: 'Sem permissão para esta instituição.',
              code: 'forbidden',
            })
          }
          const snap = await db.collection(collection).doc(id).get()
          if (!snap.exists) return respond(404, { error: 'Not found' })
          const data = snap.data() ?? {}
          return new Response(
            JSON.stringify({
              id: snap.id,
              name: typeof data.name === 'string' ? data.name : '',
              type: typeof data.type === 'string' ? data.type : '',
              active: typeof data.active === 'boolean' ? data.active : false,
              created_at: serializeTs(data.created_at),
              updated_at: serializeTs(data.updated_at),
              public_link:
                typeof data.public_link === 'string'
                  ? data.public_link
                  : undefined,
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                ...corsHeaders(request),
              },
            },
          )
        }

        const q = db.collection(collection)
        // A UI ordena por updated_at (fallbacks no client). Aqui mantemos simple.
        const snap = await q.orderBy('updated_at', 'desc').get()

        const items = snap.docs.map((d) => {
          const data = d.data() ?? {}
          if (simple) {
            return {
              id: d.id,
              name: typeof data.name === 'string' ? data.name : '',
              type: typeof data.type === 'string' ? data.type : '',
            }
          }
          return {
            id: d.id,
            name: typeof data.name === 'string' ? data.name : '',
            type: typeof data.type === 'string' ? data.type : '',
            active: typeof data.active === 'boolean' ? data.active : false,
            created_at: serializeTs(data.created_at),
            updated_at: serializeTs(data.updated_at),
            public_link:
              typeof data.public_link === 'string' ? data.public_link : undefined,
          }
        })

        const scoped = filterInstitutionsByAccess(principal, items)

        return jsonResponse(scoped as Json[], {
          status: 200,
          headers: corsHeaders(request),
        })
      }

      // POST /institution/ — só quem vê todas (Master/super).
      if (request.method === 'POST') {
        if (principal.allowedInstitutionIds !== null) {
          return respond(403, {
            error: 'Sem permissão para criar instituição.',
            code: 'forbidden',
          })
        }
        if (id) return respond(400, { error: 'id não deve ser enviado em POST' })
        let payload: unknown
        try {
          payload = await request.json()
        } catch {
          return respond(400, { error: 'JSON inválido' })
        }
        if (!payload || typeof payload !== 'object') {
          return respond(400, { error: 'Payload inválido' })
        }

        const body = payload as Json
        const name = sanitizeString(body.name)
        const type = sanitizeString(body.type)
        if (!name) return respond(400, { error: 'Campo "name" é obrigatório' })
        if (!type) return respond(400, { error: 'Campo "type" é obrigatório' })

        const active =
          typeof body.active === 'boolean' ? body.active : true

        const optionalFields: Json = {}
        // Aceita campos extras do contrato da doc, se você enviar.
        for (const k of ['document', 'email', 'phone']) {
          const v = sanitizeString(body[k])
          if (v) optionalFields[k] = v
        }

        const now = FieldValue.serverTimestamp()

        // IDs sequenciais: i1, i2, i3...
        // Mantém um contador em counters/institutions { next: number } e incrementa via transação.
        const counterRef = db.collection('counters').doc('institutions')

        const newId = await db.runTransaction(async (tx) => {
          const counterSnap = await tx.get(counterRef)
          const counterData = counterSnap.data() ?? {}
          const rawNext = (counterData as { next?: unknown }).next

          const next =
            typeof rawNext === 'number' && Number.isFinite(rawNext) && rawNext >= 1
              ? Math.floor(rawNext)
              : 1

          const instId = `i${next}`
          const instRef = db.collection(collection).doc(instId)

          const existing = await tx.get(instRef)
          if (existing.exists) {
            throw new Error(
              `Conflito ao gerar id sequencial (${instId}). Verifique counters/institutions.next.`,
            )
          }

          const link = publicLinkFor(instId)
          tx.set(instRef, {
            name,
            type,
            active,
            created_at: now,
            updated_at: now,
            public_link: link,
            ...optionalFields,
          })

          tx.set(counterRef, { next: next + 1 }, { merge: true })

          return instId
        })

        const link = publicLinkFor(newId)

        return jsonResponse(
          {
            id: newId,
            name,
            type,
            active,
            created_at: null,
            updated_at: null,
            public_link: link,
            ...optionalFields,
          },
          { status: 201, headers: corsHeaders(request) },
        )
      }

      // PUT /institution/:id
      if (request.method === 'PUT') {
        if (!id) return respond(400, { error: 'id é obrigatório em PUT' })
        if (!canAccessInstitution(principal, id)) {
          return respond(403, {
            error: 'Sem permissão para esta instituição.',
            code: 'forbidden',
          })
        }

        let payload: unknown
        try {
          payload = await request.json()
        } catch {
          return respond(400, { error: 'JSON inválido' })
        }
        if (!payload || typeof payload !== 'object') {
          return respond(400, { error: 'Payload inválido' })
        }

        const body = payload as Json
        const updates: Json = {}

        const name = sanitizeString(body.name)
        if (name) updates.name = name
        const type = sanitizeString(body.type)
        if (type) updates.type = type
        if (typeof body.active === 'boolean') updates.active = body.active

        for (const k of ['document', 'email', 'phone']) {
          const v = sanitizeString(body[k])
          if (v) updates[k] = v
        }

        // Sempre mantém link consistente com o id.
        updates.public_link = publicLinkFor(id)
        updates.updated_at = FieldValue.serverTimestamp()

        const ref = db.collection(collection).doc(id)
        const snap = await ref.get()
        if (!snap.exists) return respond(404, { error: 'Not found' })

        await ref.update(updates)
        return jsonResponse(
          { ok: true, id },
          { status: 200, headers: corsHeaders(request) },
        )
      }

      // DELETE /institution/:id — só quem vê todas (Master/super).
      if (request.method === 'DELETE') {
        if (!id) return respond(400, { error: 'id é obrigatório em DELETE' })
        if (principal.allowedInstitutionIds !== null) {
          return respond(403, {
            error: 'Sem permissão para excluir instituição.',
            code: 'forbidden',
          })
        }

        const ref = db.collection(collection).doc(id)
        const snap = await ref.get()
        if (!snap.exists) return respond(404, { error: 'Not found' })
        await ref.delete()
        return new Response(null, {
          status: 204,
          headers: corsHeaders(request),
        })
      }

      return respond(405, { error: `Método ${request.method} não permitido` })
    } catch (e) {
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
      // ignora headers inválidos no ambiente serverless
    }
  })

  const ab = await response.arrayBuffer()
  res.end(Buffer.from(ab))
}

