import {
  FieldValue,
  type DocumentReference,
  type Firestore,
  type Query,
} from 'firebase-admin/firestore'

import {
  buildStudentPasswordFields,
  decryptStudentPassword,
} from './studentPassword.js'
import { writeStudentPasswordAudit } from './studentPasswordAudit.js'

export type StudentPasswordRow = {
  id: string
  name: string
  phone_number: string
  institution_id: string
  active: boolean
  /** Plaintext só quando ciphertext existe e chave ok; senão null. */
  password: string | null
  has_password_hash: boolean
  has_password_encrypted: boolean
}

function digitsOnly(v: string): string {
  return v.replace(/\D/g, '')
}

function phoneFromData(data: Record<string, unknown>): string {
  if (typeof data.phone_number === 'string') {
    return digitsOnly(data.phone_number)
  }
  if (typeof data.phone_number === 'number') {
    return digitsOnly(String(data.phone_number))
  }
  return ''
}

export async function listStudentsWithPasswords(
  db: Firestore,
  institutionId: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<StudentPasswordRow[]> {
  const collection = env.STUDENTS_COLLECTION?.trim() || 'students'
  const snap = await db
    .collection(collection)
    .where('institution_id', '==', institutionId)
    .get()

  const rows: StudentPasswordRow[] = []
  for (const doc of snap.docs) {
    const data = (doc.data() ?? {}) as Record<string, unknown>
    const encrypted =
      typeof data.password_encrypted === 'string'
        ? data.password_encrypted
        : null
    const hash =
      typeof data.password_hash === 'string' ? data.password_hash : null
    let password: string | null = null
    if (encrypted) {
      password = decryptStudentPassword(encrypted, env)
    }
    rows.push({
      id: doc.id,
      name: typeof data.name === 'string' ? data.name : '',
      phone_number: phoneFromData(data),
      institution_id:
        typeof data.institution_id === 'string' ? data.institution_id : '',
      active: typeof data.active === 'boolean' ? data.active : false,
      password,
      has_password_hash: Boolean(hash),
      has_password_encrypted: Boolean(encrypted),
    })
  }

  rows.sort((a, b) =>
    (a.name || a.id).localeCompare(b.name || b.id, 'pt-BR', {
      sensitivity: 'base',
    }),
  )
  return rows
}

export function studentsToCsv(
  rows: Array<{
    school?: string
    name: string
    phone_number: string
    password: string | null
  }>,
  schoolName?: string,
): string {
  const header = 'escola,nome,celular,senha'
  const escape = (v: string) => {
    if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`
    return v
  }
  const lines = [header]
  for (const row of rows) {
    const school = row.school ?? schoolName ?? ''
    lines.push(
      [
        escape(school),
        escape(row.name),
        escape(row.phone_number),
        escape(row.password ?? ''),
      ].join(','),
    )
  }
  return lines.join('\n') + '\n'
}

export async function regenerateStudentPassword(
  db: Firestore,
  studentId: string,
  actor: { email: string; uid: string },
  env: NodeJS.ProcessEnv = process.env,
): Promise<{
  id: string
  password: string
  institution_id: string
  name: string
  phone_number: string
}> {
  const collection = env.STUDENTS_COLLECTION?.trim() || 'students'
  const ref = db.collection(collection).doc(studentId)
  const snap = await ref.get()
  if (!snap.exists) {
    throw Object.assign(new Error('Aluno não encontrado.'), {
      httpStatus: 404,
      code: 'not_found',
    })
  }
  const data = (snap.data() ?? {}) as Record<string, unknown>
  const fields = buildStudentPasswordFields(null, env, {
    generateIfEmpty: true,
    requireEncryption: true,
  })
  if (!fields.password_encrypted) {
    throw Object.assign(
      new Error('STUDENT_PASSWORD_KEY ausente — impossível cifrar senha.'),
      { httpStatus: 500, code: 'internal_error' },
    )
  }
  await ref.update({
    password_hash: fields.password_hash,
    password_encrypted: fields.password_encrypted,
    updated_at: FieldValue.serverTimestamp(),
  })
  await writeStudentPasswordAudit(db, {
    actor_email: actor.email,
    actor_uid: actor.uid,
    action: 'regenerate',
    institution_id:
      typeof data.institution_id === 'string' ? data.institution_id : null,
    student_id: studentId,
  }, env)

  return {
    id: studentId,
    password: fields.password_plain,
    institution_id:
      typeof data.institution_id === 'string' ? data.institution_id : '',
    name: typeof data.name === 'string' ? data.name : '',
    phone_number: phoneFromData(data),
  }
}

export type BulkGenerateOptions = {
  institutionId?: string | null
  /** Se true, sobrescreve quem já tem password_hash. */
  force?: boolean
  dryRun?: boolean
  actor?: { email: string; uid: string } | null
}

export type BulkGenerateResult = {
  dry_run: boolean
  scanned: number
  would_update: number
  updated: number
  skipped_existing: number
  rows: Array<{
    id: string
    school: string
    name: string
    phone_number: string
    password: string
    action: 'create' | 'overwrite' | 'skip'
  }>
}

export async function bulkGenerateMissingPasswords(
  db: Firestore,
  opts: BulkGenerateOptions,
  env: NodeJS.ProcessEnv = process.env,
): Promise<BulkGenerateResult> {
  const collection = env.STUDENTS_COLLECTION?.trim() || 'students'
  const institutionsCollection =
    env.INSTITUTIONS_COLLECTION?.trim() || 'institutions'

  let query: Query = db.collection(collection)
  if (opts.institutionId) {
    query = query.where('institution_id', '==', opts.institutionId)
  }
  const snap = await query.get()

  const schoolNameById = new Map<string, string>()
  const result: BulkGenerateResult = {
    dry_run: Boolean(opts.dryRun),
    scanned: snap.size,
    would_update: 0,
    updated: 0,
    skipped_existing: 0,
    rows: [],
  }

  const batchWrites: Array<{
    ref: DocumentReference
    fields: ReturnType<typeof buildStudentPasswordFields>
    row: BulkGenerateResult['rows'][number]
  }> = []

  for (const doc of snap.docs) {
    const data = (doc.data() ?? {}) as Record<string, unknown>
    const hasHash =
      typeof data.password_hash === 'string' && data.password_hash.length > 0
    if (hasHash && !opts.force) {
      result.skipped_existing += 1
      continue
    }

    const institutionId =
      typeof data.institution_id === 'string' ? data.institution_id : ''
    if (institutionId && !schoolNameById.has(institutionId)) {
      try {
        const inst = await db
          .collection(institutionsCollection)
          .doc(institutionId)
          .get()
        const name =
          typeof inst.data()?.name === 'string'
            ? (inst.data()!.name as string)
            : institutionId
        schoolNameById.set(institutionId, name)
      } catch {
        schoolNameById.set(institutionId, institutionId)
      }
    }

    const fields = buildStudentPasswordFields(null, env, {
      generateIfEmpty: true,
      requireEncryption: true,
    })
    if (!fields.password_encrypted) {
      throw new Error('STUDENT_PASSWORD_KEY ausente — impossível cifrar senha.')
    }
    const action = hasHash ? 'overwrite' : 'create'
    const row = {
      id: doc.id,
      school: schoolNameById.get(institutionId) ?? institutionId,
      name: typeof data.name === 'string' ? data.name : '',
      phone_number: phoneFromData(data),
      password: fields.password_plain,
      action,
    }
    result.would_update += 1
    result.rows.push(row)

    if (!opts.dryRun) {
      batchWrites.push({ ref: doc.ref, fields, row })
    }
  }

  if (!opts.dryRun && batchWrites.length > 0) {
    // Firestore batch limit 500
    const CHUNK = 400
    for (let i = 0; i < batchWrites.length; i += CHUNK) {
      const chunk = batchWrites.slice(i, i + CHUNK)
      const batch = db.batch()
      for (const item of chunk) {
        batch.update(item.ref, {
          password_hash: item.fields.password_hash,
          password_encrypted: item.fields.password_encrypted!,
          updated_at: FieldValue.serverTimestamp(),
        })
      }
      await batch.commit()
      result.updated += chunk.length
    }

    if (opts.actor) {
      await writeStudentPasswordAudit(db, {
        actor_email: opts.actor.email,
        actor_uid: opts.actor.uid,
        action: 'bulk_generate',
        institution_id: opts.institutionId ?? null,
        student_ids: result.rows.map((r) => r.id),
        meta: {
          force: Boolean(opts.force),
          updated: result.updated,
          skipped_existing: result.skipped_existing,
        },
      }, env)
    }
  }

  return result
}

export type ImportCsvRow = {
  nome: string
  celular: string
  escola: string
  trilha?: string
  senha?: string
}

export type ImportError = {
  line: number
  nome?: string
  celular?: string
  error: string
}

export type BulkImportResult = {
  created: number
  updated: number
  errors: ImportError[]
  generated: Array<{
    id: string
    school: string
    name: string
    phone_number: string
    password: string
  }>
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      out.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur.trim())
  return out
}

export function parseStudentImportCsv(text: string): {
  rows: ImportCsvRow[]
  headerErrors: string[]
} {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length === 0) {
    return { rows: [], headerErrors: ['CSV vazio.'] }
  }
  const header = parseCsvLine(lines[0]!).map((h) => h.toLowerCase())
  const idx = {
    nome: header.findIndex((h) => h === 'nome' || h === 'name'),
    celular: header.findIndex(
      (h) => h === 'celular' || h === 'telefone' || h === 'phone' || h === 'phone_number',
    ),
    escola: header.findIndex(
      (h) => h === 'escola' || h === 'instituição' || h === 'instituicao' || h === 'institution',
    ),
    trilha: header.findIndex((h) => h === 'trilha' || h === 'trail'),
    senha: header.findIndex((h) => h === 'senha' || h === 'password'),
  }
  const headerErrors: string[] = []
  if (idx.nome < 0) headerErrors.push('Coluna "nome" obrigatória.')
  if (idx.celular < 0) headerErrors.push('Coluna "celular" obrigatória.')
  if (idx.escola < 0) headerErrors.push('Coluna "escola" obrigatória.')
  if (headerErrors.length) return { rows: [], headerErrors }

  const rows: ImportCsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]!)
    rows.push({
      nome: cols[idx.nome] ?? '',
      celular: cols[idx.celular] ?? '',
      escola: cols[idx.escola] ?? '',
      trilha: idx.trilha >= 0 ? cols[idx.trilha] : undefined,
      senha: idx.senha >= 0 ? cols[idx.senha] : undefined,
    })
  }
  return { rows, headerErrors: [] }
}

async function resolveInstitutionId(
  db: Firestore,
  escola: string,
  cache: Map<string, string | null>,
  env: NodeJS.ProcessEnv,
): Promise<string | null> {
  const key = escola.trim().toLowerCase()
  if (cache.has(key)) return cache.get(key) ?? null
  const collection = env.INSTITUTIONS_COLLECTION?.trim() || 'institutions'
  // Match by id exact or name case-insensitive.
  const byId = await db.collection(collection).doc(escola.trim()).get()
  if (byId.exists) {
    cache.set(key, byId.id)
    return byId.id
  }
  const all = await db.collection(collection).get()
  for (const doc of all.docs) {
    const name = typeof doc.data()?.name === 'string' ? doc.data().name : ''
    if (name.trim().toLowerCase() === key) {
      cache.set(key, doc.id)
      return doc.id
    }
  }
  cache.set(key, null)
  return null
}

function isValidPhoneDigits(digits: string): boolean {
  // BR: 10–13 dígitos (com ou sem 55)
  return digits.length >= 10 && digits.length <= 13
}

export async function bulkImportStudents(
  db: Firestore,
  csvText: string,
  actor: { email: string; uid: string },
  env: NodeJS.ProcessEnv = process.env,
  opts?: {
    defaultSchoolLevel?: string
    defaultSchoolGrade?: string
  },
): Promise<BulkImportResult> {
  const { rows, headerErrors } = parseStudentImportCsv(csvText)
  const result: BulkImportResult = {
    created: 0,
    updated: 0,
    errors: [],
    generated: [],
  }
  if (headerErrors.length) {
    for (const error of headerErrors) {
      result.errors.push({ line: 1, error })
    }
    return result
  }

  const studentsCollection = env.STUDENTS_COLLECTION?.trim() || 'students'
  const schoolLevel = opts?.defaultSchoolLevel ?? 'fundamental'
  const schoolGrade = opts?.defaultSchoolGrade ?? '1º ano'
  const institutionCache = new Map<string, string | null>()
  const phoneSeenInFile = new Map<string, number>()

  for (let i = 0; i < rows.length; i++) {
    const line = i + 2 // 1-based + header
    const row = rows[i]!
    const nome = row.nome.trim()
    const phone = digitsOnly(row.celular)
    const escola = row.escola.trim()

    if (!nome) {
      result.errors.push({ line, celular: row.celular, error: 'Nome vazio.' })
      continue
    }
    if (!phone || !isValidPhoneDigits(phone)) {
      result.errors.push({
        line,
        nome,
        celular: row.celular,
        error: 'Celular inválido (use 10–13 dígitos).',
      })
      continue
    }
    if (!escola) {
      result.errors.push({
        line,
        nome,
        celular: phone,
        error: 'Escola vazia.',
      })
      continue
    }

    const prevLine = phoneSeenInFile.get(phone)
    if (prevLine !== undefined) {
      result.errors.push({
        line,
        nome,
        celular: phone,
        error: `Celular duplicado no CSV (já na linha ${prevLine}).`,
      })
      continue
    }
    phoneSeenInFile.set(phone, line)

    const institutionId = await resolveInstitutionId(
      db,
      escola,
      institutionCache,
      env,
    )
    if (!institutionId) {
      result.errors.push({
        line,
        nome,
        celular: phone,
        error: `Escola não encontrada: "${escola}".`,
      })
      continue
    }

    // Duplicate phone in same institution?
    const existingSnap = await db
      .collection(studentsCollection)
      .where('institution_id', '==', institutionId)
      .where('phone_number', '==', phone)
      .limit(1)
      .get()

    // Also try without country code variants — store as given digits.
    let existingDoc = existingSnap.docs[0] ?? null
    if (!existingDoc && phone.startsWith('55') && phone.length > 11) {
      const alt = phone.slice(2)
      const altSnap = await db
        .collection(studentsCollection)
        .where('institution_id', '==', institutionId)
        .where('phone_number', '==', alt)
        .limit(1)
        .get()
      existingDoc = altSnap.docs[0] ?? null
    }

    let plainPassword =
      typeof row.senha === 'string' && row.senha.trim()
        ? row.senha.trim()
        : ''
    const autoGenerated = !plainPassword
    let fields
    try {
      fields = buildStudentPasswordFields(plainPassword || null, env, {
        generateIfEmpty: true,
        requireEncryption: true,
      })
      if (!fields.password_encrypted) {
        throw new Error('STUDENT_PASSWORD_KEY ausente.')
      }
      plainPassword = fields.password_plain
    } catch (e) {
      result.errors.push({
        line,
        nome,
        celular: phone,
        error: e instanceof Error ? e.message : 'Senha inválida.',
      })
      continue
    }

    if (existingDoc) {
      await existingDoc.ref.update({
        name: nome,
        password_hash: fields.password_hash,
        password_encrypted: fields.password_encrypted!,
        active: true,
        updated_at: FieldValue.serverTimestamp(),
      })
      result.updated += 1
      if (autoGenerated) {
        result.generated.push({
          id: existingDoc.id,
          school: escola,
          name: nome,
          phone_number: phone,
          password: plainPassword,
        })
      }
    } else {
      const counterRef = db.collection('counters').doc('students')
      const newId = await db.runTransaction(async (tx) => {
        const counterSnap = await tx.get(counterRef)
        const counterData = counterSnap.data() ?? {}
        const rawNext = (counterData as { next?: unknown }).next
        const next =
          typeof rawNext === 'number' && Number.isFinite(rawNext) && rawNext >= 1
            ? Math.floor(rawNext)
            : 1
        const studentId = `s${next}`
        const studentRef = db.collection(studentsCollection).doc(studentId)
        const existing = await tx.get(studentRef)
        if (existing.exists) {
          throw new Error(
            `Conflito ao gerar id sequencial (${studentId}).`,
          )
        }
        tx.set(studentRef, {
          institution_id: institutionId,
          name: nome,
          phone_number: phone,
          school_level: schoolLevel,
          school_grade: schoolGrade,
          student_level: 2,
          active: true,
          password_hash: fields.password_hash,
          password_encrypted: fields.password_encrypted!,
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        })
        tx.set(counterRef, { next: next + 1 }, { merge: true })
        return studentId
      })
      result.created += 1
      if (autoGenerated) {
        result.generated.push({
          id: newId,
          school: escola,
          name: nome,
          phone_number: phone,
          password: plainPassword,
        })
      }
    }
  }

  await writeStudentPasswordAudit(db, {
    actor_email: actor.email,
    actor_uid: actor.uid,
    action: 'bulk_import',
    student_ids: result.generated.map((g) => g.id),
    meta: {
      created: result.created,
      updated: result.updated,
      errors: result.errors.length,
      generated_count: result.generated.length,
    },
  }, env)

  return result
}
