import type { Firestore } from 'firebase-admin/firestore'

import { TrailEngineError } from './errors'
import { phoneLookupVariants } from './phoneNormalize'
import type { CollectionNames, ResolvedStudent } from './types'
import { defaultCollectionNames } from './types'

type StudentRow = {
  id: string
  institution_id: string
  active: boolean
  name: string
  phone_number: string
}

function readStudent(
  id: string,
  data: Record<string, unknown>,
): StudentRow {
  const phoneRaw = data.phone_number
  const phone_number =
    typeof phoneRaw === 'string'
      ? phoneRaw.replace(/\D/g, '')
      : typeof phoneRaw === 'number'
        ? String(phoneRaw).replace(/\D/g, '')
        : ''

  return {
    id,
    institution_id:
      typeof data.institution_id === 'string' ? data.institution_id.trim() : '',
    active: typeof data.active === 'boolean' ? data.active : false,
    name: typeof data.name === 'string' ? data.name : '',
    phone_number,
  }
}

/**
 * Preferir active==true quando houver múltiplos hits entre variantes.
 */
function pickPreferred(candidates: Array<StudentRow & { matched_variant: string }>) {
  if (candidates.length === 0) return null
  const active = candidates.find((c) => c.active === true)
  return active ?? candidates[0]
}

/**
 * Resolve telefone → sN com variantes de lookup (I6 / ADR-004).
 * Não grava; não sobrescreve docs.
 */
export async function resolveStudentByPhone(
  db: Firestore,
  phone: string | number,
  collections: CollectionNames = defaultCollectionNames(),
  options?: { requireActive?: boolean },
): Promise<ResolvedStudent> {
  const { variants } = phoneLookupVariants(phone)
  if (variants.length === 0) {
    throw new TrailEngineError('invalid_phone', 'Telefone inválido (sem dígitos).')
  }

  const candidates: Array<StudentRow & { matched_variant: string }> = []
  const seenIds = new Set<string>()

  for (const variant of variants) {
    const snap = await db
      .collection(collections.students)
      .where('phone_number', '==', variant)
      .limit(5)
      .get()

    for (const doc of snap.docs) {
      if (seenIds.has(doc.id)) continue
      seenIds.add(doc.id)
      const row = readStudent(doc.id, (doc.data() ?? {}) as Record<string, unknown>)
      candidates.push({ ...row, matched_variant: variant })
    }
  }

  const picked = pickPreferred(candidates)
  if (!picked) {
    throw new TrailEngineError('not_found', 'Aluno não encontrado para este telefone.')
  }

  if (options?.requireActive && !picked.active) {
    // Sem student_id em details — evita oráculo de enumeração (RT-H3).
    throw new TrailEngineError(
      'inactive_student',
      'Aluno inactivo ou indisponível para este telefone.',
    )
  }

  return {
    student_id: picked.id,
    institution_id: picked.institution_id,
    active: picked.active,
    name: picked.name,
    phone_number: picked.phone_number,
    matched_variant: picked.matched_variant,
  }
}

/**
 * Lookup soft para path legado Chatis: nunca lança; devolve null se miss.
 */
export async function resolveStudentByPhoneSoft(
  db: Firestore,
  phone: string | number,
  collections: CollectionNames = defaultCollectionNames(),
): Promise<ResolvedStudent | null> {
  try {
    return await resolveStudentByPhone(db, phone, collections, {
      requireActive: false,
    })
  } catch (e) {
    if (e instanceof TrailEngineError && e.code === 'not_found') return null
    if (e instanceof TrailEngineError && e.code === 'invalid_phone') return null
    throw e
  }
}
