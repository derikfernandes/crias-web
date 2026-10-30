import { doc, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import { STUDENTS_COLLECTION } from './studentFirestore'
import { updateStudentPassword } from './studentApi'
import type { BulkIssue, NewStudent, StudentPatch } from './bulkActions'
import type { Student } from '../types/student'

export { phoneKey } from './bulkActions'

/**
 * Gravação das ações em massa de alunos (a leitura e a validação das planilhas ficam em bulkActions.ts).
 * Cadastrar: sempre grava na base. Editar: só os campos que a planilha trouxe preenchidos e diferentes.
 * Remover: tira o acesso e mantém o histórico (active=false).
 */

const BATCH_LIMIT = 400

export type AddResult = { added: number; withPassword: number; issues: BulkIssue[] }

/**
 * Cria os alunos na base com ids sequenciais (s1, s2...). O contador é reservado uma vez
 * para o lote inteiro e os documentos entram em lotes de 200.
 */
export async function addStudentsBulk(input: { institutionId: string; rows: NewStudent[] }): Promise<AddResult> {
  if (!db) throw new Error('Firebase não inicializado.')
  const dbOk = db
  const { rows } = input
  if (rows.length === 0) return { added: 0, withPassword: 0, issues: [] }

  const first = await runTransaction(dbOk, async (tx) => {
    const ref = doc(dbOk, 'counters', 'students')
    const snap = await tx.get(ref)
    const raw = (snap.exists() ? (snap.data() as { next?: unknown }).next : 1) as unknown
    const next = typeof raw === 'number' && Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1
    tx.set(ref, { next: next + rows.length }, { merge: true })
    return next
  })

  const created: Array<{ id: string; row: NewStudent }> = []
  for (let start = 0; start < rows.length; start += BATCH_LIMIT / 2) {
    const batch = writeBatch(dbOk)
    rows.slice(start, start + BATCH_LIMIT / 2).forEach((row, k) => {
      const id = `s${first + start + k}`
      batch.set(doc(dbOk, STUDENTS_COLLECTION, id), {
        institution_id: input.institutionId,
        name: row.name,
        phone_number: row.phone,
        ...(row.email ? { email: row.email } : {}),
        ...(row.turma ? { turma: row.turma } : {}),
        school_level: 'fundamental',
        school_grade: '',
        student_level: 2,
        active: true,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })
      created.push({ id, row })
    })
    await batch.commit()
  }

  // Senhas informadas na planilha (a senha é guardada só como hash, pelo servidor).
  const issues: BulkIssue[] = []
  let withPassword = 0
  const pending = created.filter((c) => c.row.password)
  for (let i = 0; i < pending.length; i += 5) {
    await Promise.all(
      pending.slice(i, i + 5).map(async ({ id, row }) => {
        try {
          await updateStudentPassword(id, row.password)
          withPassword += 1
        } catch (e) {
          issues.push({
            line: row.line,
            ref: row.name,
            error: `Aluno cadastrado (${id}), mas a senha não foi definida: ${e instanceof Error ? e.message : 'erro'}`,
          })
        }
      }),
    )
  }
  return { added: created.length, withPassword, issues }
}

/** Aplica os campos que mudaram. Cada aluno é um documento; entram em lotes de 400. */
export async function editStudentsBulk(
  items: Array<{ line: number; student: Student; patch: StudentPatch }>,
): Promise<number> {
  if (!db) throw new Error('Firebase não inicializado.')
  const dbOk = db
  let count = 0
  for (let start = 0; start < items.length; start += BATCH_LIMIT) {
    const batch = writeBatch(dbOk)
    for (const { student, patch } of items.slice(start, start + BATCH_LIMIT)) {
      batch.update(doc(dbOk, STUDENTS_COLLECTION, student.id), { ...patch, updated_at: serverTimestamp() })
      count += 1
    }
    await batch.commit()
  }
  return count
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

/** Define a senha de cada aluno (hash pelo servidor). Devolve os que falharam. */
export async function setPasswordsBulk(
  items: Array<{ line: number; student: Student; password: string }>,
): Promise<{ done: number; issues: BulkIssue[] }> {
  const issues: BulkIssue[] = []
  let done = 0
  for (let i = 0; i < items.length; i += 5) {
    await Promise.all(
      items.slice(i, i + 5).map(async ({ line, student, password }) => {
        try {
          await updateStudentPassword(student.id, password)
          done += 1
        } catch (e) {
          issues.push({ line, ref: student.id, error: e instanceof Error ? e.message : 'Não foi possível definir a senha.' })
        }
      }),
    )
  }
  return { done, issues }
}
