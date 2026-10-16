/**
 * Firestore em memória só para desenvolvimento e teste visual da Gestão sem banco.
 * Ativado com `VITE_MOCK_FIREBASE=1` (ver vite.config.ts). Não vai para produção.
 */
import { seed } from './seed'

export class Timestamp {
  constructor(
    public seconds: number,
    public nanoseconds: number,
  ) {}
  static now() {
    return Timestamp.fromMillis(Date.now())
  }
  static fromMillis(ms: number) {
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6)
  }
  static fromDate(d: Date) {
    return Timestamp.fromMillis(d.getTime())
  }
  toMillis() {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6)
  }
  toDate() {
    return new Date(this.toMillis())
  }
}

export const SERVER_TS = { __serverTimestamp: true }
export const isServerTs = (v: unknown) =>
  Boolean(v && typeof v === 'object' && (v as { __serverTimestamp?: boolean }).__serverTimestamp)

type Data = Record<string, unknown>
const collections = new Map<string, Map<string, Data>>()
type Listener = () => void
const listeners = new Set<Listener>()

function col(name: string) {
  let c = collections.get(name)
  if (!c) {
    c = new Map()
    collections.set(name, c)
  }
  return c
}

function resolve(data: Data, prev?: Data): Data {
  const out: Data = {}
  for (const [k, v] of Object.entries(data)) {
    out[k] = isServerTs(v) ? Timestamp.now() : v === undefined ? (prev?.[k] ?? null) : v
  }
  return out
}

export function notify() {
  for (const l of [...listeners]) l()
}
export function subscribe(l: Listener) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function readDoc(path: string): Data | undefined {
  const [c, ...rest] = path.split('/')
  return col(c).get(rest.join('/'))
}
export function writeDoc(path: string, data: Data, merge: boolean) {
  const [c, ...rest] = path.split('/')
  const id = rest.join('/')
  const prev = col(c).get(id)
  col(c).set(id, merge && prev ? { ...prev, ...resolve(data, prev) } : resolve(data))
}
export function updateDocData(path: string, data: Data) {
  const [c, ...rest] = path.split('/')
  const id = rest.join('/')
  const prev = col(c).get(id)
  if (!prev) throw new Error(`No document to update: ${path}`)
  const next = { ...prev }
  for (const [k, v] of Object.entries(data)) next[k] = isServerTs(v) ? Timestamp.now() : v
  col(c).set(id, next)
}
export function deleteDocData(path: string) {
  const [c, ...rest] = path.split('/')
  col(c).delete(rest.join('/'))
}
export function listCollection(name: string): Array<[string, Data]> {
  return [...col(name).entries()]
}

let booted = false
export function boot() {
  if (booted) return
  booted = true
  const data = seed(Timestamp)
  for (const [c, docs] of Object.entries(data)) {
    for (const [id, d] of Object.entries(docs)) col(c).set(id, d)
  }
  // Expõe para depuração no console do navegador.
  ;(globalThis as { __mockDb?: unknown }).__mockDb = { collections, notify }
}
