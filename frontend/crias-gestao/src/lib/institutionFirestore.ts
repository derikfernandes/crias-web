import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { fullInstitutionUrl } from './paths'
import type { Institution } from '../types/institution'

export const INSTITUTIONS_COLLECTION = 'institutions'

export function snapshotToInstitution(
  d: DocumentSnapshot | QueryDocumentSnapshot,
): Institution {
  const data = d.data()
  if (!data) {
    return {
      id: d.id,
      name: '',
      type: '',
      active: false,
      created_at: null,
      updated_at: null,
    }
  }
  return {
    id: d.id,
    name: typeof data.name === 'string' ? data.name : '',
    type: typeof data.type === 'string' ? data.type : '',
    active: Boolean(data.active),
    created_at: data.created_at ?? null,
    updated_at: data.updated_at ?? null,
    public_link:
      typeof data.public_link === 'string' ? data.public_link : undefined,
  }
}

export function formatInstitutionTs(
  value: Institution['created_at'],
): string {
  if (!value || typeof value.toDate !== 'function') return '—'
  try {
    return value.toDate().toLocaleString('pt-BR')
  } catch {
    return '—'
  }
}

// ---------------------------------------------------------------------------
// Wrappers de escrita/leitura usados pelos componentes visuais. A lógica foi
// extraída de InstitutionForm/StudentForm sem nenhuma alteração de
// comportamento: mesmas coleções, mesmos campos e mesmos payloads.
// ---------------------------------------------------------------------------

export type InstitutionFormData = {
  name: string
  type: string
  active: boolean
}

export async function updateInstitution(
  docId: string,
  data: InstitutionFormData,
): Promise<void> {
  if (!db) return
  const link = fullInstitutionUrl(docId)
  await updateDoc(doc(db, INSTITUTIONS_COLLECTION, docId), {
    name: data.name,
    type: data.type,
    active: data.active,
    updated_at: serverTimestamp(),
    public_link: link,
  })
}

/**
 * Cria instituição com ID sequencial (i1, i2, i3...) usando transação com
 * contador em counters/institutions { next: number }.
 * Devolve null se o Firebase não estiver inicializado (mesmo no-op silencioso
 * do comportamento original do formulário).
 */
export async function createInstitutionSequential(
  data: InstitutionFormData,
): Promise<string | null> {
  if (!db) return null
  const dbOk = db

  return runTransaction(dbOk, async (tx) => {
    const counterRef = doc(dbOk, 'counters', 'institutions')
    const counterSnap = await tx.get(counterRef)
    const counterData = counterSnap.exists() ? counterSnap.data() : {}
    const rawNext = (counterData as { next?: unknown }).next
    const next =
      typeof rawNext === 'number' && Number.isFinite(rawNext) && rawNext >= 1
        ? Math.floor(rawNext)
        : 1

    const instId = `i${next}`
    const instRef = doc(collection(dbOk, INSTITUTIONS_COLLECTION), instId)

    const existing = await tx.get(instRef)
    if (existing.exists()) {
      throw new Error(
        `Conflito ao gerar id sequencial (${instId}). Verifique counters/institutions.next.`,
      )
    }

    const link = fullInstitutionUrl(instId)
    tx.set(instRef, {
      name: data.name,
      type: data.type,
      active: data.active,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      public_link: link,
    })

    tx.set(counterRef, { next: next + 1 }, { merge: true })

    return instId
  })
}

export async function deleteInstitution(docId: string): Promise<void> {
  if (!db) return
  await deleteDoc(doc(db, INSTITUTIONS_COLLECTION, docId))
}

/**
 * Assina a lista de instituições (id + nome, ordenada por nome) para montar
 * selects de vínculo. Em caso de erro, devolve lista vazia.
 */
export function subscribeToInstitutionOptions(
  onChange: (items: { id: string; name: string }[]) => void,
): Unsubscribe | null {
  if (!db) return null
  return onSnapshot(
    collection(db, INSTITUTIONS_COLLECTION),
    (snap) => {
      const next = snap.docs.map((d) => {
        const data = d.data()
        const nm =
          typeof (data as Record<string, unknown>).name === 'string'
            ? ((data as Record<string, unknown>).name as string)
            : ''
        return { id: d.id, name: nm }
      })
      next.sort((a, b) => a.name.localeCompare(b.name))
      onChange(next)
    },
    () => {
      // Se falhar, deixa lista vazia (a validação bloqueia submit).
      onChange([])
    },
  )
}
