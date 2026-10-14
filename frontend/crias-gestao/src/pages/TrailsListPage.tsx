import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { TrailsListPageView } from '../design/views/TrailsListPageView'
import type { TrailsListRow } from '../design/types/trailsListPageView'
import { db } from '../lib/firebase'
import {
  INSTITUTIONS_COLLECTION,
  snapshotToInstitution,
} from '../lib/institutionFirestore'
import {
  formatTrailTs,
  snapshotToTrail,
  TRAILS_COLLECTION,
} from '../lib/trailFirestore'
import { trailPath } from '../lib/paths'
import { usePermissions } from '../hooks/usePermissions'
import type { Institution } from '../types/institution'
import type { Trail } from '../types/trail'

const PAGE_SIZE = 20

export function TrailsListPage() {
  const { canNav, filterInstitutions, canInstitution } = usePermissions()
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [trails, setTrails] = useState<Trail[]>([])
  const [loading, setLoading] = useState(() => Boolean(db))
  const [error, setError] = useState<string | null>(null)
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const institutionOptions = useMemo(() => {
    return filterInstitutions(institutions)
      .slice()
      .sort((a, b) =>
        (a.name || a.id).localeCompare(b.name || b.id, 'pt-BR', {
          sensitivity: 'base',
        }),
      )
      .map((inst) => ({
        id: inst.id,
        label: inst.name || inst.id,
      }))
  }, [institutions, filterInstitutions])

  const institutionNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const inst of institutions) {
      map.set(inst.id, inst.name || inst.id)
    }
    return map
  }, [institutions])

  const allowedTrails = useMemo(() => {
    return trails.filter((trail) => canInstitution(trail.institution_id))
  }, [trails, canInstitution])

  const filteredTrails = useMemo(() => {
    let list = allowedTrails
    if (selectedInstitutionId) {
      list = list.filter((t) => t.institution_id === selectedInstitutionId)
    }

    const query = search.trim().toLowerCase()
    if (!query) {
      return list
        .slice()
        .sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', 'pt-BR', {
            sensitivity: 'base',
          }),
        )
    }

    return list
      .filter((trail) => {
        if ((trail.name || '').toLowerCase().includes(query)) return true
        if ((trail.subject || '').toLowerCase().includes(query)) return true
        if (trail.id.toLowerCase().includes(query)) return true
        return false
      })
      .sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'pt-BR', {
          sensitivity: 'base',
        }),
      )
  }, [allowedTrails, selectedInstitutionId, search])

  const totalPages = Math.max(1, Math.ceil(filteredTrails.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const paginatedTrails = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredTrails.slice(start, start + PAGE_SIZE)
  }, [filteredTrails, safePage])

  useEffect(() => {
    if (!db) return

    let unsubInst: (() => void) | null = null
    let unsubTr: (() => void) | null = null

    unsubInst = onSnapshot(
      collection(db, INSTITUTIONS_COLLECTION),
      (snap) => {
        setInstitutions(snap.docs.map(snapshotToInstitution))
        setError(null)
      },
      (err) => {
        setError(err.message)
        setInstitutions([])
      },
    )

    unsubTr = onSnapshot(
      collection(db, TRAILS_COLLECTION),
      (snap) => {
        setTrails(snap.docs.map(snapshotToTrail))
        setError(null)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setTrails([])
        setLoading(false)
      },
    )

    return () => {
      unsubInst?.()
      unsubTr?.()
    }
  }, [])

  const rows: TrailsListRow[] = paginatedTrails.map((trail) => ({
    id: trail.id,
    name: trail.name || '—',
    institutionName:
      institutionNameById.get(trail.institution_id) ||
      trail.institution_id ||
      '—',
    subject: trail.subject || '—',
    activeLabel: trail.active ? 'Sim' : 'Não',
    createdAtLabel: formatTrailTs(trail.created_at),
    detailHref: trailPath(trail.id),
  }))

  const pageStart =
    filteredTrails.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(safePage * PAGE_SIZE, filteredTrails.length)

  return (
    <TrailsListPageView
      canCreate={canNav('trail_new')}
      institutionOptions={institutionOptions}
      selectedInstitutionId={selectedInstitutionId}
      onSelectInstitution={(institutionId) => {
        setSelectedInstitutionId(institutionId)
        setPage(1)
      }}
      search={search}
      onSearchChange={(value) => {
        setSearch(value)
        setPage(1)
      }}
      rows={rows}
      loading={loading}
      error={error}
      filteredCount={filteredTrails.length}
      page={safePage}
      totalPages={totalPages}
      pageStart={pageStart}
      pageEnd={pageEnd}
      onPreviousPage={() => setPage((p) => Math.max(1, Math.min(p, totalPages) - 1))}
      onNextPage={() =>
        setPage((p) => Math.min(totalPages, Math.min(p, totalPages) + 1))
      }
    />
  )
}
