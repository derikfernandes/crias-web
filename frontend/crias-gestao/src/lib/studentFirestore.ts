import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import { deleteStudentCascade } from './studentApi'
import type { Student } from '../types/student'

export const STUDENTS_COLLECTION = 'students'

export function snapshotToStudent(
  d: DocumentSnapshot | QueryDocumentSnapshot,
): Student {
  const data = d.data()
  if (!data) {
    return {
      id: d.id,
      institution_id: '',
      name: '',
      phone_number: '',
      school_level: 'fundamental',
      school_grade: '',
      student_level: 2,
      active: false,
      created_at: null,
      updated_at: null,
    }
  }

  const rawStudentLevel = data.student_level
  const student_level =
    typeof rawStudentLevel === 'number' &&
    (rawStudentLevel === 1 || rawStudentLevel === 2 || rawStudentLevel === 3)
      ? rawStudentLevel
      : 2

  return {
    id: d.id,
    institution_id: typeof data.institution_id === 'string' ? data.institution_id : '',
    name: typeof data.name === 'string' ? data.name : '',
    phone_number:
      typeof data.phone_number === 'string'
        ? data.phone_number.replace(/\D/g, '')
        : typeof data.phone_number === 'number'
          ? String(data.phone_number).replace(/\D/g, '')
          : '',
    school_level:
      typeof data.school_level === 'string' ? data.school_level : 'fundamental',
    school_grade:
      typeof data.school_grade === 'string' ? data.school_grade : '',
    student_level,
    active: typeof data.active === 'boolean' ? data.active : false,
    created_at: data.created_at ?? null,
    updated_at: data.updated_at ?? null,
  }
}

export function formatStudentTs(value: Student['created_at']): string {
  if (!value || typeof value.toDate !== 'function') return '—'
  try {
    return value.toDate().toLocaleString('pt-BR')
  } catch {
    return '—'
  }
}

// ---------------------------------------------------------------------------
// Wrappers de escrita usados pelos componentes visuais. A lógica foi extraída
// de StudentForm sem nenhuma alteração de comportamento: mesma coleção,
// mesmos campos e mesmos payloads.
// ---------------------------------------------------------------------------

export type StudentFormData = {
  institution_id: string
  name: string
  phone_number: string
  school_level: Student['school_level']
  school_grade: string
  student_level: 1 | 2 | 3
  active: boolean
}

export async function updateStudent(
  docId: string,
  data: StudentFormData,
): Promise<void> {
  if (!db) return
  await updateDoc(doc(db, STUDENTS_COLLECTION, docId), {
    institution_id: data.institution_id,
    name: data.name,
    phone_number: data.phone_number,
    school_level: data.school_level,
    school_grade: data.school_grade,
    student_level: data.student_level,
    active: data.active,
    updated_at: serverTimestamp(),
  })
}

/**
 * Cria aluno com ID sequencial (s1, s2, s3...) usando transação com contador
 * em counters/students { next: number }. Devolve null se o Firebase não
 * estiver inicializado.
 */
export async function createStudentSequential(
  data: StudentFormData,
): Promise<string | null> {
  if (!db) return null
  const dbOk = db

  return runTransaction(dbOk, async (tx) => {
    const counterRef = doc(dbOk, 'counters', 'students')
    const counterSnap = await tx.get(counterRef)
    const counterData = counterSnap.exists() ? counterSnap.data() : {}
    const rawNext = (counterData as { next?: unknown }).next
    const next =
      typeof rawNext === 'number' && Number.isFinite(rawNext) && rawNext >= 1
        ? Math.floor(rawNext)
        : 1

    const studentId = `s${next}`
    const studentRef = doc(collection(dbOk, STUDENTS_COLLECTION), studentId)

    const existing = await tx.get(studentRef)
    if (existing.exists()) {
      throw new Error(
        `Conflito ao gerar id sequencial (${studentId}). Verifique counters/students.next.`,
      )
    }

    tx.set(studentRef, {
      institution_id: data.institution_id,
      name: data.name,
      phone_number: data.phone_number,
      school_level: data.school_level,
      school_grade: data.school_grade,
      student_level: data.student_level,
      active: data.active,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    })

    tx.set(counterRef, { next: next + 1 }, { merge: true })

    return studentId
  })
}

/**
 * Exclui o aluno via API com cascade dos dependentes
 * (student_trails, conversation_logs, exercise_attempts).
 */
export async function deleteStudent(docId: string): Promise<void> {
  await deleteStudentCascade(docId)
}

