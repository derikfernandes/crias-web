export type User = { uid: string; email: string | null; getIdToken: () => Promise<string> }
type Cb = (u: User | null) => void
const cbs = new Set<Cb>()
const MAIL = (typeof localStorage !== 'undefined' && localStorage.getItem('mock-email')) || 'coordenacao@escola.org'
const mk = (email: string): User => ({ uid: 'mock-uid', email, getIdToken: async () => 'mock-token' })
let current: User | null = mk(MAIL)
export const getAuth = () => ({ get currentUser() { return current } })
export function onAuthStateChanged(_a: unknown, cb: Cb) {
  cbs.add(cb)
  setTimeout(() => cb(current), 0)
  return () => cbs.delete(cb)
}
export async function signInWithEmailAndPassword(_a: unknown, email: string) {
  current = mk(email)
  try { localStorage.setItem('mock-email', email) } catch { /* ignore */ }
  cbs.forEach((c) => c(current))
}
export async function signOut() {
  current = null
  cbs.forEach((c) => c(null))
}
