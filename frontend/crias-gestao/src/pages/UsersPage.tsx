import { useMemo, useState } from 'react'
import { useCollection } from '../hooks/useCollection'
import { useGestao } from '../hooks/useGestao'
import { useAuth } from '../hooks/useAuth'
import { usePermissions } from '../hooks/usePermissions'
import {
  adminUserDocId,
  parseMasterAdminEmailsFromEnv,
} from '../lib/adminPermissions'
import { ADMIN_USERS_COLLECTION, snapshotToAdminUser } from '../lib/adminUserFirestore'
import type { AdminUser } from '../types/adminUser'
import { Banner, BootSymbol, PageHead } from '../design/gx/ui'
import { UsersBulk } from './admin/UsersBulk'
import { ProfilesCard } from './admin/ProfilesCard'
import { useProfileEdits } from './admin/useProfileEdits'
import { EditBar } from '../components/EditBar'
import { useUnsavedChanges } from '../contexts/UnsavedContext'
import { UsersReadTable } from './admin/UsersReadTable'

/** Masters só no env (sem doc em admin_users) aparecem na aba Crias. */
function masterStub(email: string): AdminUser {
  return {
    id: adminUserDocId(email),
    email,
    active: true,
    is_super_admin: true,
    is_master: true,
    all_institutions: true,
    institution_ids: [],
    nav_permissions: [],
    created_at: null,
    updated_at: null,
  }
}

/** Usuários (Super admin, 1.1.12 e orientação 15): abas Crias e Instituições. */
export function UsersPage() {
  const g = useGestao()
  const { hasFullAccess, adminProfile } = usePermissions()
  const { user } = useAuth()
  const users = useCollection(ADMIN_USERS_COLLECTION, snapshotToAdminUser)
  const [tab, setTab] = useState<'crias' | 'inst'>('crias')
  const isSuper = hasFullAccess || Boolean(adminProfile?.is_super_admin)

  const crias = useMemo(() => {
    const fromDb = users.rows.filter((u) => {
      const email = (u.email || '').toLowerCase()
      if (email.endsWith('@crias.ai') || email.endsWith('@crias.org')) return true
      if (u.is_master || u.is_super_admin || u.all_institutions) return true
      return u.institution_ids.length === 0
    })
    const seen = new Set(
      fromDb.map((u) => (u.email || '').toLowerCase()).filter(Boolean),
    )
    // MASTER_ADMIN_EMAILS / VITE_MASTER_ADMIN_EMAILS: aparecem mesmo sem doc.
    const fromEnv = parseMasterAdminEmailsFromEnv()
      .filter((email) => !seen.has(email))
      .map((email) => masterStub(email))
    return [...fromDb, ...fromEnv].sort((a, b) =>
      (a.email || '').localeCompare(b.email || '', 'pt-BR'),
    )
  }, [users.rows])
  const inst = useMemo(
    () => users.rows.filter((u) => !u.is_super_admin && !u.all_institutions && u.institution_ids.length > 0),
    [users.rows],
  )
  const profiles = useProfileEdits(users.rows, true)
  useUnsavedChanges(profiles.dirty, profiles.save)

  if (!users.ready || g.institutionsLoading) return <BootSymbol />
  if (!isSuper) {
    return (
      <div className="gx-page">
        <PageHead title="Usuários" />
        <Banner>Só o Super admin acessa esta página.</Banner>
      </div>
    )
  }

  return (
    <div className="gx-page">
      <PageHead
        title="Usuários"
        subtitle="Defina o cadastro e as permissões para cada usuário de gestão."
        titleAction={<EditBar dirty={profiles.dirty} onSave={profiles.save} onCancel={profiles.cancel} />}
      />
      {users.error ? <Banner onRetry={users.retry}>{users.error}</Banner> : null}
      <ProfilesCard menus={profiles.menus} canEdit onToggle={profiles.toggle} />
      <UsersBulk
        key={tab}
        scope={tab === 'crias' ? 'crias' : 'institution'}
        users={tab === 'crias' ? crias : inst}
        institutions={g.institutions.map((i) => ({ id: i.id, name: i.name }))}
        ownEmail={user?.email ?? null}
      />
      <UsersReadTable
        title="Usuários"
        users={tab === 'crias' ? crias : inst}
        showInstitution={tab === 'inst'}
        institutionName={g.institutionName}
        addHref={`/usuarios/novo?escopo=${tab === 'crias' ? 'crias' : 'instituicao'}`}
        tabs={
          <nav role="tablist" aria-label="Usuários" className="gx-tabs" style={{ marginTop: 0 }}>
            <button role="tab" type="button" className="gx-tab" aria-selected={tab === 'crias'} onClick={() => setTab('crias')}>
              Crias
            </button>
            <button role="tab" type="button" className="gx-tab" aria-selected={tab === 'inst'} onClick={() => setTab('inst')}>
              Instituições
            </button>
          </nav>
        }
      />
    </div>
  )
}
