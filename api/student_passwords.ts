/**
 * Master-only: listar/exportar/regenerar/importar senhas de alunos.
 * Autenticação: Bearer Firebase ID token + papel Master
 * (MASTER_ADMIN_EMAILS ou admin_users.is_master).
 */
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

import { requireMasterFromRequest } from '../server/lib/masterAuth.js'
import { writeStudentPasswordAudit } from '../server/lib/studentPasswordAudit.js'
import {
  bulkGenerateMissingPasswords,
  bulkImportStudents,
  listStudentsWithPasswords,
  regenerateStudentPassword,
  studentsToCsv,
} from '../server/lib/studentPasswordService.js'

type Json = Record<string, unknown>

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function respond(
  status: number,
  body: Json | string,
  extra?: HeadersInit,
): Response {
  const isString = typeof body === 'string'
  return new Response(isString ? body : JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': isString
        ? 'text/csv; charset=utf-8'
        : 'application/json; charset=utf-8',
      ...corsHeaders(),
      ...(extra ?? {}),
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

  if (method === 'GET') {
    const action = url.searchParams.get('action')?.trim() || 'list'
    const institutionId = url.searchParams.get('institution_id')?.trim() || ''

    if (!institutionId) {
      return respond(400, {
        error: 'institution_id é obrigatório.',
        code: 'invalid_payload',
      })
    }

    try {
      const { getStudentPasswordKey } = await import(
        '../server/lib/studentPassword.js'
      )
      try {
        getStudentPasswordKey()
      } catch (e) {
        return respond(500, {
          error:
            e instanceof Error
              ? e.message
              : 'STUDENT_PASSWORD_KEY ausente ou inválida.',
          code: 'misconfigured',
        })
      }

      const rows = await listStudentsWithPasswords(db, institutionId)

      if (action === 'export_csv') {
        await writeStudentPasswordAudit(db, {
          actor_email: master.principal.email,
          actor_uid: master.principal.uid,
          action: 'export_csv',
          institution_id: institutionId,
          student_ids: rows.map((r) => r.id),
        })
        const schoolName =
          url.searchParams.get('school_name')?.trim() || institutionId
        const csv = studentsToCsv(
          rows.map((r) => ({
            name: r.name,
            phone_number: r.phone_number,
            password: r.password,
          })),
          schoolName,
        )
        return respond(200, csv, {
          'Content-Disposition': `attachment; filename="senhas-${institutionId}.csv"`,
        })
      }

      await writeStudentPasswordAudit(db, {
        actor_email: master.principal.email,
        actor_uid: master.principal.uid,
        action: 'view_list',
        institution_id: institutionId,
        student_ids: rows.map((r) => r.id),
        meta: { count: rows.length },
      })

      return respond(200, {
        institution_id: institutionId,
        students: rows,
      })
    } catch (e) {
      return respond(500, {
        error: e instanceof Error ? e.message : 'Erro ao listar senhas.',
      })
    }
  }

  if (method === 'POST') {
    const action = url.searchParams.get('action')?.trim() || ''

    let payload: unknown = null
    const contentType = request.headers.get('content-type') || ''
    try {
      if (
        contentType.includes('text/csv') ||
        contentType.includes('text/plain')
      ) {
        payload = { csv: await request.text() }
      } else if (action === 'import_csv') {
        const text = await request.text()
        try {
          payload = JSON.parse(text)
        } catch {
          payload = { csv: text }
        }
      } else {
        payload = await request.json()
      }
    } catch {
      return respond(400, {
        error: 'Payload inválido.',
        code: 'invalid_payload',
      })
    }

    const body =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : {}

    try {
      if (action === 'regenerate') {
        const studentId =
          (typeof body.student_id === 'string' && body.student_id.trim()) ||
          url.searchParams.get('student_id')?.trim() ||
          ''
        if (!studentId) {
          return respond(400, {
            error: 'student_id é obrigatório.',
            code: 'invalid_payload',
          })
        }
        const result = await regenerateStudentPassword(
          db,
          studentId,
          master.principal,
        )
        return respond(200, { ok: true, ...result })
      }

      if (action === 'bulk_generate') {
        const institutionId =
          (typeof body.institution_id === 'string' &&
            body.institution_id.trim()) ||
          url.searchParams.get('institution_id')?.trim() ||
          null
        if (!institutionId) {
          return respond(400, {
            error:
              'institution_id é obrigatório para gerar senhas em lote da escola.',
            code: 'invalid_payload',
          })
        }
        const dryRun = body.dry_run === true || body.dryRun === true
        // Master UI nunca sobrescreve; force só via script/admin explícito.
        const force = body.force === true
        const limitRaw =
          typeof body.limit === 'number'
            ? body.limit
            : typeof body.limit === 'string'
              ? Number(body.limit)
              : undefined
        const cursor =
          (typeof body.cursor === 'string' && body.cursor.trim()) ||
          url.searchParams.get('cursor')?.trim() ||
          null
        const result = await bulkGenerateMissingPasswords(db, {
          institutionId,
          dryRun,
          force,
          limit: Number.isFinite(limitRaw) ? limitRaw : undefined,
          cursor,
          actor: master.principal,
        })
        if (
          body.format === 'csv' ||
          url.searchParams.get('format') === 'csv'
        ) {
          const csv = studentsToCsv(
            result.rows.map((r) => ({
              school: r.school,
              name: r.name,
              phone_number: r.phone_number,
              password: r.password,
            })),
          )
          return respond(200, csv, {
            'Content-Disposition': 'attachment; filename="senhas-geradas.csv"',
            'X-Dry-Run': dryRun ? '1' : '0',
            'X-Updated': String(result.updated),
            'X-Done': result.done ? '1' : '0',
          })
        }
        return respond(200, result)
      }

      if (action === 'import_csv') {
        const csv =
          typeof body.csv === 'string'
            ? body.csv
            : typeof body.text === 'string'
              ? body.text
              : ''
        if (!csv.trim()) {
          return respond(400, {
            error: 'Campo "csv" obrigatório.',
            code: 'invalid_payload',
          })
        }
        const result = await bulkImportStudents(db, csv, master.principal)
        return respond(200, {
          ok: true,
          created: result.created,
          updated: result.updated,
          errors: result.errors,
          generated: result.generated,
          generated_csv: studentsToCsv(
            result.generated.map((g) => ({
              school: g.school,
              name: g.name,
              phone_number: g.phone_number,
              password: g.password,
            })),
          ),
        })
      }

      return respond(400, {
        error:
          'action inválida. Use regenerate | bulk_generate | import_csv (POST) ou list | export_csv (GET).',
        code: 'invalid_payload',
      })
    } catch (e) {
      const httpStatus =
        e && typeof e === 'object' && 'httpStatus' in e
          ? Number((e as { httpStatus: number }).httpStatus)
          : 500
      return respond(Number.isFinite(httpStatus) ? httpStatus : 500, {
        error: e instanceof Error ? e.message : 'Erro interno.',
        code:
          e && typeof e === 'object' && 'code' in e
            ? String((e as { code: unknown }).code)
            : 'internal_error',
      })
    }
  }

  return respond(405, { error: `Método ${request.method} não permitido` })
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
