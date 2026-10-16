import { useMemo, useState } from 'react'
import { useCollection } from '../hooks/useCollection'
import { useGestao } from '../hooks/useGestao'
import { usePermissions } from '../hooks/usePermissions'
import { ADMIN_USERS_COLLECTION, snapshotToAdminUser } from '../lib/adminUserFirestore'
import { deleteAdminUser, saveAdminUser, type UserDraft } from '../lib/adminUsersOps'
import { Banner, BootSymbol, PageHead } from '../design/gx/ui'
import { UsersTable, rowFromUser, type UserRowModel } from './admin/UsersTable'

const EMPTY: UserDraft = { email: '', profile: 'basico', institutionIds: [], active: true }

/** Usuários (Super admin, 1.1.12 e orientação 15): abas Crias e Instituições. */
export function UsersPage() {
  const g = useGestao()
  const { hasFullAccess, adminProfile } = usePermissions()
  const users = useCollection(ADMIN_USERS_COLLECTION, snapshotToAdminUser)
  const [tab, setTab] = useState<'crias' | 'inst'>('crias')
  const [drafts, setDrafts] = useState<{ crias: UserRowModel[]; inst: UserRowModel[] }>({ crias: [], inst: [] })
  const [notice, setNotice] = useState<string | null>(null)
  const isSuper = hasFullAccess || Boolean(adminProfile?.is_super_admin)

  const crias = useMemo(
    () => users.rows.filter((u) => u.is_super_admin || u.all_institutions || u.institution_ids.length === 0),
    [users.rows],
  )
  const inst = useMemo(
    () => users.rows.filter((u) => !u.is_super_admin && !u.all_institutions && u.institution_ids.length > 0),
    [users.rows],
  )
  const criasRows = [...drafts.crias, ...crias.map(rowFromUser)]
  const instRows = [...drafts.inst, ...inst.sort((a, b) => (a.institution_ids[0] ?? '').localeCompare(b.institution_ids[0] ?? '')).map(rowFromUser)]

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
      <PageHead title="Usuários" subtitle="Cadastro de usuários para o painel de gestão." />
      {users.error ? <Banner onRetry={users.retry}>{users.error}</Banner> : null}
      {notice ? <Banner tone="ok">{notice}</Banner> : null}
      <section className="gx-card" aria-label="Usuários">
        <div className="gx-card__head">
          <h2>Usuários</h2>
          <button type="button" className="gx-btn gx-btn--primary" onClick={add}>
            + Novo usuário
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
            canEdit
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
            canEdit
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
