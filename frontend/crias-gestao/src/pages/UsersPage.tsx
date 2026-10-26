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
import { deleteAdminUser, saveAdminUser, type UserDraft } from '../lib/adminUsersOps'
import type { AdminUser } from '../types/adminUser'
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
  const [drafts, setDrafts] = useState<{ crias: UserRowModel[]; inst: UserRowModel[] }>({ crias: [], inst: [] })
  const [notice, setNotice] = useState<string | null>(null)
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
  const criasRows = [...drafts.crias, ...crias.map(rowFromUser)]
  const instRows = [...drafts.inst, ...inst.sort((a, b) => (a.institution_ids[0] ?? '').localeCompare(b.institution_ids[0] ?? '')).map(rowFromUser)]

  const edit = useUserEdits(tab === 'crias' ? criasRows : instRows)
  const profiles = useProfileEdits(users.rows, true)
  const saveEdit = async (row: UserRowModel, draft: UserDraft) => {
    await saveAdminUser(draft, tab === 'crias' ? 'crias' : 'institution', false)
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
  if (!isSuper) {
    return (
      <div className="gx-page">
        <PageHead title="Usuários" />
        <Banner>Só o Super admin acessa esta página.</Banner>
      </div>
    )
  }

  const add = () =>
    setDrafts((d) => ({
      ...d,
      [tab]: [{ id: `${Date.now()}`, isNew: true, draft: { ...EMPTY, profile: tab === 'crias' ? 'super' : 'basico' } }, ...d[tab]],
    }))

  return (
    <div className="gx-page">
      <PageHead
        title="Usuários"
        subtitle="Cadastro de usuários para o painel de gestão."
        titleAction={<EditBar dirty={dirtyAll} onSave={saveAllEdits} onCancel={cancelAll} />}
      />
      {users.error ? <Banner onRetry={users.retry}>{users.error}</Banner> : null}
      {notice ? <Banner tone="ok">{notice}</Banner> : null}
      <ProfilesCard menus={profiles.menus} canEdit onToggle={profiles.toggle} />
      <UsersBulk
        key={tab}
        scope={tab === 'crias' ? 'crias' : 'institution'}
        users={tab === 'crias' ? crias : inst}
        institutions={g.institutions.map((i) => ({ id: i.id, name: i.name }))}
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
          <button type="button" className="gx-btn gx-btn--primary" onClick={add}>
            + Adicionar usuário
          </button>
        </div>
        <nav role="tablist" aria-label="Usuários" className="gx-tabs" style={{ marginTop: 0 }}>
          <button role="tab" type="button" className="gx-tab" aria-selected={tab === 'crias'} onClick={() => setTab('crias')}>
            Crias
          </button>
          <button role="tab" type="button" className="gx-tab" aria-selected={tab === 'inst'} onClick={() => setTab('inst')}>
            Instituições
          </button>
        </nav>
        {tab === 'crias' ? (
          <UsersTable
            rows={criasRows}
            canEdit={edit.editing}
            edits={edit.edits}
            onChangeDraft={edit.onChangeDraft}
            profileOptions={[
              { value: 'super', label: 'Super admin' },
              { value: 'admin', label: 'Admin' },
              { value: 'basico', label: 'Básico' },
            ]}
            onSave={async (row, draft) => {
              await saveAdminUser(draft, 'crias', row.isNew)
              setDrafts((d) => ({ ...d, crias: d.crias.filter((x) => x.id !== row.id) }))
              setNotice('Usuário salvo.')
            }}
            onDelete={async (row) => {
              await deleteAdminUser(row.id)
              setNotice('Usuário excluído.')
            }}
            onDiscardNew={(row) => setDrafts((d) => ({ ...d, crias: d.crias.filter((x) => x.id !== row.id) }))}
          />
        ) : (
          <UsersTable
            rows={instRows}
            canEdit={edit.editing}
            edits={edit.edits}
            onChangeDraft={edit.onChangeDraft}
            showInstitution
            institutionOptions={g.institutions.map((i) => ({ value: i.id, label: i.name || i.id }))}
            profileOptions={[
              { value: 'admin', label: 'Admin' },
              { value: 'basico', label: 'Básico' },
            ]}
            onSave={async (row, draft) => {
              await saveAdminUser(draft, 'institution', row.isNew)
              setDrafts((d) => ({ ...d, inst: d.inst.filter((x) => x.id !== row.id) }))
              setNotice('Usuário salvo.')
            }}
            onDelete={async (row) => {
              await deleteAdminUser(row.id)
              setNotice('Usuário excluído.')
            }}
            onDiscardNew={(row) => setDrafts((d) => ({ ...d, inst: d.inst.filter((x) => x.id !== row.id) }))}
          />
        )}
      </section>
    </div>
  )
}
