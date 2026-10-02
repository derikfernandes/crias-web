import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePermissions } from '../hooks/usePermissions'
import {
  navPermissionForPath,
  SIDEBAR_NAV,
  type SidebarNavEntry,
} from '../lib/adminPermissions'
import { getAppVersion } from '../lib/appVersion'
import { HELP_MAILTO } from '../lib/site'
import { db } from '../lib/firebase'
import {
  INSTITUTIONS_COLLECTION,
  snapshotToInstitution,
} from '../lib/institutionFirestore'
import {
  AdminLayoutView,
  type AdminLayoutNavEntry,
} from '../design/layouts/AdminLayoutView'
import type { Institution } from '../types/institution'

const LAST_INSTITUTION_ID_STORAGE_KEY = 'trilha_admin_selected_institution_id'

/**
 * Shell visual autenticado (header topo + área de conteúdo).
 * Lógica de permissão permanece nos hooks; a view só recebe props.
 */
export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  const { canNav, permissionsLoading, adminProfile, filterInstitutions } =
    usePermissions()
  const location = useLocation()
  const authed = Boolean(user)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = window.localStorage.getItem('crias-theme')
      return saved === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<
    string | null
  >(() => {
    try {
      const saved = window.localStorage.getItem(LAST_INSTITUTION_ID_STORAGE_KEY)
      return saved?.trim() ? saved.trim() : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      window.localStorage.setItem('crias-theme', theme)
    } catch {
      // ignore
    }
  }, [theme])

  useEffect(() => {
    if (!db || !authed) return
    return onSnapshot(
      collection(db, INSTITUTIONS_COLLECTION),
      (snap) => {
        setInstitutions(snap.docs.map(snapshotToInstitution))
      },
      () => {
        setInstitutions([])
      },
    )
  }, [authed])

  const institutionOptions = useMemo(() => {
    if (!authed) return []
    return filterInstitutions(institutions)
      .slice()
      .sort((a, b) =>
        (a.name || a.id).localeCompare(b.name || b.id, 'pt-BR', {
          sensitivity: 'base',
        }),
      )
      .map((inst) => ({
        id: inst.id,
        label: inst.name || inst.id,
      }))
  }, [institutions, filterInstitutions, authed])

  const effectiveSelectedId = useMemo(() => {
    if (!selectedInstitutionId) return null
    if (
      institutionOptions.length > 0 &&
      !institutionOptions.some((o) => o.id === selectedInstitutionId)
    ) {
      return null
    }
    return selectedInstitutionId
  }, [institutionOptions, selectedInstitutionId])

  function handleSelectInstitution(id: string | null) {
    setSelectedInstitutionId(id)
    try {
      if (id) {
        window.localStorage.setItem(LAST_INSTITUTION_ID_STORAGE_KEY, id)
      } else {
        window.localStorage.removeItem(LAST_INSTITUTION_ID_STORAGE_KEY)
      }
    } catch {
      // ignore
    }
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: LAST_INSTITUTION_ID_STORAGE_KEY,
        newValue: id,
      }),
    )
  }

  const navEntries = useMemo(() => {
    const activePermission = navPermissionForPath(location.pathname)
    const entries: AdminLayoutNavEntry[] = []

    for (const entry of SIDEBAR_NAV as SidebarNavEntry[]) {
      if (entry.type === 'link') {
        if (!canNav(entry.key)) continue
        entries.push({
          type: 'link',
          key: entry.key,
          path: entry.path,
          label: entry.label,
          active: activePermission === entry.key,
        })
        continue
      }

      const childrenItems = entry.children
        .filter((child) => canNav(child.key))
        .map((child) => ({
          key: child.key,
          path: child.path,
          label: child.label,
          active: activePermission === child.key,
        }))

      if (childrenItems.length === 0) continue

      entries.push({
        type: 'group',
        id: entry.id,
        label: entry.label,
        children: childrenItems,
      })
    }

    return entries
  }, [canNav, location.pathname])

  const userRoleLabel = useMemo(() => {
    if (!adminProfile) return 'Acesso completo'
    if (adminProfile.is_super_admin) return 'Super admin'
    if (!adminProfile.active) return 'Inativo'
    const nav = adminProfile.nav_permissions ?? []
    if (nav.includes('admin') && nav.includes('dashboard')) {
      return 'Coordenação'
    }
    if (nav.length > 0 && !nav.includes('admin')) {
      return 'Leitura'
    }
    return 'Usuário'
  }, [adminProfile])

  return (
    <AdminLayoutView
      brandLabel="Crias Trilha"
      navEntries={navEntries}
      userEmail={user?.email ?? null}
      userRoleLabel={userRoleLabel}
      permissionsLoading={permissionsLoading}
      authed={authed}
      onLogout={() => void signOut()}
      theme={theme}
      onToggleTheme={() =>
        setTheme((current) => (current === 'light' ? 'dark' : 'light'))
      }
      helpMailto={HELP_MAILTO}
      appVersion={getAppVersion()}
      guestLinks={[
        { path: '/doc', label: 'API e documentação' },
        { path: '/login', label: 'Entrar' },
      ]}
      manageInstitutionsHref="/"
      institutionOptions={institutionOptions}
      selectedInstitutionId={effectiveSelectedId}
      onSelectInstitution={handleSelectInstitution}
    >
      {children}
    </AdminLayoutView>
  )
}
