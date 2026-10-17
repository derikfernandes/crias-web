import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { normalizeAdminEmail } from '../lib/adminPermissions'
import {
  ADMIN_USERS_COLLECTION,
  snapshotToAdminUser,
} from '../lib/adminUserFirestore'
import type { AdminUser } from '../types/adminUser'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [adminProfile, setAdminProfile] = useState<AdminUser | null>(null)
  const [permissionsLoading, setPermissionsLoading] = useState(false)

  useEffect(() => {
    let unsub: (() => void) | null = null

    async function run() {
      if (!auth) {
        setLoading(false)
        return
      }

      unsub = onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser)
        setLoading(false)
      })
    }

    void run()
    return () => unsub?.()
  }, [])

  useEffect(() => {
    let unsub: (() => void) | null = null

    async function run() {
      if (!db || !user?.email) {
        setAdminProfile(null)
        setPermissionsLoading(false)
        return
      }

      const email = normalizeAdminEmail(user.email)
      setPermissionsLoading(true)

      const q = query(
        collection(db, ADMIN_USERS_COLLECTION),
        where('email', '==', email),
      )

      unsub = onSnapshot(
        q,
        (snap) => {
          const doc = snap.docs[0]
          setAdminProfile(doc ? snapshotToAdminUser(doc) : null)
          setPermissionsLoading(false)
        },
        () => {
          setAdminProfile(null)
          setPermissionsLoading(false)
        },
      )
    }

    void run()
    return () => unsub?.()
  }, [user?.email, user?.uid])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      adminProfile,
      permissionsLoading,
      async signIn(email, password) {
        if (!auth) {
          throw new Error('Firebase Auth não inicializado.')
        }
        await signInWithEmailAndPassword(auth, email.trim(), password)
      },
      async signOut() {
        if (!auth) return
        await firebaseSignOut(auth)
      },
    }),
    [user, loading, adminProfile, permissionsLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
