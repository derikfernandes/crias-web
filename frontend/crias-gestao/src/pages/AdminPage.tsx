import { useMemo, useState } from 'react'
import { useCollection } from '../hooks/useCollection'
import { useGestao } from '../hooks/useGestao'
import { useAuth } from '../hooks/useAuth'
import { usePermissions } from '../hooks/usePermissions'
import { ADMIN_USERS_COLLECTION, snapshotToAdminUser } from '../lib/adminUserFirestore'
import { deleteAdminUser, saveAdminUser, type UserDraft } from '../lib/adminUsersOps'
import { Banner, BootSymbol, PageHead } from '../design/gx/ui'
import { UsersBulk } from './admin/UsersBulk'
import { ProfilesCard } from './admin/ProfilesCard'
import { useProfileEdits } from './admin/useProfileEdits'
import { useUserEdits } from './admin/useUserEdits'
import { EditBar } from '../components/EditBar'
import { useUnsavedChanges } from '../contexts/UnsavedContext'
import { Icon } from '../design/gx/ui'
import { UsersTable, rowFromUser, type UserRowModel } from './admin/UsersTable'

const EMPTY: UserDraft = { email: '', profile: 'basico', institutionIds: [], active: true }

/** Permissões (1.1.15): perfis prontos e usuários da instituição. Usa só os campos de `admin_users`. */
export function AdminPage() {
  const g = useGestao()
  const { adminProfile, hasFullAccess } = usePermissions()
  const { user } = useAuth()
  const users = useCollection(ADMIN_USERS_COLLECTION, snapshotToAdminUser)
  const [drafts, setDrafts] = useState<UserRowModel[]>([])
  const [notice, setNotice] = useState<string | null>(null)
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
  const rows: UserRowModel[] = useMemo(
    () => [...drafts, ...[...visible].sort((a, b) => a.email.localeCompare(b.email, 'pt-BR')).map(rowFromUser)],
    [drafts, visible],
  )

  const edit = useUserEdits(rows)
  const profiles = useProfileEdits(users.rows, isSuper)
  const saveEdit = async (row: UserRowModel, draft: UserDraft) => {
    await saveAdminUser({ ...draft, institutionIds: isSuper ? draft.institutionIds : mine ? [mine] : [] }, 'institution', false)
    setNotice('Usuário salvo.')
    void row
  }
  const dirtyAll = edit.dirty || profiles.dirty
  const saveAllEdits = async () => {
    if (profiles.dirty) await profiles.save()
    if (edit.dirty) await edit.saveAll(saveEdit)
  }
  const cancelAll = () => {
    edit.cancel()
    profiles.cancel()
  }
  useUnsavedChanges(dirtyAll, saveAllEdits)

  if (!users.ready || g.institutionsLoading) return <BootSymbol />

  return (
    <div className="gx-page">
      <PageHead
        title="Permissões"
        subtitle="Defina quais as permissões para cada usuário da instituição."
        titleAction={<EditBar dirty={dirtyAll} onSave={saveAllEdits} onCancel={cancelAll} />}
      />
      {users.error ? <Banner onRetry={users.retry}>{users.error}</Banner> : null}
      {notice ? <Banner tone="ok">{notice}</Banner> : null}

      <ProfilesCard menus={profiles.menus} canEdit={isSuper} onToggle={profiles.toggle} />

      <UsersBulk
        scope="institution"
        users={visible}
        institutions={g.institutions.map((i) => ({ id: i.id, name: i.name }))}
        fixedInstitutionId={isSuper ? null : mine}
        ownEmail={user?.email ?? null}
      />

      <section className="gx-card" aria-label="Usuários">
        <div className="gx-card__head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2>Usuários</h2>
            <button type="button" className="gx-linkbtn" onClick={() => (edit.editing ? edit.cancel() : edit.setEditing(true))}>
              <Icon name="pencil" size={14} /> {edit.editing ? 'Sair da edição' : 'Editar'}
            </button>
          </div>
          <button
            type="button"
            className="gx-btn gx-btn--primary"
            onClick={() =>
              setDrafts((d) => [{ id: `${Date.now()}`, isNew: true, draft: { ...EMPTY, institutionIds: mine ? [mine] : [] } }, ...d])
            }
          >
            + Adicionar usuário
          </button>
        </div>
        <UsersTable
          rows={rows}
          canEdit={edit.editing}
          edits={edit.edits}
          onChangeDraft={edit.onChangeDraft}
          profileOptions={[
            { value: 'admin', label: 'Admin' },
            { value: 'basico', label: 'Básico' },
          ]}
          showInstitution={isSuper}
          institutionOptions={g.institutions.map((i) => ({ value: i.id, label: i.name || i.id }))}
          onSave={async (row, draft) => {
            await saveAdminUser({ ...draft, institutionIds: isSuper ? draft.institutionIds : mine ? [mine] : [] }, 'institution', row.isNew)
            setDrafts((d) => d.filter((x) => x.id !== row.id))
            setNotice('Usuário salvo.')
          }}
          onDelete={async (row) => {
            await deleteAdminUser(row.id)
            setNotice('Usuário excluído.')
          }}
          onDiscardNew={(row) => setDrafts((d) => d.filter((x) => x.id !== row.id))}
        />
      </section>
    </div>
  )
}
