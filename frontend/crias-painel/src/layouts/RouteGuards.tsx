import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePermissions } from '../hooks/usePermissions'
import { navPermissionForPath } from '../lib/adminPermissions'
import { db, firebaseConfigError } from '../lib/firebase'
import { PRODUCTION_APP_ORIGIN } from '../lib/site'
import { loadTrilhaSession } from '../lib/trilha/trilhaSession'

const firebaseOk = !firebaseConfigError && db

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, adminProfile } = useAuth()
  const location = useLocation()

  if (loading) {
    return <p className="muted">Carregando…</p>
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (adminProfile && !adminProfile.active) {
    return (
      <p className="banner banner--error" role="alert">
        Sua conta está desativada. Fale com um administrador.
      </p>
    )
  }

  return children
}

export function RequireNavPermission({ children }: { children: ReactNode }) {
  const { canNav, permissionsLoading } = usePermissions()
  const location = useLocation()
  const required = navPermissionForPath(location.pathname)

  if (permissionsLoading) {
    return <p className="muted">Carregando permissões…</p>
  }

  if (!canNav(required)) {
    return (
      <p className="banner banner--error" role="alert">
        Você não tem permissão para acessar esta página.
      </p>
    )
  }

  return children
}

export function FirebaseGate({ children }: { children: ReactNode }) {
  if (!firebaseOk) {
    return (
      <>
        <header className="admin__header">
          <h1>Instituições</h1>
        </header>
        <p className="banner banner--error" role="alert">
          {firebaseConfigError ??
            'Firebase não inicializado. Configure VITE_FIREBASE_* no .env local ou nas Environment Variables da Vercel.'}
        </p>
        <p className="admin__lede muted">
          App em produção:{' '}
          <a href={PRODUCTION_APP_ORIGIN} target="_blank" rel="noreferrer">
            {PRODUCTION_APP_ORIGIN}
          </a>
          . Documentação da API em <Link to="/doc">/doc</Link>.
        </p>
      </>
    )
  }
  return children
}

export function ProtectedPage({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <RequireNavPermission>
        <FirebaseGate>{children}</FirebaseGate>
      </RequireNavPermission>
    </RequireAuth>
  )
}

/** Guard do módulo aluno Trilha — sessão HMAC (não admin_users). */
export function RequireStudentAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const session = loadTrilhaSession()

  if (!session) {
    return (
      <Navigate
        to="/trilha/login"
        replace
        state={{ returnUrl: location.pathname }}
      />
    )
  }

  return children
}
