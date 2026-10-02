import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconChevronDown } from '../components/icons/KpiIcons'

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

export type AdminLayoutInstitutionOption = {
  id: string
  label: string
}

/** Chaves da nav principal do redesign (rotas atuais; só rótulos mudam). */
const PRIMARY_NAV_KEYS = ['dashboard', 'trail_new', 'student_new'] as const

const PRIMARY_LABELS: Record<(typeof PRIMARY_NAV_KEYS)[number], string> = {
  dashboard: 'Visão geral',
  trail_new: 'Trilhas',
  student_new: 'Alunos',
}

const CONFIG_NAV_KEYS = [
  'home',
  'gerenciamento',
  'admin',
  'gabarito',
  'institution_new',
  'doc',
] as const

export type AdminLayoutViewProps = {
  brandLabel: string
  navEntries: AdminLayoutNavEntry[]
  userEmail: string | null
  userRoleLabel?: string | null
  permissionsLoading: boolean
  authed: boolean
  onLogout: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  children: ReactNode
  guestLinks: AdminLayoutGuestLink[]
  helpMailto: string
  appVersion: string
  /** Fase A/B: seletor opcional; oculto se vazio. */
  institutionOptions?: AdminLayoutInstitutionOption[]
  selectedInstitutionId?: string | null
  onSelectInstitution?: (id: string | null) => void
  manageInstitutionsHref?: string
}

function flattenLinks(entries: AdminLayoutNavEntry[]): AdminLayoutNavLink[] {
  const links: AdminLayoutNavLink[] = []
  for (const entry of entries) {
    if (entry.type === 'link') {
      links.push(entry)
    } else {
      for (const child of entry.children) {
        links.push({
          type: 'link',
          key: child.key,
          path: child.path,
          label: child.label,
          active: child.active,
        })
      }
    }
  }
  return links
}

function initialsFromEmail(email: string | null): string {
  const base = (email ?? '').trim()
  if (!base) return 'U'
  const local = base.split('@')[0] ?? base
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase()
  }
  return local.slice(0, 2).toUpperCase()
}

