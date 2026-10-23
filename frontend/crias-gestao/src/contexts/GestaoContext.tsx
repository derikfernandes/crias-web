import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  INSTITUTIONS_COLLECTION,
  snapshotToInstitution,
} from '../lib/institutionFirestore'
import { usePermissions } from '../hooks/usePermissions'
import type { Institution } from '../types/institution'
import { GestaoContext, type GestaoContextValue } from './gestao-context'

/**
 * Perfil e escopo da Gestão v1.1.
 * - Super admin: acesso total, ou mais de uma instituição liberada.
 * - Instituição: exatamente uma instituição liberada (só a sua).
 */
export function GestaoProvider({ children }: { children: ReactNode }) {
  const { adminProfile, filterInstitutions, hasFullAccess } = usePermissions()
  const [all, setAll] = useState<Institution[]>([])
  const [loading, setLoading] = useState(Boolean(db))
  const [picked, setPicked] = useState<Set<string> | null>(null)

  useEffect(() => {
    if (!db) return
    return onSnapshot(
      collection(db, INSTITUTIONS_COLLECTION),
      (snap) => {
        setAll(snap.docs.map(snapshotToInstitution))
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [])

  const institutions = useMemo(
    () =>
      filterInstitutions(all).sort((a, b) =>
        (a.name || a.id).localeCompare(b.name || b.id, 'pt-BR'),
      ),
    [all, filterInstitutions],
  )

  const isSuper = useMemo(() => {
    if (hasFullAccess) return true
    if (!adminProfile) return false
    if (adminProfile.all_institutions) return true
    return adminProfile.institution_ids.length !== 1
  }, [adminProfile, hasFullAccess])

  const myInstitutionId = useMemo(() => {
    if (isSuper) return null
    return adminProfile?.institution_ids[0] ?? null
  }, [isSuper, adminProfile])

  const selectedIds = useMemo(() => {
    const ids = new Set(institutions.map((i) => i.id))
    if (!picked) return ids
    const next = new Set<string>()
    for (const id of picked) if (ids.has(id)) next.add(id)
    return next
  }, [institutions, picked])

  const value = useMemo<GestaoContextValue>(() => {
    const scopedInstitutions = isSuper
      ? institutions.filter((i) => selectedIds.has(i.id))
      : institutions.filter((i) => i.id === myInstitutionId)
    return {
      institutions,
      institutionsLoading: loading,
      isSuper,
      myInstitutionId,
      selectedIds,
      setSelectedIds: (next) => setPicked(new Set(next)),
      scopedInstitutions,
      scopedIds: new Set(scopedInstitutions.map((i) => i.id)),
      institutionName: (id) =>
        institutions.find((i) => i.id === id)?.name || 'N/A',
    }
  }, [institutions, loading, isSuper, myInstitutionId, selectedIds])

  return (
    <GestaoContext.Provider value={value}>{children}</GestaoContext.Provider>
  )
}
