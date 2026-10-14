import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { GerenciamentoPageView } from '../design/views/GerenciamentoPageView'
import type {
  GerenciamentoStudentRow,
  GerenciamentoTrailRow,
} from '../design/types/gerenciamentoPageView'
import { db } from '../lib/firebase'
import {
  formatInstitutionTs,
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
} from '../lib/studentTrailFirestore'
import {
  formatTrailTs,
  snapshotToTrail,
  TRAILS_COLLECTION,
} from '../lib/trailFirestore'
import { deleteTrailCascade } from '../lib/trailApi'
import { institutionPath, studentPath, trailPath } from '../lib/paths'
import { usePermissions } from '../hooks/usePermissions'
import type { Institution } from '../types/institution'
import type { Student } from '../types/student'
import type { StudentTrail } from '../types/studentTrail'
import type { Trail } from '../types/trail'

const LAST_INSTITUTION_ID_STORAGE_KEY = 'trilha_admin_selected_institution_id'
const STUDENTS_PAGE_SIZE = 20

export function GerenciamentoPage() {
  const { filterInstitutions } = usePermissions()
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loadingInst, setLoadingInst] = useState(true)
  const [instError, setInstError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const saved = window.localStorage.getItem(LAST_INSTITUTION_ID_STORAGE_KEY)
    return saved?.trim() ? saved : null
  })
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null)

  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [studentsError, setStudentsError] = useState<string | null>(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [studentsPage, setStudentsPage] = useState(1)

  const [trails, setTrails] = useState<Trail[]>([])
  const [loadingTrails, setLoadingTrails] = useState(false)
  const [trailsError, setTrailsError] = useState<string | null>(null)
  const [deletingTrailId, setDeletingTrailId] = useState<string | null>(null)
  const [studentTrails, setStudentTrails] = useState<StudentTrail[]>([])
  const [loadingStudentTrails, setLoadingStudentTrails] = useState(false)
  const [studentTrailsError, setStudentTrailsError] = useState<string | null>(null)

  const sortedInstitutions = useMemo(() => {
    return filterInstitutions(institutions).sort((a, b) => {
      const ma = a.updated_at?.toMillis?.() ?? a.created_at?.toMillis?.() ?? 0
      const mb = b.updated_at?.toMillis?.() ?? b.created_at?.toMillis?.() ?? 0
      return mb - ma
    })
  }, [institutions, filterInstitutions])

  const selectedInstitution = useMemo(
    () => institutions.find((i) => i.id === selectedId) ?? null,
    [institutions, selectedId],
  )

  const trailNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of trails) map.set(t.id, t.name || t.id)
    return map
  }, [trails])

  const studentTrailByStudentId = useMemo(() => {
    const map = new Map<string, StudentTrail>()
    for (const st of studentTrails) {
      const current = map.get(st.student_id)
      if (!current) {
        map.set(st.student_id, st)
        continue
      }
      const currMillis =
        current.updated_at?.toMillis?.() ?? current.created_at?.toMillis?.() ?? 0
      const nextMillis = st.updated_at?.toMillis?.() ?? st.created_at?.toMillis?.() ?? 0
      if (nextMillis > currMillis) map.set(st.student_id, st)
    }
    return map
  }, [studentTrails])

  const visibleStudents = useMemo(() => {
    if (!selectedTrailId) return students
    return students.filter((s) => studentTrailByStudentId.has(s.id))
  }, [students, selectedTrailId, studentTrailByStudentId])

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase()
    const digits = studentSearch.replace(/\D/g, '')
    if (!query) return visibleStudents

    return visibleStudents.filter((student) => {
      if ((student.name || '').toLowerCase().includes(query)) return true
      if (student.id.toLowerCase().includes(query)) return true
      const phone = (student.phone_number || '').replace(/\D/g, '')
      return digits.length > 0 && phone.includes(digits)
    })
  }, [studentSearch, visibleStudents])

  const studentsTotalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / STUDENTS_PAGE_SIZE),
  )

  const paginatedStudents = useMemo(() => {
    const start = (studentsPage - 1) * STUDENTS_PAGE_SIZE
    return filteredStudents.slice(start, start + STUDENTS_PAGE_SIZE)
  }, [filteredStudents, studentsPage])

  useEffect(() => {
    let unsub: (() => void) | null = null

    async function run() {
      if (!db) {
        setLoadingInst(false)
        return
      }
      setLoadingInst(true)
      unsub = onSnapshot(
        collection(db, INSTITUTIONS_COLLECTION),
        (snap) => {
          setInstitutions(snap.docs.map(snapshotToInstitution))
          setInstError(null)
          setLoadingInst(false)
        },
        (err) => {
          setInstError(err.message)
          setLoadingInst(false)
        },
      )
    }

    void run()
    return () => unsub?.()
  }, [])

  useEffect(() => {
    let unsubStu: (() => void) | null = null
    let unsubTr: (() => void) | null = null
    let unsubStuTr: (() => void) | null = null

    async function run() {
      if (!db || !selectedId) {
        setStudents([])
        setTrails([])
        setStudentTrails([])
        setStudentsError(null)
        setTrailsError(null)
        setStudentTrailsError(null)
        setLoadingStudents(false)
        setLoadingTrails(false)
        setLoadingStudentTrails(false)
        return
      }

      setLoadingStudents(true)
      setLoadingTrails(true)
      setLoadingStudentTrails(true)

      const qStudents = query(
        collection(db, STUDENTS_COLLECTION),
        where('institution_id', '==', selectedId),
      )
      unsubStu = onSnapshot(
        qStudents,
        (snap) => {
          const list = snap.docs.map(snapshotToStudent)
          list.sort((a, b) =>
            (a.name || '').localeCompare(b.name || '', 'pt-BR', {
              sensitivity: 'base',
            }),
          )
          setStudents(list)
          setStudentsError(null)
          setLoadingStudents(false)
        },
        (err) => {
          setStudentsError(err.message)
          setStudents([])
          setLoadingStudents(false)
        },
      )

      const qTrails = query(
        collection(db, TRAILS_COLLECTION),
        where('institution_id', '==', selectedId),
      )
      unsubTr = onSnapshot(
        qTrails,
        (snap) => {
          const list = snap.docs.map(snapshotToTrail)
          list.sort((a, b) =>
            (a.name || '').localeCompare(b.name || '', 'pt-BR', {
              sensitivity: 'base',
            }),
          )
          setTrails(list)
          setTrailsError(null)
          setLoadingTrails(false)
        },
        (err) => {
          setTrailsError(err.message)
          setTrails([])
          setLoadingTrails(false)
        },
      )

      const qStudentTrails = selectedTrailId
        ? query(
            collection(db, STUDENT_TRAILS_COLLECTION),
            where('trail_id', '==', selectedTrailId),
          )
        : query(
            collection(db, STUDENT_TRAILS_COLLECTION),
            where('institution_id', '==', selectedId),
          )

      unsubStuTr = onSnapshot(
        qStudentTrails,
        (snap) => {
          const list = snap.docs.map(snapshotToStudentTrail)
          setStudentTrails(list)
          setStudentTrailsError(null)
          setLoadingStudentTrails(false)
        },
        (err) => {
          setStudentTrailsError(err.message)
          setStudentTrails([])
          setLoadingStudentTrails(false)
        },
      )
    }

    void run()
    return () => {
      unsubStu?.()
      unsubTr?.()
      unsubStuTr?.()
    }
  }, [selectedId, selectedTrailId])

  useEffect(() => {
    if (!selectedTrailId) return
    if (!trails.some((t) => t.id === selectedTrailId)) {
      setSelectedTrailId(null)
    }
  }, [selectedTrailId, trails])

  useEffect(() => {
    if (studentsPage > studentsTotalPages) {
      setStudentsPage(studentsTotalPages)
    }
  }, [studentsPage, studentsTotalPages])

  async function handleDeleteTrail(trail: Trail) {
    const label = trail.name?.trim() || trail.id
    const ok = window.confirm(
      `Excluir a trilha "${label}"? Esta ação não pode ser desfeita.`,
    )
    if (!ok) return

    try {
      setDeletingTrailId(trail.id)
      await deleteTrailCascade(trail.id)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Erro ao excluir trilha.')
    } finally {
      setDeletingTrailId(null)
    }
  }

  useEffect(() => {
    if (!selectedId?.trim()) return
    window.localStorage.setItem(LAST_INSTITUTION_ID_STORAGE_KEY, selectedId)
  }, [selectedId])

  const trailRows: GerenciamentoTrailRow[] = trails.map((t) => ({
    id: t.id,
    name: t.name || '—',
    subject: t.subject || '—',
    activeLabel: t.active ? 'Sim' : 'Não',
    updatedAtLabel: formatTrailTs(t.updated_at),
    detailHref: trailPath(t.id),
    deleting: deletingTrailId === t.id,
  }))

  const studentRows: GerenciamentoStudentRow[] = paginatedStudents.map((s) => {
    const st = studentTrailByStudentId.get(s.id) ?? null
    const trailLabel = st
      ? trailNameById.get(st.trail_id) ?? st.trail_id
      : '—'
    return {
      id: s.id,
      name: s.name || '—',
      trailLabel,
      stageLabel:
        st?.current_stage_number != null ? String(st.current_stage_number) : '—',
      questionLabel:
        st?.current_question_number != null
          ? String(st.current_question_number)
          : '—',
      statusLabel: st ? st.status : '—',
      phone: s.phone_number || '—',
      schoolLabel: `${s.school_grade || '—'} · ${s.school_level}`,
      studentLevel: String(s.student_level),
      activeLabel: s.active ? 'Sim' : 'Não',
      createdAtLabel: formatStudentTs(s.created_at),
      updatedAtLabel: formatStudentTs(s.updated_at),
      detailHref: studentPath(s.id),
    }
  })

  return (
    <GerenciamentoPageView
      loadingInst={loadingInst}
      institutionOptions={sortedInstitutions.map((inst) => ({
        id: inst.id,
        label: inst.name || inst.id,
      }))}
      selectedId={selectedId}
      onSelectInstitution={(next) => {
        setSelectedId(next)
        setSelectedTrailId(null)
        setStudentSearch('')
        setStudentsPage(1)
      }}
      trailOptions={trails.map((trail) => ({
        id: trail.id,
        label: trail.name || trail.id,
      }))}
      selectedTrailId={selectedTrailId}
      onSelectTrail={(next) => {
        setSelectedTrailId(next)
        setStudentsPage(1)
      }}
      loadingTrails={loadingTrails}
      instError={instError}
      selectedInstitutionName={selectedInstitution?.name?.trim() || 'Instituição'}
      selectedInstitutionType={selectedInstitution?.type || '—'}
      selectedInstitutionActiveLabel={selectedInstitution?.active ? 'Sim' : 'Não'}
      selectedInstitutionCreatedAtLabel={formatInstitutionTs(
        selectedInstitution?.created_at ?? null,
      )}
      selectedInstitutionUpdatedAtLabel={formatInstitutionTs(
        selectedInstitution?.updated_at ?? null,
      )}
      institutionDetailHref={selectedId ? institutionPath(selectedId) : '#'}
      newTrailHref={
        selectedId
          ? `/trilhas/novo?institution_id=${encodeURIComponent(selectedId)}`
          : '/trilhas/novo'
      }
      trailsError={trailsError}
      trailRows={trailRows}
      onDeleteTrail={(trailId) => {
        const trail = trails.find((t) => t.id === trailId)
        if (trail) void handleDeleteTrail(trail)
      }}
      loadingStudents={loadingStudents}
      loadingStudentTrails={loadingStudentTrails}
      studentsError={studentsError}
      studentTrailsError={studentTrailsError}
      studentRows={studentRows}
      studentSearch={studentSearch}
      onStudentSearchChange={(value) => {
        setStudentSearch(value)
        setStudentsPage(1)
      }}
      filteredStudentsCount={filteredStudents.length}
      totalStudentsCount={visibleStudents.length}
      studentsPage={studentsPage}
      studentsTotalPages={studentsTotalPages}
      studentsPageStart={
        filteredStudents.length === 0
          ? 0
          : (studentsPage - 1) * STUDENTS_PAGE_SIZE + 1
      }
      studentsPageEnd={Math.min(
        studentsPage * STUDENTS_PAGE_SIZE,
        filteredStudents.length,
      )}
      onPreviousStudentsPage={() =>
        setStudentsPage((page) => Math.max(1, page - 1))
      }
      onNextStudentsPage={() =>
        setStudentsPage((page) => Math.min(studentsTotalPages, page + 1))
      }
      studentsEmptyMessage={
        selectedTrailId
          ? 'Nenhum aluno com progresso nesta trilha.'
          : 'Nenhum aluno nesta instituição.'
      }
    />
  )
}
