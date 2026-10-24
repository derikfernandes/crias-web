/**
 * Prefetch em background do snapshot do Dashboard por institution_id.
 * Sol (i2) é grande: após o 1º load de qualquer instituição, aquecemos o cache
 * para a volta à Sol ficar &lt;0,5s.
 */
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from './firebase'
import {
  getCachedInstitution,
  setCachedInstitution,
  type DashboardInstitutionSnapshot,
} from './dashboardInstitutionCache'
import {
  EXERCISE_ATTEMPTS_COLLECTION,
  snapshotToExerciseAttempt,
} from './exerciseAttemptFirestore'
import { snapshotToStudent, STUDENTS_COLLECTION } from './studentFirestore'
import {
  snapshotToStudentTrail,
  STUDENT_TRAILS_COLLECTION,
} from './studentTrailFirestore'
import { snapshotToTrail, TRAILS_COLLECTION } from './trailFirestore'
import {
  snapshotToTrailStage,
  TRAIL_STAGES_COLLECTION,
} from './trailStageFirestore'
import {
  snapshotToTrailStageQuestion,
  TRAIL_STAGE_QUESTIONS_COLLECTION,
} from './trailStageQuestionFirestore'
import { EMPTY_AGENT_USAGE } from './agentUsage'
import { fetchDashboardLogSummary } from './dashboardSummaryApi'

const FIRESTORE_IN_LIMIT = 30
const inflight = new Map<string, Promise<void>>()

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function isWarmComplete(
  snap: ReturnType<typeof getCachedInstitution>,
): boolean {
  return Boolean(snap && snap.stages.length > 0 && snap.questions.length > 0)
}

/** Prefetch idempotente; no-op se L1 completo ou em voo. */
export function prefetchInstitutionDashboard(institutionId: string): void {
  const id = institutionId.trim()
  if (!id || !db) return
  // Incomplete (só core) não bloqueia: Dados precisa de stages/questions.
  if (isWarmComplete(getCachedInstitution(id))) return
  if (inflight.has(id)) return

  const run = (async () => {
    const dbOk = db
    if (!dbOk) return

    const [studentSnap, trailSnap, linkSnap] = await Promise.all([
      getDocs(
        query(
          collection(dbOk, STUDENTS_COLLECTION),
          where('institution_id', '==', id),
        ),
      ),
      getDocs(
        query(
          collection(dbOk, TRAILS_COLLECTION),
          where('institution_id', '==', id),
        ),
      ),
      getDocs(
        query(
          collection(dbOk, STUDENT_TRAILS_COLLECTION),
          where('institution_id', '==', id),
        ),
      ),
    ])

    const students = studentSnap.docs.map(snapshotToStudent)
    const trails = trailSnap.docs.map(snapshotToTrail)
    const studentTrails = linkSnap.docs.map(snapshotToStudentTrail)
    const studentIds = students.map((s) => s.id).filter(Boolean)
    let attempts: ReturnType<typeof snapshotToExerciseAttempt>[] = []
    if (studentIds.length > 0) {
      const chunks = chunkArray(studentIds, FIRESTORE_IN_LIMIT)
      const snaps = await Promise.all(
        chunks.map((chunk) =>
          getDocs(
            query(
              collection(dbOk, EXERCISE_ATTEMPTS_COLLECTION),
              where('student_id', 'in', chunk),
            ),
          ),
        ),
      )
      attempts = snaps.flatMap((s) => s.docs.map(snapshotToExerciseAttempt))
    }

    const trailIds = trails.map((t) => t.id).filter(Boolean)
    let stages: ReturnType<typeof snapshotToTrailStage>[] = []
    let questions: ReturnType<typeof snapshotToTrailStageQuestion>[] = []
    if (trailIds.length > 0) {
      const chunks = chunkArray(trailIds, FIRESTORE_IN_LIMIT)
      const [stageSnaps, questionSnaps] = await Promise.all([
        Promise.all(
          chunks.map((chunk) =>
            getDocs(
              query(
                collection(dbOk, TRAIL_STAGES_COLLECTION),
                where('trail_id', 'in', chunk),
              ),
            ),
          ),
        ),
        Promise.all(
          chunks.map((chunk) =>
            getDocs(
              query(
                collection(dbOk, TRAIL_STAGE_QUESTIONS_COLLECTION),
                where('trail_id', 'in', chunk),
              ),
            ),
          ),
        ),
      ])
      stages = stageSnaps.flatMap((s) => s.docs.map(snapshotToTrailStage))
      questions = questionSnaps.flatMap((s) =>
        s.docs.map(snapshotToTrailStageQuestion),
      )
    }

    let doneByStudent = new Map<string, Set<string>>()
    let answerMap = new Map<string, string>()
    let agentUsage = EMPTY_AGENT_USAGE
    let agentUsagePresent = true
    try {
      const summary = await fetchDashboardLogSummary(id, 0)
      doneByStudent = summary.doneByStudent
      answerMap = summary.answerMap
      agentUsage = summary.agentUsage
      agentUsagePresent = summary.agentUsagePresent
    } catch {
      // Prefetch de logs é best-effort; core Firestore já basta para UI rápida.
    }

    const snap: DashboardInstitutionSnapshot = {
      students,
      trails,
      studentTrails,
      attempts,
      stages,
      questions,
      doneByStudent,
      answerMap,
      agentUsage,
      agentUsagePresent,
      loadedAt: Date.now(),
    }
    setCachedInstitution(id, snap)
  })()
    .catch((err) => {
      console.warn('[prefetch] falha', id, err)
    })
    .finally(() => {
      inflight.delete(id)
    })

  inflight.set(id, run)
}

/** Após 1º load, aquece as demais instituições (Sol primeiro). */
export function prefetchSiblingInstitutions(
  currentIds: string[],
  allInstitutionIds: string[],
): void {
  const current = new Set(currentIds)
  const rest = allInstitutionIds.filter((id) => !current.has(id))
  // Sol (i2) primeiro — maior e mais usada.
  rest.sort((a, b) => {
    if (a === 'i2') return -1
    if (b === 'i2') return 1
    return a.localeCompare(b)
  })
  for (const id of rest) prefetchInstitutionDashboard(id)
}
