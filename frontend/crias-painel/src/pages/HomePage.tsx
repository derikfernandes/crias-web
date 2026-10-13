import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  INSTITUTIONS_COLLECTION,
  snapshotToInstitution,
} from '../lib/institutionFirestore'
import {
  snapshotToStudent,
  STUDENTS_COLLECTION,
} from '../lib/studentFirestore'
import {
  snapshotToStudentTrail,
  STUDENT_TRAILS_COLLECTION,
} from '../lib/studentTrailFirestore'
import { snapshotToTrail, TRAILS_COLLECTION } from '../lib/trailFirestore'
import { institutionPath } from '../lib/paths'
import { usePermissions } from '../hooks/usePermissions'
import type { Institution } from '../types/institution'
import type { Student } from '../types/student'
import type { StudentTrail } from '../types/studentTrail'
import type { Trail } from '../types/trail'
import { HomePageView } from '../design/views/HomePageView'
import type {
  HomePageInstitutionCard,
  HomePageTotals,
  HomePageUsageStats,
} from '../design/types/homePageView'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const LAST_INSTITUTION_ID_STORAGE_KEY = 'trilha_admin_selected_institution_id'

function rememberInstitution(institutionId: string) {
  const id = institutionId.trim()
  if (!id) return
  window.localStorage.setItem(LAST_INSTITUTION_ID_STORAGE_KEY, id)
}

function emptyUsage(): HomePageUsageStats {
  return {
    inProgress: 0,
    completed: 0,
    notStarted: 0,
    activeLast7Days: 0,
  }
}

function buildUsageForInstitution(
  studentTrails: StudentTrail[],
  institutionId: string,
): HomePageUsageStats {
  const relevant = studentTrails.filter(
    (st) => st.institution_id === institutionId,
  )
  const usage = emptyUsage()
  const studentsInProgress = new Set<string>()
  const studentsCompleted = new Set<string>()
  const studentsActiveRecent = new Set<string>()
  const now = Date.now()

  for (const st of relevant) {
    if (st.status === 'in_progress') studentsInProgress.add(st.student_id)
    if (st.status === 'completed') studentsCompleted.add(st.student_id)
    if (st.status === 'not_started') usage.notStarted += 1

    const lastMs = st.last_interaction_at?.toMillis?.() ?? 0
    if (lastMs > 0 && now - lastMs <= SEVEN_DAYS_MS) {
      studentsActiveRecent.add(st.student_id)
    }
  }

  usage.inProgress = studentsInProgress.size
  usage.completed = studentsCompleted.size
  usage.activeLast7Days = studentsActiveRecent.size
  return usage
}

function sumUsage(items: HomePageUsageStats[]): HomePageUsageStats {
  return items.reduce(
    (acc, u) => ({
      inProgress: acc.inProgress + u.inProgress,
      completed: acc.completed + u.completed,
      notStarted: acc.notStarted + u.notStarted,
      activeLast7Days: acc.activeLast7Days + u.activeLast7Days,
    }),
    emptyUsage(),
  )
}

export function HomePage() {
  const { canNav, filterInstitutions, canInstitution } = usePermissions()
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [trails, setTrails] = useState<Trail[]>([])
  const [studentTrails, setStudentTrails] = useState<StudentTrail[]>([])
  const [error, setError] = useState<string | null>(null)
  const [readyFlags, setReadyFlags] = useState({
    institutions: false,
    students: false,
    trails: false,
    studentTrails: false,
  })

  const sortedInstitutions = useMemo(() => {
    return filterInstitutions(institutions).sort((a, b) => {
      const ma = a.updated_at?.toMillis?.() ?? a.created_at?.toMillis?.() ?? 0
      const mb = b.updated_at?.toMillis?.() ?? b.created_at?.toMillis?.() ?? 0
      return mb - ma
    })
  }, [institutions, filterInstitutions])

  const cards: HomePageInstitutionCard[] = useMemo(() => {
    return sortedInstitutions.map((inst) => {
      const instStudents = students.filter(
        (s) => s.institution_id === inst.id && canInstitution(s.institution_id),
      )
      const instTrails = trails.filter(
        (t) => t.institution_id === inst.id && canInstitution(t.institution_id),
      )
      return {
        id: inst.id,
        name: inst.name || inst.id,
        type: inst.type || '—',
        active: Boolean(inst.active),
        detailHref: institutionPath(inst.id),
        dashboardHref: '/dashboard',
        gerenciamentoHref: '/gerenciamento',
        activeStudents: instStudents.filter((s) => s.active).length,
        activeTrails: instTrails.filter((t) => t.active).length,
        usage: buildUsageForInstitution(studentTrails, inst.id),
      }
    })
  }, [sortedInstitutions, students, trails, studentTrails, canInstitution])

  const totals: HomePageTotals = useMemo(() => {
    return {
      institutions: cards.length,
      activeStudents: cards.reduce((n, c) => n + c.activeStudents, 0),
      activeTrails: cards.reduce((n, c) => n + c.activeTrails, 0),
      usage: sumUsage(cards.map((c) => c.usage)),
    }
  }, [cards])

  const allReady =
    readyFlags.institutions &&
    readyFlags.students &&
    readyFlags.trails &&
    readyFlags.studentTrails

  const loading = Boolean(db) && !allReady

  const mode =
    !allReady && cards.length === 0
      ? 'empty'
      : cards.length === 0
        ? 'empty'
        : cards.length === 1
          ? 'single'
          : 'multi'

  useEffect(() => {
    if (!db) return

    const unsubInst = onSnapshot(
      collection(db, INSTITUTIONS_COLLECTION),
      (snap) => {
        setInstitutions(snap.docs.map(snapshotToInstitution))
        setReadyFlags((prev) => ({ ...prev, institutions: true }))
        setError(null)
      },
      (err) => {
        setError(err.message)
        setReadyFlags((prev) => ({ ...prev, institutions: true }))
      },
    )

    const unsubStu = onSnapshot(
      collection(db, STUDENTS_COLLECTION),
      (snap) => {
        setStudents(snap.docs.map(snapshotToStudent))
        setReadyFlags((prev) => ({ ...prev, students: true }))
        setError(null)
      },
      (err) => {
        setError(err.message)
        setReadyFlags((prev) => ({ ...prev, students: true }))
      },
    )

    const unsubTr = onSnapshot(
      collection(db, TRAILS_COLLECTION),
      (snap) => {
        setTrails(snap.docs.map(snapshotToTrail))
        setReadyFlags((prev) => ({ ...prev, trails: true }))
        setError(null)
      },
      (err) => {
        setError(err.message)
        setReadyFlags((prev) => ({ ...prev, trails: true }))
      },
    )

    const unsubStuTr = onSnapshot(
      collection(db, STUDENT_TRAILS_COLLECTION),
      (snap) => {
        setStudentTrails(snap.docs.map(snapshotToStudentTrail))
        setReadyFlags((prev) => ({ ...prev, studentTrails: true }))
        setError(null)
      },
      (err) => {
        setError(err.message)
        setReadyFlags((prev) => ({ ...prev, studentTrails: true }))
      },
    )

    return () => {
      unsubInst()
      unsubStu()
      unsubTr()
      unsubStuTr()
    }
  }, [])

  useEffect(() => {
    if (cards.length === 1) rememberInstitution(cards[0].id)
  }, [cards])

  return (
    <HomePageView
      canCreate={canNav('institution_new')}
      loading={loading}
      error={error}
      mode={mode}
      totals={totals}
      cards={cards}
      onRememberInstitution={rememberInstitution}
    />
  )
}
