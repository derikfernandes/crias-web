/**
 * Auth Firebase da Educação + helpers do login unificado por e-mail.
 * O SDK só carrega quando o login parece e-mail (ou ao checar sessão gestora).
 */

const GESTAO_ACCESS_KEY = 'crias:acesso-gestao'

function firebaseConfigFromEnv() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  }
}

function missingFirebaseKeys(): string[] {
  const c = firebaseConfigFromEnv()
  const entries: [string, string | undefined][] = [
    ['VITE_FIREBASE_API_KEY', c.apiKey],
    ['VITE_FIREBASE_AUTH_DOMAIN', c.authDomain],
    ['VITE_FIREBASE_PROJECT_ID', c.projectId],
    ['VITE_FIREBASE_STORAGE_BUCKET', c.storageBucket],
    ['VITE_FIREBASE_MESSAGING_SENDER_ID', c.messagingSenderId],
    ['VITE_FIREBASE_APP_ID', c.appId],
  ]
  return entries.filter(([, v]) => !v).map(([k]) => k)
}

async function getFirebaseAuth() {
  if (missingFirebaseKeys().length > 0) return null
  const [{ initializeApp, getApps }, { getAuth }] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ])
  const existing = getApps()[0]
  const app = existing ?? initializeApp(firebaseConfigFromEnv())
  return getAuth(app)
}

/** Marca que a pessoa também usa a Gestão (liga o switch Aluno | Educação). */
export function markGestaoAccess(): void {
  try {
    window.localStorage.setItem(GESTAO_ACCESS_KEY, '1')
  } catch {
    /* sem armazenamento: o switch só não aparece */
  }
}

export function clearGestaoAccessFlag(): void {
  try {
    window.localStorage.removeItem(GESTAO_ACCESS_KEY)
  } catch {
    /* ignore */
  }
}

export function looksLikeEmail(login: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login.trim())
}

/** Tenta e-mail/senha da Educação (Firebase). false = não autenticou. */
export async function tryGestaoSignIn(
  email: string,
  password: string,
): Promise<boolean> {
  const auth = await getFirebaseAuth()
  if (!auth) return false
  try {
    const { signInWithEmailAndPassword } = await import('firebase/auth')
    await signInWithEmailAndPassword(auth, email.trim(), password)
    return true
  } catch {
    return false
  }
}

/** ID token do user Firebase atual (após sign-in). */
export async function getFirebaseIdToken(): Promise<string | null> {
  const auth = await getFirebaseAuth()
  const user = auth?.currentUser
  if (!user) return null
  try {
    return await user.getIdToken()
  } catch {
    return null
  }
}

/** Sessão Firebase já ativa (gestor voltando à raiz). */
export async function getCurrentGestaoUser(): Promise<{
  uid: string
  email: string | null
} | null> {
  const auth = await getFirebaseAuth()
  if (!auth) return null
  const { onAuthStateChanged } = await import('firebase/auth')
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub()
      resolve(user ? { uid: user.uid, email: user.email } : null)
    })
  })
}

export type PostLoginRoles = { student: boolean; gestao: boolean }

/**
 * Destino pós-login unificado:
 * - só aluno → área do aluno
 * - só gestor → Gestão
 * - ambos → aluno (com switch)
 */
export function resolveUnifiedDestination(
  roles: PostLoginRoles,
  studentDeepLink?: string,
): { kind: 'aluno'; path: string } | { kind: 'gestao' } | { kind: 'none' } {
  if (roles.student) {
    return { kind: 'aluno', path: studentDeepLink || '/' }
  }
  if (roles.gestao) return { kind: 'gestao' }
  return { kind: 'none' }
}
