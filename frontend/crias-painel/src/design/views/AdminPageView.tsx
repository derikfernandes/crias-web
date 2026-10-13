import type { AdminPageViewProps } from '../types/adminPageView'

export type {
  AdminNavItemOption,
  AdminInstitutionOption,
  AdminUserRow,
  AdminFormViewModel,
  AdminPageViewProps,
} from '../types/adminPageView'

export function AdminPageView(props: AdminPageViewProps) {
  if (props.status === 'loading') {
    return <p className="muted">Carregando permissões…</p>
  }

  if (props.status === 'forbidden') {
    return (
      <p className="banner banner--error" role="alert">
        Você não tem permissão para acessar o painel de administração.
      </p>
    )
  }

  const {
    listError,
    editingId,
    form,
    formError,
    saving,
    loadingUsers,
    navItems,
    institutions,
    users,
    onStartCreate,
    onEmailChange,
    onActiveChange,
    onSuperAdminChange,
    onAllInstitutionsChange,
    onToggleNav,
    onToggleInstitution,
    onSubmit,
    onEditUser,
    onDeleteUser,
  } = props

  return (
    <>
      <header className="admin__header">
        <h1>Admin — permissões por login</h1>
        <p className="admin__lede">
          Defina quais tópicos do menu cada e-mail pode ver e quais instituições
          ele pode acessar. O e-mail deve ser o mesmo da conta Firebase Auth.
          Logins <strong>sem registro aqui</strong> continuam com acesso total
          até você configurá-los.
        </p>
      </header>

      {listError ? (
        <p className="banner banner--error" role="alert">
          {listError}
        </p>
      ) : null}

      <div className="admin-permissions">
        <section className="panel admin-permissions__form-panel">
          <div className="panel__head">
            <h2>{editingId ? 'Editar login' : 'Novo login'}</h2>
            {editingId ? (
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={onStartCreate}
              >
                Cancelar edição
              </button>
            ) : null}
          </div>

          <form className="form admin-permissions__form" onSubmit={onSubmit}>
            <label className="field">
              <span>E-mail do login</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="usuario@escola.com"
                disabled={Boolean(editingId)}
                required
              />
            </label>

            <label className="field field--inline">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => onActiveChange(e.target.checked)}
              />
              <span>Login ativo</span>
            </label>

            <label className="field field--inline">
              <input
                type="checkbox"
                checked={form.is_super_admin}
                onChange={(e) => onSuperAdminChange(e.target.checked)}
              />
              <span>Super admin (acesso total)</span>
            </label>

            {!form.is_super_admin ? (
              <>
                <fieldset className="admin-permissions__fieldset">
                  <legend>Tópicos do menu</legend>
                  <div className="admin-permissions__checks">
                    {navItems.map((item) => (
                      <label key={item.key} className="field field--inline">
                        <input
                          type="checkbox"
                          checked={form.nav_permissions.includes(item.key)}
                          onChange={() => onToggleNav(item.key)}
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="field field--inline">
                  <input
                    type="checkbox"
                    checked={form.all_institutions}
                    onChange={(e) => onAllInstitutionsChange(e.target.checked)}
                  />
                  <span>Todas as instituições</span>
                </label>

                {!form.all_institutions ? (
                  <fieldset className="admin-permissions__fieldset">
                    <legend>Instituições permitidas</legend>
                    {institutions.length === 0 ? (
                      <p className="muted">Nenhuma instituição cadastrada.</p>
                    ) : (
                      <div className="admin-permissions__checks">
                        {institutions.map((inst) => (
                          <label key={inst.id} className="field field--inline">
                            <input
                              type="checkbox"
                              checked={form.institution_ids.includes(inst.id)}
                              onChange={() => onToggleInstitution(inst.id)}
                            />
                            <span>
                              {inst.label}{' '}
                              <span className="muted">({inst.id})</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </fieldset>
                ) : null}
              </>
            ) : null}

            {formError ? (
              <p className="form__error" role="alert">
                {formError}
              </p>
            ) : null}

            <div className="form__actions">
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Adicionar login'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>Logins configurados</h2>
            {loadingUsers ? <span className="muted">Carregando…</span> : null}
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>E-mail</th>
                  <th>Ativo</th>
                  <th>Escopo</th>
                  <th>Menu</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && !loadingUsers ? (
                  <tr>
                    <td colSpan={5} className="muted table__empty">
                      Nenhum login configurado. Adicione o primeiro ao lado.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>{user.activeLabel}</td>
                      <td>{user.scopeLabel}</td>
                      <td>{user.menuLabel}</td>
                      <td className="table__actions">
                        <button
                          type="button"
                          className="btn btn--small btn--ghost"
                          onClick={() => onEditUser(user.id)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn--small btn--ghost"
                          onClick={() => onDeleteUser(user.id)}
                          disabled={user.deleting}
                        >
                          {user.deleting ? 'Removendo…' : 'Remover'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  )
}
