import { useEffect, useMemo, useState } from 'react'
import { useCollection } from '../hooks/useCollection'
import { useGestao } from '../hooks/useGestao'
import { usePermissions } from '../hooks/usePermissions'
import {
  DEFAULT_PROFILES,
  loadProfiles,
  MENU_ITEMS,
  PROFILE_LABEL,
  saveProfileMenu,
  type MenuKey,
  type ProfileId,
} from '../lib/adminProfiles'
import { ADMIN_USERS_COLLECTION, snapshotToAdminUser } from '../lib/adminUserFirestore'
import { deleteAdminUser, saveAdminUser, type UserDraft } from '../lib/adminUsersOps'
import { Banner, BootSymbol, PageHead } from '../design/gx/ui'
import { UsersTable, rowFromUser, type UserRowModel } from './admin/UsersTable'

const EMPTY: UserDraft = { email: '', name: '', phone: '', profile: 'basico', institutionIds: [], active: true }

/** Permissões (1.1.15): perfis (menu por perfil) e usuários da instituição. */
export function AdminPage() {
  const g = useGestao()
  const { adminProfile, hasFullAccess } = usePermissions()
  const users = useCollection(ADMIN_USERS_COLLECTION, snapshotToAdminUser)
  const [menus, setMenus] = useState<Record<ProfileId, MenuKey[]>>(DEFAULT_PROFILES)
  const [menusReady, setMenusReady] = useState(false)
  const [drafts, setDrafts] = useState<UserRowModel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const isSuper = hasFullAccess || Boolean(adminProfile?.is_super_admin)

  useEffect(() => {
    void loadProfiles()
      .then(setMenus)
      .catch(() => undefined)
      .finally(() => setMenusReady(true))
  }, [])

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
    () => [...drafts, ...visible.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email, 'pt-BR')).map(rowFromUser)],
    [drafts, visible],
  )

  async function toggleMenu(profile: ProfileId, key: MenuKey) {
    if (!isSuper) return
    const current = menus[profile]
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    setError(null)
    try {
      await saveProfileMenu(profile, next, menus, users.rows)
      setMenus({ ...menus, [profile]: next })
      setNotice('Menu do perfil salvo.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar o menu do perfil.')
    }
  }

  if (!users.ready || !menusReady || g.institutionsLoading) return <BootSymbol />

  return (
    <div className="gx-page">
      <PageHead title="Permissões" subtitle="Defina quais as permissões para cada usuário da instituição." />
      {error ? <Banner>{error}</Banner> : null}
      {users.error ? <Banner onRetry={users.retry}>{users.error}</Banner> : null}
      {notice ? <Banner tone="ok">{notice}</Banner> : null}

      <section className="gx-card" aria-label="Perfis">
        <h2>Perfis</h2>
        {(['admin', 'basico'] as ProfileId[]).map((p) => (
          <div
            key={p}
            style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 18px', border: '1px solid var(--v-soft2)', borderRadius: 12, padding: '12px 14px' }}
          >
            <strong style={{ fontSize: 15, minWidth: 70 }}>{PROFILE_LABEL[p]}</strong>
            {MENU_ITEMS.map((m) => {
              const unavailable = p === 'basico' && m.key === 'senhas'
              return (
                <label key={m.key} className="gx-check" style={{ opacity: unavailable ? 0.4 : 1 }}>
                  <input
                    type="checkbox"
                    checked={!unavailable && menus[p].includes(m.key)}
                    disabled={!isSuper || unavailable}
                    onChange={() => void toggleMenu(p, m.key)}
                  />
                  {m.label}
                </label>
              )
            })}
          </div>
        ))}
        <p className="gx-muted" style={{ fontSize: 12 }}>
          {isSuper ? 'Super admin acessa tudo.' : 'Só o Super admin edita os perfis. Você pode ver o menu de cada um.'}
        </p>
      </section>

      <section className="gx-card" aria-label="Usuários">
        <div className="gx-card__head">
          <h2>Usuários</h2>
          <button
            type="button"
            className="gx-btn gx-btn--primary"
            onClick={() =>
              setDrafts((d) => [
                { id: `${Date.now()}`, isNew: true, draft: { ...EMPTY, institutionIds: mine ? [mine] : [] } },
                ...d,
              ])
            }
          >
            + Novo usuário
          </button>
        </div>
        <UsersTable
          rows={rows}
          canEdit
          profileOptions={[
            { value: 'admin', label: 'Admin' },
            { value: 'basico', label: 'Básico' },
          ]}
          showInstitution={isSuper}
          institutionOptions={g.institutions.map((i) => ({ value: i.id, label: i.name || i.id }))}
          onSave={async (row, draft) => {
            await saveAdminUser(
              { ...draft, institutionIds: isSuper ? draft.institutionIds : mine ? [mine] : [] },
              menus,
              'institution',
              row.isNew,
            )
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
