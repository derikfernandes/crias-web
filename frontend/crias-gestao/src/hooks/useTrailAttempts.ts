import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { EXERCISE_ATTEMPTS_COLLECTION, snapshotToExerciseAttempt } from '../lib/exerciseAttemptFirestore'
import { db } from '../lib/firebase'
import type { ExerciseAttempt } from '../types/exerciseAttempt'

/** Tentativas de exercício de uma trilha (desempenho por trilha na aba Alunos, 1.3.12). */
export function useTrailAttempts(trailId: string): ExerciseAttempt[] {
  const [rows, setRows] = useState<ExerciseAttempt[]>([])
  useEffect(() => {
    if (!db || !trailId) return
    return onSnapshot(
      query(collection(db, EXERCISE_ATTEMPTS_COLLECTION), where('trail_id', '==', trailId)),
      (snap) => setRows(snap.docs.map(snapshotToExerciseAttempt)),
      () => setRows([]),
    )
  }, [trailId])
  return rows
}
