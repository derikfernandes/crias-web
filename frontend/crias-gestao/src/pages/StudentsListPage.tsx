import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
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
import { studentPath } from '../lib/paths'
import { usePermissions } from '../hooks/usePermissions'
import type { Institution } from '../types/institution'
import type { Student } from '../types/student'

const PAGE_SIZE = 20

export function StudentsListPage() {
  const { canNav, filterInstitutions, canInstitution } = usePermissions()
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [students, setStudents] = useState<Student[]>([])
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

  const allowedStudents = useMemo(() => {
    return students.filter((student) => canInstitution(student.institution_id))
  }, [students, canInstitution])

  const filteredStudents = useMemo(() => {
    let list = allowedStudents
    if (selectedInstitutionId) {
      list = list.filter((s) => s.institution_id === selectedInstitutionId)
    }

    const query = search.trim().toLowerCase()
    const digits = search.replace(/\D/g, '')
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
      .filter((student) => {
        if ((student.name || '').toLowerCase().includes(query)) return true
        if (student.id.toLowerCase().includes(query)) return true
        const phone = (student.phone_number || '').replace(/\D/g, '')
        return digits.length > 0 && phone.includes(digits)
      })
      .sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'pt-BR', {
          sensitivity: 'base',
        }),
      )
  }, [allowedStudents, selectedInstitutionId, search])

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const paginatedStudents = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredStudents.slice(start, start + PAGE_SIZE)
  }, [filteredStudents, safePage])

  useEffect(() => {
    if (!db) return

    let unsubInst: (() => void) | null = null
    let unsubStu: (() => void) | null = null

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

    unsubStu = onSnapshot(
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
    )

    return () => {
      unsubInst?.()
      unsubStu?.()
    }
  }, [])

  const rows: StudentsListRow[] = paginatedStudents.map((student) => ({
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
  }))

  const pageStart =
    filteredStudents.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(safePage * PAGE_SIZE, filteredStudents.length)

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
      filteredCount={filteredStudents.length}
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
