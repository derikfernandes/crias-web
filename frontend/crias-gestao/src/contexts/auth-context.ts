import { createContext } from 'react'
import type { User } from 'firebase/auth'
import type { AdminUser } from '../types/adminUser'

export type AuthContextValue = {
  user: User | null
  loading: boolean
  adminProfile: AdminUser | null
  permissionsLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
