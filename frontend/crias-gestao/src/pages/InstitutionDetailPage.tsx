import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  INSTITUTIONS_COLLECTION,
  snapshotToInstitution,
} from '../lib/institutionFirestore'
import { InstitutionForm } from '../components/InstitutionForm'
import { usePermissions } from '../hooks/usePermissions'
import type { Institution } from '../types/institution'
import {
  InstitutionDetailPageView,
  type InstitutionDetailPageStatus,
} from '../design/views/InstitutionDetailPageView'

export function InstitutionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { canInstitution, permissionsLoading } = usePermissions()
  const [inst, setInst] = useState<Institution | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let unsub: (() => void) | null = null

    async function run() {
      if (!db || !id) {
        setLoading(false)
        return
      }

      setLoading(true)
      unsub = onSnapshot(
        doc(db, INSTITUTIONS_COLLECTION, id),
        (snap) => {
          if (!snap.exists()) {
            setInst(null)
            setError(null)
          } else {
            setInst(snapshotToInstitution(snap))
            setError(null)
          }
          setLoading(false)
        },
        (err) => {
          setError(err.message)
          setLoading(false)
        },
      )
    }

    void run()
    return () => unsub?.()
  }, [id])

  if (!id) {
    return <InstitutionDetailPageView status="missing-id" />
  }

  if (permissionsLoading) {
    return <InstitutionDetailPageView status="loading" />
  }

  if (!canInstitution(id)) {
    return <InstitutionDetailPageView status="forbidden" />
  }

  let status: InstitutionDetailPageStatus
  let formSlot: ReactNode = null

  if (loading) {
    status = 'ok'
    formSlot = <p className="muted">Carregando…</p>
  } else if (!inst) {
    status = error ? 'error' : 'not-found'
  } else {
    status = error ? 'error' : 'ok'
    formSlot = <InstitutionForm docId={id} initial={inst} />
  }

  return (
    <InstitutionDetailPageView
      status={status}
      errorMessage={error}
      formSlot={formSlot}
    />
  )
}
