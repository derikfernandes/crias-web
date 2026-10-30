import { useMemo } from 'react'
import { useCollection } from '../hooks/useCollection'
import { useGestao } from '../hooks/useGestao'
import { useAuth } from '../hooks/useAuth'
import { usePermissions } from '../hooks/usePermissions'
import { ADMIN_USERS_COLLECTION, snapshotToAdminUser } from '../lib/adminUserFirestore'
import { Banner, BootSymbol, PageHead } from '../design/gx/ui'
import { UsersBulk } from './admin/UsersBulk'
import { ProfilesCard } from './admin/ProfilesCard'
import { useProfileEdits } from './admin/useProfileEdits'
import { EditBar } from '../components/EditBar'
import { useUnsavedChanges } from '../contexts/UnsavedContext'
import { UsersReadTable } from './admin/UsersReadTable'

/** Permissões (1.1.15): perfis prontos e usuários da instituição. Usa só os campos de `admin_users`. */
export function AdminPage() {
  const g = useGestao()
  const { adminProfile, hasFullAccess } = usePermissions()
  const { user } = useAuth()
  const users = useCollection(ADMIN_USERS_COLLECTION, snapshotToAdminUser)
  const isSuper = hasFullAccess || Boolean(adminProfile?.is_super_admin)
  const mine = g.myInstitutionId

  const visible = useMemo(
    () =>
      users.rows.filter((u) => {
        if (u.is_super_admin) return false
        if (isSuper) return true
        return mine ? u.institution_ids.includes(mine) : false
      }),
    [users.rows, isSuper, mine],
  )
  const profiles = useProfileEdits(users.rows, isSuper)
  useUnsavedChanges(profiles.dirty, profiles.save)

  if (!users.ready || g.institutionsLoading) return <BootSymbol />

  return (
    <div className="gx-page">
      <PageHead
        title="Usuários"
        subtitle="Defina o cadastro e as permissões para cada usuário de gestão da instituição."
        titleAction={<EditBar dirty={profiles.dirty} onSave={profiles.save} onCancel={profiles.cancel} />}
      />
      {users.error ? <Banner onRetry={users.retry}>{users.error}</Banner> : null}

      <ProfilesCard menus={profiles.menus} canEdit={isSuper} onToggle={profiles.toggle} />

      <UsersBulk
        scope="institution"
        users={visible}
        institutions={g.institutions.map((i) => ({ id: i.id, name: i.name }))}
        fixedInstitutionId={isSuper ? null : mine}
        ownEmail={user?.email ?? null}
      />

      <UsersReadTable
        users={visible}
        showInstitution={isSuper}
        institutionName={g.institutionName}
        addHref="/usuarios/novo?escopo=instituicao"
      />
    </div>
  )
}
