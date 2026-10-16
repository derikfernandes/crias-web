import {
  boot,
  deleteDocData,
  isServerTs,
  listCollection,
  notify,
  readDoc,
  SERVER_TS,
  subscribe,
  Timestamp,
  updateDocData,
  writeDoc,
} from './store'

import './api'
boot()
export { Timestamp }

type Data = Record<string, unknown>
export type DocumentData = Data
export type Unsubscribe = () => void
export type FirestoreError = Error
export type DocumentSnapshot = QueryDocumentSnapshot
export type CollectionRef = { type: 'collection'; path: string }
export type DocRef = { type: 'document'; path: string; id: string; parent: CollectionRef }
type Constraint =
  | { kind: 'where'; field: string; op: string; value: unknown }
  | { kind: 'orderBy'; field: string; dir: 'asc' | 'desc' }
  | { kind: 'limit'; n: number }
export type Query = { type: 'query'; path: string; constraints: Constraint[] }

export class QueryDocumentSnapshot {
  constructor(
    public id: string,
    private _data: Data | undefined,
    public ref: DocRef,
  ) {}
  data() {
    return this._data ? { ...this._data } : undefined
  }
  exists() {
    return this._data !== undefined
  }
  get(field: string) {
    return this._data?.[field]
  }
}

export const getFirestore = () => ({ __mock: true })
export const serverTimestamp = () => SERVER_TS
export const collection = (_db: unknown, path: string): CollectionRef => ({ type: 'collection', path })
export function doc(base: unknown, ...segments: string[]): DocRef {
  const b = base as { type?: string; path?: string }
  let path = segments.join('/')
  if (b?.type === 'collection') path = `${b.path}/${path}`
  const parts = path.split('/')
  return {
    type: 'document',
    path,
    id: parts[parts.length - 1],
    parent: { type: 'collection', path: parts.slice(0, -1).join('/') },
  }
}
export const where = (field: string, op: string, value: unknown): Constraint => ({ kind: 'where', field, op, value })
export const orderBy = (field: string, dir: 'asc' | 'desc' = 'asc'): Constraint => ({ kind: 'orderBy', field, dir })
export const limit = (n: number): Constraint => ({ kind: 'limit', n })
export const query = (base: CollectionRef | Query, ...constraints: Constraint[]): Query => ({
  type: 'query',
  path: base.path,
  constraints: [...(base.type === 'query' ? base.constraints : []), ...constraints],
})

const cmp = (a: unknown, b: unknown) => {
  const av = a instanceof Timestamp ? a.toMillis() : a
  const bv = b instanceof Timestamp ? b.toMillis() : b
  return (av as number) < (bv as number) ? -1 : (av as number) > (bv as number) ? 1 : 0
}
function matches(d: Data, c: Constraint) {
  if (c.kind !== 'where') return true
  const v = d[c.field]
  switch (c.op) {
    case '==': return v === c.value
    case '!=': return v !== c.value
    case '>': return cmp(v, c.value) > 0
    case '>=': return cmp(v, c.value) >= 0
    case '<': return cmp(v, c.value) < 0
    case '<=': return cmp(v, c.value) <= 0
    case 'in': return Array.isArray(c.value) && c.value.includes(v)
    case 'array-contains': return Array.isArray(v) && v.includes(c.value)
    default: return true
  }
}
function run(q: CollectionRef | Query): QueryDocumentSnapshot[] {
  const cs = q.type === 'query' ? q.constraints : []
  let rows = listCollection(q.path).filter(([, d]) => cs.every((c) => matches(d, c)))
  for (const c of cs) {
    if (c.kind === 'orderBy') {
      rows = [...rows].sort((a, b) => cmp(a[1][c.field], b[1][c.field]) * (c.dir === 'desc' ? -1 : 1))
    }
  }
  for (const c of cs) if (c.kind === 'limit') rows = rows.slice(0, c.n)
  return rows.map(([id, d]) => new QueryDocumentSnapshot(id, d, doc(null, `${q.path}/${id}`)))
}
function snapshotOf(q: CollectionRef | Query) {
  const docs = run(q)
  return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn: (d: QueryDocumentSnapshot) => void) => docs.forEach(fn) }
}

export function onSnapshot(
  ref: DocRef | CollectionRef | Query,
  next: (snap: never) => void,
  _error?: (e: Error) => void,
): Unsubscribe {
  let last = ''
  const emit = () => {
    if (ref.type === 'document') {
      const d = readDoc(ref.path)
      const key = JSON.stringify(d ?? null)
      if (key === last) return
      last = key
      next(new QueryDocumentSnapshot(ref.id, d, ref) as never)
    } else {
      const snap = snapshotOf(ref)
      const key = JSON.stringify(snap.docs.map((x) => [x.id, x.data()]))
      if (key === last) return
      last = key
      next(snap as never)
    }
  }
  const t = setTimeout(emit, 0)
  const un = subscribe(emit)
  return () => {
    clearTimeout(t)
    un()
  }
}
export async function getDoc(ref: DocRef) {
  return new QueryDocumentSnapshot(ref.id, readDoc(ref.path), ref)
}
export async function getDocs(q: CollectionRef | Query) {
  return snapshotOf(q)
}
export async function setDoc(ref: DocRef, data: Data, opts?: { merge?: boolean }) {
  writeDoc(ref.path, data, Boolean(opts?.merge))
  notify()
}
export async function updateDoc(ref: DocRef, data: Data) {
  updateDocData(ref.path, data)
  notify()
}
export async function deleteDoc(ref: DocRef) {
  deleteDocData(ref.path)
  notify()
}
export async function addDoc(c: CollectionRef, data: Data) {
  const id = `mock${Math.random().toString(36).slice(2, 10)}`
  writeDoc(`${c.path}/${id}`, data, false)
  notify()
  return doc(null, `${c.path}/${id}`)
}
type Op = () => void
export function writeBatch() {
  const ops: Op[] = []
  return {
    set: (ref: DocRef, data: Data, opts?: { merge?: boolean }) => ops.push(() => writeDoc(ref.path, data, Boolean(opts?.merge))),
    update: (ref: DocRef, data: Data) => ops.push(() => updateDocData(ref.path, data)),
    delete: (ref: DocRef) => ops.push(() => deleteDocData(ref.path)),
    commit: async () => {
      ops.forEach((o) => o())
      notify()
    },
  }
}
export async function runTransaction<T>(_db: unknown, fn: (tx: unknown) => Promise<T>): Promise<T> {
  const ops: Op[] = []
  const tx = {
    get: async (ref: DocRef) => new QueryDocumentSnapshot(ref.id, readDoc(ref.path), ref),
    set: (ref: DocRef, data: Data, opts?: { merge?: boolean }) => { ops.push(() => writeDoc(ref.path, data, Boolean(opts?.merge))) },
    update: (ref: DocRef, data: Data) => { ops.push(() => updateDocData(ref.path, data)) },
    delete: (ref: DocRef) => { ops.push(() => deleteDocData(ref.path)) },
  }
  const out = await fn(tx)
  ops.forEach((o) => o())
  notify()
  return out
}
export const increment = (n: number) => ({ __increment: n })
export const arrayUnion = (...v: unknown[]) => v
export { isServerTs }
