import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type AdminLayoutNavChild = {
  key: string
  path: string
  label: string
  active: boolean
}

export type AdminLayoutNavLink = {
  type: 'link'
  key: string
  path: string
  label: string
  active: boolean
}

export type AdminLayoutNavGroup = {
  type: 'group'
  id: string
  label: string
  children: AdminLayoutNavChild[]
}

export type AdminLayoutNavEntry = AdminLayoutNavLink | AdminLayoutNavGroup

export type AdminLayoutGuestLink = {
  path: string
  label: string
}

export type AdminLayoutViewProps = {
  brandLabel: string
  navEntries: AdminLayoutNavEntry[]
  userEmail: string | null
  permissionsLoading: boolean
  authed: boolean
  onLogout: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  children: ReactNode
  guestLinks: AdminLayoutGuestLink[]
  helpMailto: string
  appVersion: string
}

export function AdminLayoutView({
  brandLabel,
  navEntries,
  userEmail,
  permissionsLoading,
  authed,
  onLogout,
  theme,
  onToggleTheme,
  children,
  guestLinks,
  helpMailto,
  appVersion,
}: AdminLayoutViewProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, true>>(
    {},
  )

  function toggleGroup(id: string) {
    setCollapsedGroups((prev) => {
      if (prev[id]) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: true }
    })
  }

  function closeMobile() {
    setMobileOpen(false)
  }

  const sidebar = (
    <aside className="shell__sidebar">
      <div className="shell__sidebar-top">
        <Link to="/" className="shell__brand" onClick={closeMobile}>
          <span className="shell__brand-mark" aria-hidden="true" />
          <span className="shell__brand-text">{brandLabel}</span>
        </Link>

        <nav className="shell__nav" aria-label="Navegação principal">
          {authed ? (
            permissionsLoading ? (
              <span className="shell__nav-muted">Carregando menu…</span>
            ) : (
              navEntries.map((entry) => {
                if (entry.type === 'link') {
                  return (
                    <Link
                      key={entry.key}
                      to={entry.path}
                      className={
                        entry.active
                          ? 'shell__nav-link shell__nav-link--active'
                          : 'shell__nav-link'
                      }
                      aria-current={entry.active ? 'page' : undefined}
                      onClick={closeMobile}
                    >
                      {entry.label}
                    </Link>
                  )
                }

                const open = !collapsedGroups[entry.id]
                return (
                  <div key={entry.id} className="shell__nav-group">
                    <button
                      type="button"
                      className="shell__nav-group-toggle"
                      aria-expanded={open}
                      onClick={() => toggleGroup(entry.id)}
                    >
                      <span>{entry.label}</span>
                      <span
                        className={
                          open
                            ? 'shell__nav-chevron shell__nav-chevron--open'
                            : 'shell__nav-chevron'
                        }
                        aria-hidden="true"
                      />
                    </button>
                    {open ? (
                      <div className="shell__nav-children">
                        {entry.children.map((child) => (
                          <Link
                            key={child.key}
                            to={child.path}
                            className={
                              child.active
                                ? 'shell__nav-link shell__nav-link--child shell__nav-link--active'
                                : 'shell__nav-link shell__nav-link--child'
                            }
                            aria-current={child.active ? 'page' : undefined}
                            onClick={closeMobile}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })
            )
          ) : (
            guestLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="shell__nav-link"
                onClick={closeMobile}
              >
                {link.label}
              </Link>
            ))
          )}
        </nav>
      </div>

      <div className="shell__sidebar-footer">
        <a className="shell__footer-link" href={helpMailto}>
          Ajuda
        </a>
        <button
          type="button"
          className="shell__footer-btn"
          aria-label={
            theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'
          }
          onClick={onToggleTheme}
        >
          {theme === 'light' ? 'Modo escuro' : 'Modo claro'}
        </button>
        {authed ? (
          <>
            <div className="shell__user">
              <span className="shell__user-avatar" aria-hidden="true">
                {(userEmail?.trim().charAt(0) || 'U').toUpperCase()}
              </span>
              <span className="shell__user-email" title={userEmail ?? undefined}>
                {userEmail || 'Usuário'}
              </span>
            </div>
            <button
              type="button"
              className="shell__footer-btn shell__footer-btn--danger"
              onClick={onLogout}
            >
              Sair
            </button>
          </>
        ) : null}
      </div>
    </aside>
  )

  return (
    <div className={mobileOpen ? 'shell shell--nav-open' : 'shell'}>
      <button
        type="button"
        className="shell__menu-toggle"
        aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
      >
        <span className="shell__menu-toggle-bars" aria-hidden="true" />
      </button>

      {mobileOpen ? (
        <button
          type="button"
          className="shell__backdrop"
          aria-label="Fechar menu"
          onClick={closeMobile}
        />
      ) : null}

      {sidebar}

      <div className="shell__main">
        <div className="shell__content">{children}</div>
      </div>

      <p className="app-version" aria-label={`Versão ${appVersion}`}>
        {appVersion}
      </p>
    </div>
  )
}
