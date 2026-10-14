import { auth } from './firebase'

function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim()
  if (raw) return raw.replace(/\/+$/, '')
  return window.location.origin
}

async function masterAuthHeaders(): Promise<HeadersInit> {
  if (!auth?.currentUser) {
    throw new Error('Faça login como Master para continuar.')
  }
  const token = await auth.currentUser.getIdToken()
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export type StudentPasswordRow = {
  id: string
  name: string
  phone_number: string
  institution_id: string
  active: boolean
  password: string | null
  has_password_hash: boolean
  has_password_encrypted: boolean
}

export async function fetchStudentPasswords(
  institutionId: string,
): Promise<StudentPasswordRow[]> {
  const url = new URL('/api/student_passwords', resolveApiBaseUrl())
  url.searchParams.set('institution_id', institutionId)
  url.searchParams.set('action', 'list')
  const res = await fetch(url.toString(), {
    headers: await masterAuthHeaders(),
  })
  if (!res.ok) {
    let message = `Falha ao listar senhas (HTTP ${res.status}).`
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  const body = (await res.json()) as { students?: StudentPasswordRow[] }
  return Array.isArray(body.students) ? body.students : []
}

export async function exportStudentPasswordsCsv(
  institutionId: string,
  schoolName?: string,
): Promise<Blob> {
  const url = new URL('/api/student_passwords', resolveApiBaseUrl())
  url.searchParams.set('institution_id', institutionId)
  url.searchParams.set('action', 'export_csv')
  if (schoolName) url.searchParams.set('school_name', schoolName)
  const res = await fetch(url.toString(), {
    headers: await masterAuthHeaders(),
  })
  if (!res.ok) {
    throw new Error(`Falha ao exportar CSV (HTTP ${res.status}).`)
  }
  return res.blob()
}

export async function regenerateStudentPassword(
  studentId: string,
): Promise<{ id: string; password: string; name: string; phone_number: string }> {
  const url = new URL('/api/student_passwords', resolveApiBaseUrl())
  url.searchParams.set('action', 'regenerate')
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: await masterAuthHeaders(),
    body: JSON.stringify({ student_id: studentId }),
  })
  if (!res.ok) {
    let message = `Falha ao regenerar senha (HTTP ${res.status}).`
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  return (await res.json()) as {
    id: string
    password: string
    name: string
    phone_number: string
  }
}

export type ImportPasswordsResult = {
  ok: boolean
  created: number
  updated: number
  errors: Array<{ line: number; nome?: string; celular?: string; error: string }>
  generated: Array<{
    id: string
    school: string
    name: string
    phone_number: string
    password: string
  }>
  generated_csv: string
}

export type BulkGeneratePasswordsResult = {
  dry_run: boolean
  scanned: number
  would_update: number
  updated: number
  skipped_existing: number
  remaining: number
  next_cursor: string | null
  done: boolean
  rows: Array<{
    id: string
    school: string
    name: string
    phone_number: string
    password: string
    action: 'create' | 'overwrite' | 'skip'
  }>
}

/** Conta alunos sem senha na escola (dry-run; não grava). */
export async function countMissingStudentPasswords(
  institutionId: string,
): Promise<BulkGeneratePasswordsResult> {
  return bulkGenerateStudentPasswords({
    institutionId,
    dryRun: true,
  })
}

/**
 * Gera senhas só para quem ainda não tem (nunca sobrescreve).
 * Use `cursor`/`limit` em loop até `done` para escolas grandes (~1000).
 */
export async function bulkGenerateStudentPasswords(opts: {
  institutionId: string
  dryRun?: boolean
  limit?: number
  cursor?: string | null
}): Promise<BulkGeneratePasswordsResult> {
  const url = new URL('/api/student_passwords', resolveApiBaseUrl())
  url.searchParams.set('action', 'bulk_generate')
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: await masterAuthHeaders(),
    body: JSON.stringify({
      institution_id: opts.institutionId,
      dry_run: Boolean(opts.dryRun),
      force: false,
      limit: opts.limit,
      cursor: opts.cursor ?? null,
    }),
  })
  if (!res.ok) {
    let message = `Falha ao gerar senhas em lote (HTTP ${res.status}).`
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  return (await res.json()) as BulkGeneratePasswordsResult
}

export async function importStudentsCsv(
  csv: string,
): Promise<ImportPasswordsResult> {
  const url = new URL('/api/student_passwords', resolveApiBaseUrl())
  url.searchParams.set('action', 'import_csv')
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: await masterAuthHeaders(),
    body: JSON.stringify({ csv }),
  })
  if (!res.ok) {
    let message = `Falha no import (HTTP ${res.status}).`
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  return (await res.json()) as ImportPasswordsResult
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
  URL.revokeObjectURL(href)
}

export function downloadBlob(filename: string, blob: Blob) {
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
  URL.revokeObjectURL(href)
}
