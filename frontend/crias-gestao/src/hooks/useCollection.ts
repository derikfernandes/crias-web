import { useEffect, useRef, useState } from 'react'
import {
  collection,
  onSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

/**
 * Assina uma coleção inteira do Firestore e devolve as linhas já convertidas.
 * `ready` fica true depois da primeira resposta (com sucesso ou erro).
 */
export function useCollection<T>(
  name: string,
  convert: (d: QueryDocumentSnapshot) => T,
  enabled = true,
): { rows: T[]; ready: boolean; error: string | null; retry: () => void } {
  const [rows, setRows] = useState<T[]>([])
  const [ready, setReady] = useState(!db || !enabled)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const convertRef = useRef(convert)
  convertRef.current = convert

  useEffect(() => {
    if (!db || !enabled) return
    return onSnapshot(
      collection(db, name),
      (snap) => {
        setRows(snap.docs.map((d) => convertRef.current(d as QueryDocumentSnapshot)))
        setReady(true)
        setError(null)
      },
      (err) => {
        setError(err.message)
        setReady(true)
      },
    )
  }, [name, enabled, attempt])

  return { rows, ready, error, retry: () => setAttempt((n) => n + 1) }
}
