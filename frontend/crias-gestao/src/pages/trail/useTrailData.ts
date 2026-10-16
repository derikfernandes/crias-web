import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { snapshotToStudent, STUDENTS_COLLECTION } from '../../lib/studentFirestore'
import { snapshotToStudentTrail, STUDENT_TRAILS_COLLECTION } from '../../lib/studentTrailFirestore'
import { snapshotToTrail, TRAILS_COLLECTION } from '../../lib/trailFirestore'
import { snapshotToTrailStage, TRAIL_STAGES_COLLECTION } from '../../lib/trailStageFirestore'
import {
  snapshotToTrailStageQuestion,
  TRAIL_STAGE_QUESTIONS_COLLECTION,
} from '../../lib/trailStageQuestionFirestore'
import { activitiesFromRows, type ActivityDraft } from '../../lib/trailActivities'
import { configFromTrail, type StructureConfig } from '../../lib/trailConfig'
import { structurePhasesFromTrailData, type StructurePhase } from '../../lib/trailEditor'
import type { Student } from '../../types/student'
import type { StudentTrail } from '../../types/studentTrail'
import type { Trail } from '../../types/trail'
import type { TrailStage } from '../../types/trailStage'
import type { TrailStageQuestion } from '../../types/trailStageQuestion'

export type TrailData = {
  ready: boolean
  error: string | null
  trail: Trail | null
  stages: TrailStage[]
  cells: TrailStageQuestion[]
  links: StudentTrail[]
  students: Student[]
  phases: StructurePhase[]
  config: StructureConfig
  activities: ActivityDraft[]
}

/** Carrega a trilha aberta e tudo que as quatro abas precisam, em tempo real. */
export function useTrailData(id: string | undefined): TrailData {
  const [trail, setTrail] = useState<Trail | null>(null)
  const [trailReady, setTrailReady] = useState(false)
  const [stages, setStages] = useState<TrailStage[]>([])
  const [cells, setCells] = useState<TrailStageQuestion[]>([])
  const [links, setLinks] = useState<StudentTrail[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTrail(null)
    setTrailReady(false)
    setStages([])
    setCells([])
    setLinks([])
    setStudents([])
    if (!db || !id) {
      setTrailReady(true)
      return
    }
    const dbOk = db
    const fail = (e: Error) => setError(e.message)
    const unsubs = [
      onSnapshot(
        doc(dbOk, TRAILS_COLLECTION, id),
        (snap) => {
          setTrail(snap.exists() ? snapshotToTrail(snap) : null)
          setTrailReady(true)
          setError(null)
        },
        (e) => {
          fail(e)
          setTrailReady(true)
        },
      ),
      onSnapshot(
        query(collection(dbOk, TRAIL_STAGES_COLLECTION), where('trail_id', '==', id)),
        (snap) =>
          setStages(snap.docs.map(snapshotToTrailStage).sort((a, b) => a.stage_number - b.stage_number)),
        fail,
      ),
      onSnapshot(
        query(collection(dbOk, TRAIL_STAGE_QUESTIONS_COLLECTION), where('trail_id', '==', id)),
        (snap) => setCells(snap.docs.map(snapshotToTrailStageQuestion)),
        fail,
      ),
      onSnapshot(
        query(collection(dbOk, STUDENT_TRAILS_COLLECTION), where('trail_id', '==', id)),
        (snap) => setLinks(snap.docs.map(snapshotToStudentTrail)),
        fail,
      ),
    ]
    return () => unsubs.forEach((u) => u())
  }, [id])

  const institutionId = trail?.institution_id ?? ''
  useEffect(() => {
    setStudents([])
    if (!db || !institutionId) return
    return onSnapshot(
      query(collection(db, STUDENTS_COLLECTION), where('institution_id', '==', institutionId)),
      (snap) =>
        setStudents(
          snap.docs
            .map(snapshotToStudent)
            .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id, 'pt-BR')),
        ),
      (e) => setError(e.message),
    )
  }, [institutionId])

  const phases = useMemo(
    () => structurePhasesFromTrailData(trail?.phase_blueprint, stages),
    [trail?.phase_blueprint, stages],
  )
  const config = useMemo(
    () => configFromTrail(trail ?? { phase_blueprint: null, options_count: undefined }, stages),
    [trail, stages],
  )
  const activities = useMemo(
    () => activitiesFromRows(cells, phases, config.options),
    [cells, phases, config.options],
  )

  return { ready: trailReady, error, trail, stages, cells, links, students, phases, config, activities }
}
