export type User = { uid: string; email: string | null }
type Cb = (u: User | null) => void
const cbs = new Set<Cb>()
const MAIL = (typeof localStorage !== 'undefined' && localStorage.getItem('mock-email')) || 'coordenacao@escola.org'
let current: User | null = { uid: 'mock-uid', email: MAIL }
export const getAuth = () => ({ get currentUser() { return current } })
export function onAuthStateChanged(_a: unknown, cb: Cb) {
  cbs.add(cb)
  setTimeout(() => cb(current), 0)
  return () => cbs.delete(cb)
}
export async function signInWithEmailAndPassword(_a: unknown, email: string) {
  current = { uid: 'mock-uid', email }
  try { localStorage.setItem('mock-email', email) } catch { /* ignore */ }
  cbs.forEach((c) => c(current))
}
export async function signOut() {
  current = null
  cbs.forEach((c) => c(null))
}
