import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { StudentsListPageView } from '../design/views/StudentsListPageView'
import type { StudentsListRow } from '../design/types/studentsListPageView'
import { db } from '../lib/firebase'
import {
  INSTITUTIONS_COLLECTION,
  snapshotToInstitution,
} from '../lib/institutionFirestore'
import {
  formatStudentTs,
  snapshotToStudent,
  STUDENTS_COLLECTION,
} from '../lib/studentFirestore'
import {
  snapshotToStudentTrail,
  STUDENT_TRAILS_COLLECTION,
  studentTrailDocId,
} from '../lib/studentTrailFirestore'
import { snapshotToTrail, TRAILS_COLLECTION } from '../lib/trailFirestore'
import { studentPath } from '../lib/paths'
import { usePermissions } from '../hooks/usePermissions'
import { situationFromProgress } from '../lib/studentSituation'
import type { Institution } from '../types/institution'
import type { Student } from '../types/student'
import type { StudentTrail } from '../types/studentTrail'
import type { Trail } from '../types/trail'

const PAGE_SIZE = 20

export function StudentsListPage() {
  const { canNav, filterInstitutions, canInstitution } = usePermissions()
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [studentTrails, setStudentTrails] = useState<StudentTrail[]>([])
  const [trails, setTrails] = useState<Trail[]>([])
  const [loading, setLoading] = useState(() => Boolean(db))
  const [error, setError] = useState<string | null>(null)
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('')
  const [selectedTrailId, setSelectedTrailId] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedSituation, setSelectedSituation] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkLinkTrailId, setBulkLinkTrailId] = useState('')

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

  const trailsByStudent = useMemo(() => {
    const map = new Map<string, StudentTrail[]>()
    for (const st of studentTrails) {
      const arr = map.get(st.student_id)
      if (arr) arr.push(st)
      else map.set(st.student_id, [st])
    }
    return map
  }, [studentTrails])

  const trailOptions = useMemo(() => {
    let list = trails.filter((t) => canInstitution(t.institution_id))
    if (selectedInstitutionId) {
      list = list.filter((t) => t.institution_id === selectedInstitutionId)
    }
    return list
      .slice()
      .sort((a, b) =>
        (a.name || a.id).localeCompare(b.name || b.id, 'pt-BR', {
          sensitivity: 'base',
        }),
      )
      .map((t) => ({ id: t.id, label: t.name || t.id }))
  }, [trails, canInstitution, selectedInstitutionId])

  const allowedStudents = useMemo(() => {
    return students.filter((student) => canInstitution(student.institution_id))
  }, [students, canInstitution])

  const enriched = useMemo(() => {
    return allowedStudents.map((student) => {
      const enrolled = trailsByStudent.get(student.id) ?? []
      const relevant = selectedTrailId
        ? enrolled.filter((st) => st.trail_id === selectedTrailId)
        : enrolled

      let lastMs: number | null = null
      let anyCompleted = false
      let anyInProgress = false
      let anyNotStarted = relevant.length === 0

      for (const st of relevant) {
        if (st.status === 'completed') anyCompleted = true
        if (st.status === 'in_progress') anyInProgress = true
        if (st.status === 'not_started') anyNotStarted = true
        const ms = st.last_interaction_at?.toMillis?.() ?? null
        if (ms != null && (lastMs == null || ms > lastMs)) lastMs = ms
      }

      // Sem contagem de liberados na lista: usa status agregado + última interação.
      let completionPct: number | null = null
      let statusHint: string | null = null
      if (anyCompleted && !anyInProgress && relevant.every((s) => s.status === 'completed')) {
        statusHint = 'completed'
        completionPct = 100
      } else if (anyInProgress || anyCompleted) {
        statusHint = 'in_progress'
        // Heurística: média simples de posição não disponível — usa Mid se em progresso.
        completionPct = 50
      } else if (anyNotStarted || relevant.length === 0) {
        statusHint = 'not_started'
        completionPct = 0
      }

      // Se só uma trilha e completed / not_started, respeita.
      if (relevant.length === 1) {
        const only = relevant[0]!
        statusHint = only.status
        if (only.status === 'completed') completionPct = 100
        else if (only.status === 'not_started') completionPct = 0
        else completionPct = 50
      }

      const situation = situationFromProgress({
        status: statusHint,
        completionPct,
        lastInteractionAtMs: lastMs,
      })

      return { student, situation, lastMs, enrolledTrailIds: enrolled.map((e) => e.trail_id) }
    })
  }, [allowedStudents, trailsByStudent, selectedTrailId])

  const gradeOptions = useMemo(() => {
    const set = new Set<string>()
    for (const row of enriched) {
      const g = row.student.school_grade?.trim()
      if (g) set.add(g)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [enriched])

  const filtered = useMemo(() => {
    let list = enriched
    if (selectedInstitutionId) {
      list = list.filter((r) => r.student.institution_id === selectedInstitutionId)
    }
    if (selectedTrailId) {
      list = list.filter((r) => r.enrolledTrailIds.includes(selectedTrailId))
    }
    if (selectedGrade) {
      list = list.filter((r) => r.student.school_grade === selectedGrade)
    }
    if (selectedSituation) {
      list = list.filter((r) => r.situation.key === selectedSituation)
    }

    const query = search.trim().toLowerCase()
    const digits = search.replace(/\D/g, '')
    if (query) {
      list = list.filter((row) => {
        const student = row.student
        if ((student.name || '').toLowerCase().includes(query)) return true
        if (student.id.toLowerCase().includes(query)) return true
        const phone = (student.phone_number || '').replace(/\D/g, '')
        return digits.length > 0 && phone.includes(digits)
      })
    }

    return list.slice().sort((a, b) =>
      (a.student.name || '').localeCompare(b.student.name || '', 'pt-BR', {
        sensitivity: 'base',
      }),
    )
  }, [
    enriched,
    selectedInstitutionId,
    selectedTrailId,
    selectedGrade,
    selectedSituation,
    search,
  ])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const paginated = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, safePage])

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
        collection(db, STUDENTS_COLLECTION),
        (snap) => {
          setStudents(snap.docs.map(snapshotToStudent))
          setError(null)
          setLoading(false)
        },
        (err) => {
          setError(err.message)
          setStudents([])
          setLoading(false)
        },
      ),
    )

    unsubs.push(
      onSnapshot(
        collection(db, STUDENT_TRAILS_COLLECTION),
        (snap) => {
          setStudentTrails(snap.docs.map(snapshotToStudentTrail))
        },
        () => {
          setStudentTrails([])
        },
      ),
    )

    unsubs.push(
      onSnapshot(
        collection(db, TRAILS_COLLECTION),
        (snap) => {
          setTrails(snap.docs.map(snapshotToTrail))
        },
        () => {
          setTrails([])
        },
      ),
    )

    return () => {
      for (const u of unsubs) u()
    }
  }, [])

  const rows: StudentsListRow[] = paginated.map(({ student, situation }) => ({
    id: student.id,
    name: student.name || '—',
    institutionName:
      institutionNameById.get(student.institution_id) ||
      student.institution_id ||
      '—',
    phone: student.phone_number || '—',
    schoolLevel: student.school_level || '—',
    schoolGrade: student.school_grade || '',
    studentLevel: String(student.student_level ?? '—'),
    activeLabel: student.active ? 'Sim' : 'Não',
    createdAtLabel: formatStudentTs(student.created_at),
    detailHref: studentPath(student.id),
    situationLabel: situation.label,
    situationTone: situation.tone,
    selected: selectedIds.has(student.id),
  }))

  const pageStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(safePage * PAGE_SIZE, filtered.length)
  const allPageSelected =
    paginated.length > 0 && paginated.every((r) => selectedIds.has(r.student.id))

  async function handleBulkDeactivate() {
    if (!db || selectedIds.size === 0) return
    setBulkBusy(true)
    try {
      const batch = writeBatch(db)
      for (const id of selectedIds) {
        batch.update(doc(db, STUDENTS_COLLECTION, id), { active: false })
      }
      await batch.commit()
      setSelectedIds(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao desativar')
    } finally {
      setBulkBusy(false)
    }
  }

  function handleBulkExport() {
    const selected = filtered.filter((r) => selectedIds.has(r.student.id))
    if (selected.length === 0) return
    const header = [
      'id',
      'nome',
      'instituicao',
      'telefone',
      'serie',
      'nivel',
      'ativo',
      'situacao',
    ]
    const lines = [header.join(',')]
    for (const { student, situation } of selected) {
      const cells = [
        student.id,
        student.name || '',
        institutionNameById.get(student.institution_id) ||
          student.institution_id ||
          '',
        student.phone_number || '',
        student.school_grade || '',
        String(student.student_level ?? ''),
        student.active ? 'sim' : 'nao',
        situation.label,
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`)
      lines.push(cells.join(','))
    }
    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `alunos-selecionados-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleBulkLink() {
    if (!db || selectedIds.size === 0 || !bulkLinkTrailId.trim()) return
    const trail = trails.find((t) => t.id === bulkLinkTrailId)
    if (!trail) {
      setError('Trilha não encontrada.')
      return
    }
    setBulkBusy(true)
    try {
      const batch = writeBatch(db)
      const now = serverTimestamp()
      let linked = 0
      for (const studentId of selectedIds) {
        const student = students.find((s) => s.id === studentId)
        if (!student?.institution_id) continue
        if (student.institution_id !== trail.institution_id) continue
        const already = studentTrails.some(
          (st) => st.student_id === studentId && st.trail_id === trail.id,
        )
        if (already) continue
        const ref = doc(
          db,
          STUDENT_TRAILS_COLLECTION,
          studentTrailDocId(studentId, trail.id),
        )
        batch.set(ref, {
          student_id: studentId,
          institution_id: student.institution_id,
          trail_id: trail.id,
          current_stage_number: 1,
          current_question_number: 1,
          status: 'not_started',
          started_at: null,
          completed_at: null,
          last_interaction_at: null,
          created_at: now,
          updated_at: now,
        })
        linked += 1
      }
      if (linked === 0) {
        setError(
          'Nenhum aluno elegível para vincular (já vinculados ou instituição diferente da trilha).',
        )
        return
      }
      await batch.commit()
      setSelectedIds(new Set())
      setBulkLinkTrailId('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao vincular')
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <StudentsListPageView
      canCreate={canNav('student_new')}
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
      filteredCount={filtered.length}
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
      trailOptions={trailOptions}
      selectedTrailId={selectedTrailId}
      onSelectTrail={(id) => {
        setSelectedTrailId(id)
        setPage(1)
      }}
      gradeOptions={gradeOptions}
      selectedGrade={selectedGrade}
      onSelectGrade={(g) => {
        setSelectedGrade(g)
        setPage(1)
      }}
      situationFilterOptions={[
        { id: 'completed', label: 'Concluiu' },
        { id: 'final', label: 'Final' },
        { id: 'mid', label: 'Meio' },
        { id: 'start', label: 'Início' },
        { id: 'stalled', label: 'Parado 7+ dias' },
        { id: 'notStarted', label: 'Não iniciou' },
      ]}
      selectedSituation={selectedSituation}
      onSelectSituation={(s) => {
        setSelectedSituation(s)
        setPage(1)
      }}
      selectedCount={selectedIds.size}
      onToggleRowSelected={(id) => {
        setSelectedIds((prev) => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
      }}
      onToggleSelectAll={() => {
        setSelectedIds((prev) => {
          const next = new Set(prev)
          if (allPageSelected) {
            for (const r of paginated) next.delete(r.student.id)
          } else {
            for (const r of paginated) next.add(r.student.id)
          }
          return next
        })
      }}
      allPageSelected={allPageSelected}
      onBulkDeactivate={() => void handleBulkDeactivate()}
      onBulkExport={handleBulkExport}
      onBulkLink={() => void handleBulkLink()}
      bulkLinkTrailOptions={trailOptions}
      bulkLinkTrailId={bulkLinkTrailId}
      onBulkLinkTrailIdChange={setBulkLinkTrailId}
      bulkBusy={bulkBusy}
    />
  )
}
