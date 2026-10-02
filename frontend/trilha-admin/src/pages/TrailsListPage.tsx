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
import {
  snapshotToTrailStage,
  TRAIL_STAGES_COLLECTION,
} from '../lib/trailStageFirestore'
import {
  snapshotToTrailStageQuestion,
  TRAIL_STAGE_QUESTIONS_COLLECTION,
} from '../lib/trailStageQuestionFirestore'
import {
  snapshotToStudentTrail,
  STUDENT_TRAILS_COLLECTION,
} from '../lib/studentTrailFirestore'
import { trailPath } from '../lib/paths'
import { usePermissions } from '../hooks/usePermissions'
import type { Institution } from '../types/institution'
import type { Trail } from '../types/trail'
import type { TrailStage } from '../types/trailStage'
import type { TrailStageQuestion } from '../types/trailStageQuestion'
import type { StudentTrail } from '../types/studentTrail'

const PAGE_SIZE = 20

export function TrailsListPage() {
  const { canNav, filterInstitutions, canInstitution } = usePermissions()
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [trails, setTrails] = useState<Trail[]>([])
  const [stages, setStages] = useState<TrailStage[]>([])
  const [questions, setQuestions] = useState<TrailStageQuestion[]>([])
  const [studentTrails, setStudentTrails] = useState<StudentTrail[]>([])
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

  const metricsByTrail = useMemo(() => {
    const map = new Map<
      string,
      { blocks: number; exercises: number; released: number; totalQ: number; students: number }
    >()
    for (const stage of stages) {
      if (!stage.trail_id || stage.active === false) continue
      const cur = map.get(stage.trail_id) ?? {
        blocks: 0,
        exercises: 0,
        released: 0,
        totalQ: 0,
        students: 0,
      }
      cur.blocks += 1
      map.set(stage.trail_id, cur)
    }
    for (const q of questions) {
      if (!q.trail_id || q.active === false) continue
      const cur = map.get(q.trail_id) ?? {
        blocks: 0,
        exercises: 0,
        released: 0,
        totalQ: 0,
        students: 0,
      }
      cur.totalQ += 1
      if (q.is_released) cur.released += 1
      // exercícios ≈ questões com gabarito/opções
      if (q.correct_option || (q.options && q.options.length > 0)) {
        cur.exercises += 1
      }
      map.set(q.trail_id, cur)
    }
    const studentCounts = new Map<string, number>()
    for (const st of studentTrails) {
      studentCounts.set(st.trail_id, (studentCounts.get(st.trail_id) ?? 0) + 1)
    }
    for (const [trailId, count] of studentCounts) {
      const cur = map.get(trailId) ?? {
        blocks: 0,
        exercises: 0,
        released: 0,
        totalQ: 0,
        students: 0,
      }
      cur.students = count
      map.set(trailId, cur)
    }
    return map
  }, [stages, questions, studentTrails])

  const allowedTrails = useMemo(() => {
    return trails.filter((trail) => canInstitution(trail.institution_id))
  }, [trails, canInstitution])

  const filteredTrails = useMemo(() => {
    let list = allowedTrails
    if (selectedInstitutionId) {
      list = list.filter((t) => t.institution_id === selectedInstitutionId)
    }

    const queryText = search.trim().toLowerCase()
    if (!queryText) {
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
        if ((trail.name || '').toLowerCase().includes(queryText)) return true
        if ((trail.subject || '').toLowerCase().includes(queryText)) return true
        if (trail.id.toLowerCase().includes(queryText)) return true
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

    const unsubs: Array<() => void> = []

    unsubs.push(
      onSnapshot(
        collection(db, INSTITUTIONS_COLLECTION),
        (snap) => {
          setInstitutions(snap.docs.map(snapshotToInstitution))
          setError(null)
        },
        (err) => {
          setError(err.message)
          setInstitutions([])
        },
      ),
    )

    unsubs.push(
      onSnapshot(
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
      ),
    )

    unsubs.push(
      onSnapshot(
        collection(db, TRAIL_STAGES_COLLECTION),
        (snap) => setStages(snap.docs.map(snapshotToTrailStage)),
        () => setStages([]),
      ),
    )

    unsubs.push(
      onSnapshot(
        collection(db, TRAIL_STAGE_QUESTIONS_COLLECTION),
        (snap) => setQuestions(snap.docs.map(snapshotToTrailStageQuestion)),
        () => setQuestions([]),
      ),
    )

    unsubs.push(
      onSnapshot(
        collection(db, STUDENT_TRAILS_COLLECTION),
        (snap) => setStudentTrails(snap.docs.map(snapshotToStudentTrail)),
        () => setStudentTrails([]),
      ),
    )

    return () => {
      for (const u of unsubs) u()
    }
  }, [])

  const rows: TrailsListRow[] = paginatedTrails.map((trail) => {
    const m = metricsByTrail.get(trail.id)
    const depthLabel = m
      ? `${m.blocks} blocos · ${m.exercises} exercícios`
      : '—'
    const releasedLabel = m ? `${m.released} de ${m.totalQ}` : '—'
    return {
      id: trail.id,
      name: trail.name || '—',
      institutionName:
        institutionNameById.get(trail.institution_id) ||
        trail.institution_id ||
        '—',
      subject: trail.subject || '—',
      activeLabel: trail.active ? 'Ativa' : 'Inativa',
      createdAtLabel: formatTrailTs(trail.created_at),
      detailHref: trailPath(trail.id),
      depthLabel,
      releasedLabel,
      studentsCount: m?.students ?? 0,
    }
  })

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
      onPreviousPage={() =>
        setPage((p) => Math.max(1, Math.min(p, totalPages) - 1))
      }
      onNextPage={() =>
        setPage((p) => Math.min(totalPages, Math.min(p, totalPages) + 1))
      }
    />
  )
}
