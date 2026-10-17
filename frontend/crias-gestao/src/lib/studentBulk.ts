import { doc, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import { STUDENTS_COLLECTION } from './studentFirestore'
import { STUDENT_TRAILS_COLLECTION, studentTrailDocId } from './studentTrailFirestore'
import { updateStudentPassword } from './studentApi'
import { parseYesNo, pick, type Row } from './tableFiles'
import { stripPhoneDigits, toCanonicalPhone } from './trilha/phoneNormalize'
import type { Student } from '../types/student'
import type { Trail } from '../types/trail'

/**
 * Alunos em massa (INTERFACE.md 1.1.6, 1.1.7 e orientação 7).
 * Cadastrar: sempre grava na base. Remover: tira o acesso e mantém o histórico (active=false).
 */

const BATCH_LIMIT = 400

export type NewStudentRow = {
  line: number
  name: string
  phone: string
  password: string
  trailName: string
}

export type BulkError = { line: number; name?: string; phone?: string; error: string }

export type AddParse = { rows: NewStudentRow[]; errors: BulkError[] }

export const ADD_COLUMNS = ['Nome', 'celular', 'senha', 'trilha']
export const REMOVE_COLUMNS = ['Nome', 'celular', 'remover']

export function phoneKey(value: string): string {
  const c = toCanonicalPhone(value)
  const digits = c.ok ? c.canonical : stripPhoneDigits(value)
  return digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits
}

/** Lê a planilha de cadastro: Nome, celular, senha (opcional), trilha (opcional). */
export function parseAddRows(
  rows: Row[],
  existing: Student[],
  trails: Trail[],
): AddParse {
  const errors: BulkError[] = []
  const out: NewStudentRow[] = []
  const known = new Set(existing.map((s) => phoneKey(s.phone_number)))
  const trailNames = new Set(trails.map((t) => t.name.trim().toLowerCase()))
  const seen = new Set<string>()
  rows.forEach((row, i) => {
    const line = i + 2
    const name = pick(row, 'nome', 'name')
    const phoneRaw = pick(row, 'celular', 'telefone', 'phone')
    const password = pick(row, 'senha', 'password')
    const trailName = pick(row, 'trilha', 'trail')
    if (!name && !phoneRaw && !password && !trailName) return
    if (!name) {
      errors.push({ line, phone: phoneRaw, error: 'Nome obrigatório.' })
      return
    }
    const parsed = toCanonicalPhone(phoneRaw)
    if (!parsed.ok) {
      errors.push({ line, name, phone: phoneRaw, error: 'Celular inválido (use DDD + número).' })
      return
    }
    const key = phoneKey(phoneRaw)
    if (known.has(key) || seen.has(key)) {
      errors.push({ line, name, phone: phoneRaw, error: 'Celular já cadastrado.' })
      return
    }
    if (password && password.length < 6) {
      errors.push({ line, name, phone: phoneRaw, error: 'A senha precisa de pelo menos 6 caracteres.' })
      return
    }
    if (trailName && !trailNames.has(trailName.toLowerCase())) {
      errors.push({ line, name, phone: phoneRaw, error: `Trilha "${trailName}" não existe nesta instituição.` })
      return
    }
    seen.add(key)
    out.push({ line, name, phone: parsed.canonical, password, trailName })
  })
  return { rows: out, errors }
}

export type AddResult = { added: number; withPassword: number; linked: number; errors: BulkError[] }

/**
 * Cria os alunos na base com ids sequenciais (s1, s2...). O contador é reservado uma vez
 * para o lote inteiro e os documentos entram em lotes de 400.
 */
export async function addStudentsBulk(input: {
  institutionId: string
  rows: NewStudentRow[]
  trails: Trail[]
}): Promise<AddResult> {
  if (!db) throw new Error('Firebase não inicializado.')
  const dbOk = db
  const { rows } = input
  if (rows.length === 0) return { added: 0, withPassword: 0, linked: 0, errors: [] }

  const first = await runTransaction(dbOk, async (tx) => {
    const ref = doc(dbOk, 'counters', 'students')
    const snap = await tx.get(ref)
    const raw = (snap.exists() ? (snap.data() as { next?: unknown }).next : 1) as unknown
    const next = typeof raw === 'number' && Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1
    tx.set(ref, { next: next + rows.length }, { merge: true })
    return next
  })

  const trailByName = new Map(input.trails.map((t) => [t.name.trim().toLowerCase(), t]))
  const created: Array<{ id: string; row: NewStudentRow }> = []
  let linked = 0
  for (let start = 0; start < rows.length; start += BATCH_LIMIT / 2) {
    const batch = writeBatch(dbOk)
    rows.slice(start, start + BATCH_LIMIT / 2).forEach((row, k) => {
      const id = `s${first + start + k}`
      batch.set(doc(dbOk, STUDENTS_COLLECTION, id), {
        institution_id: input.institutionId,
        name: row.name,
        phone_number: row.phone,
        school_level: 'fundamental',
        school_grade: '',
        student_level: 2,
        active: true,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })
      const trail = row.trailName ? trailByName.get(row.trailName.toLowerCase()) : undefined
      if (trail) {
        linked += 1
        batch.set(doc(dbOk, STUDENT_TRAILS_COLLECTION, studentTrailDocId(id, trail.id)), {
          student_id: id,
          institution_id: input.institutionId,
          trail_id: trail.id,
          current_stage_number: 1,
          current_question_number: 1,
          status: 'not_started',
          started_at: null,
          completed_at: null,
          last_interaction_at: null,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        })
      }
      created.push({ id, row })
    })
    await batch.commit()
  }

  // Senhas informadas na planilha (a senha é guardada só como hash, pelo servidor).
  const errors: BulkError[] = []
  let withPassword = 0
  const pending = created.filter((c) => c.row.password)
  for (let i = 0; i < pending.length; i += 5) {
    await Promise.all(
      pending.slice(i, i + 5).map(async ({ id, row }) => {
        try {
          await updateStudentPassword(id, row.password)
          withPassword += 1
        } catch (e) {
          errors.push({
            line: row.line,
            name: row.name,
            phone: row.phone,
            error: `Aluno criado, mas a senha não foi definida: ${e instanceof Error ? e.message : 'erro'}`,
          })
        }
      }),
    )
  }
  return { added: created.length, withPassword, linked, errors }
}

export type RemoveParse = {
  ids: string[]
  names: string[]
  errors: BulkError[]
}

/** Lê a planilha de remoção: Nome, celular, remover (sim / não). */
export function parseRemoveRows(rows: Row[], students: Student[]): RemoveParse {
  const byPhone = new Map(students.map((s) => [phoneKey(s.phone_number), s]))
  const ids: string[] = []
  const names: string[] = []
  const errors: BulkError[] = []
  rows.forEach((row, i) => {
    const line = i + 2
    const flag = parseYesNo(pick(row, 'remover', 'remove'))
    if (flag !== true) return
    const phoneRaw = pick(row, 'celular', 'telefone')
    const name = pick(row, 'nome')
    const s = byPhone.get(phoneKey(phoneRaw))
    if (!s) {
      errors.push({ line, name, phone: phoneRaw, error: 'Aluno não encontrado nesta instituição.' })
      return
    }
    if (!ids.includes(s.id)) {
      ids.push(s.id)
      names.push(s.name)
    }
  })
  return { ids, names, errors }
}

/** Remove da instituição: tira o acesso e mantém o histórico (o aluno continua na base). */
export async function inactivateStudents(ids: string[]): Promise<number> {
  if (!db) throw new Error('Firebase não inicializado.')
  const dbOk = db
  let count = 0
  for (let start = 0; start < ids.length; start += BATCH_LIMIT) {
    const batch = writeBatch(dbOk)
    for (const id of ids.slice(start, start + BATCH_LIMIT)) {
      batch.update(doc(dbOk, STUDENTS_COLLECTION, id), { active: false, updated_at: serverTimestamp() })
      count += 1
    }
    await batch.commit()
  }
  return count
}