export function AdminLayoutView({
  brandLabel,
  navEntries,
  userEmail,
  userRoleLabel,
  permissionsLoading,
  authed,
  onLogout,
  theme,
  onToggleTheme,
  children,
  guestLinks,
  helpMailto,
  appVersion,
  institutionOptions = [],
  selectedInstitutionId = null,
  onSelectInstitution,
  manageInstitutionsHref = '/',
}: AdminLayoutViewProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [instOpen, setInstOpen] = useState(false)
  const topRef = useRef<HTMLElement>(null)

  const allLinks = useMemo(() => flattenLinks(navEntries), [navEntries])

  const primaryLinks = useMemo(() => {
    return PRIMARY_NAV_KEYS.flatMap((key) => {
      const found = allLinks.find((l) => l.key === key)
      if (!found) return []
      return [
        {
          ...found,
          label: PRIMARY_LABELS[key],
        },
      ]
    })
  }, [allLinks])

  const configLinks = useMemo(() => {
    const byKey = new Map(allLinks.map((l) => [l.key, l]))
    return CONFIG_NAV_KEYS.flatMap((key) => {
      const found = byKey.get(key)
      if (!found) return []
      const labelMap: Record<string, string> = {
        home: 'Início',
        gerenciamento: 'Visão por instituição',
        admin: 'Usuários e acesso',
        gabarito: 'Gabaritos',
        institution_new: 'Nova instituição',
        doc: 'API e documentação',
      }
      return [{ ...found, label: labelMap[key] ?? found.label }]
    })
  }, [allLinks])

  const configActive = configLinks.some((l) => l.active)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!topRef.current?.contains(e.target as Node)) {
        setUserMenuOpen(false)
        setConfigOpen(false)
        setInstOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const avatarTitle = [userEmail || 'Usuário', userRoleLabel]
    .filter(Boolean)
    .join(' · ')

  const selectedInstitutionLabel =
    institutionOptions.find((o) => o.id === selectedInstitutionId)?.label ??
    null

  return (
    <div className="shell" data-shell="admin">
      <header className="shell__top" ref={topRef}>
        <Link
          to={authed ? '/dashboard' : '/login'}
          className="shell__brand"
          aria-label={brandLabel}
        >
          <img
            className="shell__brand-logo"
            src="/crias-logo-dark.png"
            alt="Crias"
            height={22}
          />
        </Link>

        {authed && institutionOptions.length > 0 ? (
          <div className="shell__inst">
            <button
              type="button"
              className="shell__inst-trigger"
              aria-expanded={instOpen}
              aria-haspopup="listbox"
              onClick={() => {
                setInstOpen((o) => !o)
                setConfigOpen(false)
                setUserMenuOpen(false)
              }}
            >
              <span className="shell__inst-copy">
                <span className="shell__inst-label">Instituição</span>
                <span className="shell__inst-name">
                  {selectedInstitutionLabel || 'Selecionar'}
                </span>
              </span>
              <IconChevronDown />
            </button>
            {instOpen ? (
              <div className="shell__inst-menu" role="listbox">
                {institutionOptions.map((inst) => {
                  const selected = inst.id === selectedInstitutionId
                  return (
                    <button
                      key={inst.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={
                        selected
                          ? 'shell__inst-option shell__inst-option--selected'
                          : 'shell__inst-option'
                      }
                      onClick={() => {
                        onSelectInstitution?.(inst.id)
                        setInstOpen(false)
                      }}
                    >
                      <span>{inst.label}</span>
                    </button>
                  )
                })}
                <Link
                  className="shell__inst-manage"
                  to={manageInstitutionsHref}
                  onClick={() => setInstOpen(false)}
                >
                  Gerenciar instituições
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        <nav className="shell__primary-nav" aria-label="Navegação principal">
          {!authed ? (
            guestLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="shell__primary-link"
              >
                {link.label}
              </Link>
            ))
          ) : permissionsLoading ? (
            <span className="crias-label">Carregando menu…</span>
          ) : (
            primaryLinks.map((link) => (
              <Link
                key={link.key}
                to={link.path}
                className={
                  link.active
                    ? 'shell__primary-link shell__primary-link--active'
                    : 'shell__primary-link'
                }
                aria-current={link.active ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))
          )}
        </nav>

        <div className="shell__top-right">
          {authed && configLinks.length > 0 ? (
            <button
              type="button"
              className={
                configActive || configOpen
                  ? 'shell__icon-btn shell__icon-btn--active'
                  : 'shell__icon-btn'
              }
              aria-label="Configurações"
              aria-expanded={configOpen}
              onClick={() => {
                setConfigOpen((o) => !o)
                setUserMenuOpen(false)
                setInstOpen(false)
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.1.7.7 1.2 1.5 1.2H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            </button>
          ) : null}

          {authed ? (
            <button
              type="button"
              className="shell__avatar"
              title={avatarTitle}
              aria-label={avatarTitle}
              aria-expanded={userMenuOpen}
              onClick={() => {
                setUserMenuOpen((o) => !o)
                setConfigOpen(false)
                setInstOpen(false)
              }}
            >
              {initialsFromEmail(userEmail)}
            </button>
          ) : null}
        </div>

        {configOpen ? (
          <div className="shell__config-panel" role="menu">
            {configLinks.map((link) => (
              <Link
                key={link.key}
                to={link.path}
                role="menuitem"
                aria-current={link.active ? 'page' : undefined}
                onClick={() => setConfigOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}

        {userMenuOpen ? (
          <div className="shell__user-menu" role="menu">
            <div className="shell__user-menu-email">{avatarTitle}</div>
            <a href={helpMailto} role="menuitem">
              Ajuda
            </a>
            <button type="button" role="menuitem" onClick={onToggleTheme}>
              {theme === 'light' ? 'Modo escuro' : 'Modo claro'}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setUserMenuOpen(false)
                onLogout()
              }}
            >
              Sair
            </button>
          </div>
        ) : null}
      </header>

      <div className="shell__main">
        <div className="shell__content">{children}</div>
      </div>

      <p className="app-version" aria-label={`Versão ${appVersion}`}>
        {appVersion}
      </p>
    </div>
  )
}
