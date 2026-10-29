import FullscreenButton from '../components/FullscreenButton'
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Link, useLocation } from 'react-router-dom'
import { GestaoProvider } from '../contexts/GestaoContext'
import { UnsavedProvider, useGuardedNavigate } from '../contexts/UnsavedContext'
import { useAuth } from '../hooks/useAuth'
import { useGestao } from '../hooks/useGestao'
import { usePermissions } from '../hooks/usePermissions'
import {
  GX_NAV,
  gxHasScopeFilter,
  gxSectionForPath,
  type GxNavGroup,
  type GxNavItem,
  type GxNavLink,
  type GxSection,
} from '../lib/gestaoNav'
import {
  BootSymbol,
  ConfirmDialog,
  FilterPopover,
  Horizon,
  Icon,
  useFadeMasks,
} from '../design/gx/ui'

const MOBILE_QUERY = '(max-width: 768px)'

function isMobile(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
}

/**
 * Moldura autenticada da Gestão v1.1: menu lateral, topo (Voltar e filtro),
 * fundo e carregamento. Permissões e escopo vêm dos hooks; as páginas só
 * desenham o conteúdo.
 */
function Shell({ children }: { children: ReactNode }) {
  const { user, signOut, loading: authLoading } = useAuth()
  const { canNav, permissionsLoading, isMaster } = usePermissions()
  const { isSuper, institutions, selectedIds, setSelectedIds, institutionsLoading, myInstitutionId, institutionName } =
    useGestao()
  const location = useLocation()
  const guardedNavigate = useGuardedNavigate()
  const authed = Boolean(user)
  // Enquanto o Auth resolve, não mostrar menu de visitante (Entrar / só doc).
  const authSettling = authLoading || (authed && permissionsLoading)
  const mainRef = useRef<HTMLElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return window.localStorage.getItem('crias-theme') === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })

  useFadeMasks()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      window.localStorage.setItem('crias-theme', theme)
    } catch {
      // O tema continua valendo mesmo se o navegador bloquear o armazenamento.
    }
  }, [theme])

  // Altura pela área visível, nunca 100vh (F-regras do celular).
  useEffect(() => {
    const root = document.documentElement
    const vv = window.visualViewport
    const sync = () => {
      if (!vv) return
      root.style.setProperty('--vvh', `${Math.round(vv.height)}px`)
      root.style.setProperty('--vvt', `${Math.round(vv.offsetTop)}px`)
    }
    sync()
    vv?.addEventListener('resize', sync)
    vv?.addEventListener('scroll', sync)
    return () => {
      vv?.removeEventListener('resize', sync)
      vv?.removeEventListener('scroll', sync)
    }
  }, [])

  // Ao navegar: conteúdo volta ao topo; no celular o menu fecha.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
    if (isMobile()) setSidebarOpen(false)
  }, [location.pathname, location.search])

  const section: GxSection = gxSectionForPath(location.pathname)
  const homeMode = section === 'home' && location.pathname === '/'
  const showScopeFilter = authed && gxHasScopeFilter(location.pathname)
  const canBack = (window.history.state?.idx ?? 0) > 0

  const visible = useCallback(
    (item: GxNavItem) => {
      if (!canNav(item.permission)) return false
      if (item.master && !isMaster) return false
      if (item.superOnly && !isSuper) return false
      return true
    },
    [canNav, isMaster, isSuper],
  )

  const entries = useMemo(() => {
    const out: Array<GxNavLink | (GxNavGroup & { children: GxNavGroup['children'] })> = []
    for (const e of GX_NAV) {
      if (e.type === 'link') {
        if (canNav(e.permission)) out.push(e)
        continue
      }
      const kids: GxNavGroup['children'] = []
      for (const c of e.children) {
        if (c.type === 'head') {
          if (c.superOnly && !isSuper) continue
          kids.push(c)
        } else if (visible(c)) kids.push(c)
      }
      // Remove subtítulos sem itens depois deles.
      const clean = kids.filter((k, i) => k.type !== 'head' || kids[i + 1]?.type === 'link')
      if (clean.some((k) => k.type === 'link')) out.push({ ...e, children: clean })
    }
    return out
  }, [canNav, isSuper, visible])

  const closeOnMobile = () => {
    if (isMobile()) setSidebarOpen(false)
  }

  const loadingBoot =
    authLoading || (authed && (permissionsLoading || institutionsLoading))
  const email = user?.email ?? ''
  const [dropdown, setDropdown] = useState<string | null>(null)
  useEffect(() => setDropdown(null), [location.pathname])

  const themeButton = (
    <button
      type="button"
      className="gx-iconbtn"
      aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
      title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
      onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
    >
      {theme === 'light' ? (
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      ) : (
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  )
  const logoutButton = (
    <button type="button" className="gx-iconbtn" aria-label="Sair" title="Sair" onClick={() => setLogoutOpen(true)}>
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3M14 8l4 4-4 4M18 12H9.5" />
      </svg>
    </button>
  )
  const avatarLink = (
    <Link to="/perfil" className="gx-me__avatar" aria-label="Abrir perfil" title={email} onClick={closeOnMobile}>
      {(email.charAt(0) || 'U').toUpperCase()}
    </Link>
  )
  const switchGroup = (
    <div className="gx-switch gx-switch--top" role="group" aria-label="Alternar entre educação e aluno">
      <button type="button" className="is-on" aria-pressed="true">
        Educação
      </button>
      <a
        href="/aluno/"
        aria-pressed="false"
        onClick={() => {
          try {
            window.localStorage.setItem('crias:acesso-gestao', '1')
          } catch {
            // sem armazenamento: o seletor do aluno só não aparece
          }
        }}
      >
        Aluno
      </a>
    </div>
  )

  const scopeFilter =
    showScopeFilter && isSuper && institutions.length > 0 ? (
      <FilterPopover
        label="Filtrar instituições"
        options={institutions.map((i) => ({ id: i.id, name: i.name || i.id }))}
        selected={selectedIds}
        onChange={(next) => {
          // Mínimo 1: ignora limpar/desmarcar o último.
          if (next.size === 0) return
          // Transição: checkmark otimista no popover; dados em baixa prioridade.
          startTransition(() => {
            setSelectedIds(next)
          })
        }}
        exclusiveOnLabel
        minSelected={1}
        emptyText="Nenhuma instituição encontrada."
      />
    ) : showScopeFilter && !isSuper && myInstitutionId ? (
      <div className="gx-schooltag">
        <span data-fade="1">{institutionName(myInstitutionId)}</span>
      </div>
    ) : null

  const [logoutOpen, setLogoutOpen] = useState(false)

  return (
    <div className="gx-root gx-frame gx-frame--top">
      {loadingBoot ? <BootSymbol /> : null}
      <header className="gx-tb" data-topbar="1">
        <Link to="/" className="gx-brand" aria-label="Ir para o início da Educação" onClick={closeOnMobile}>
          <img className="gx-brand__light" src="/crias-logo-educacao.svg" alt="Crias Educação" />
          <img className="gx-brand__dark" src="/crias-logo-educacao-branco.svg" alt="Crias Educação" />
        </Link>
        {authed && !authSettling ? (
          <nav className="gx-tbnav" aria-label="Navegação principal">
            {entries.map((e) =>
              e.type === 'link' ? (
                <Link
                  key={e.section}
                  to={e.path}
                  className={section === e.section ? 'gx-pill gx-pill--on' : 'gx-pill'}
                  aria-current={section === e.section ? 'page' : undefined}
                >
                  {e.label}
                </Link>
              ) : (
                <div key={e.id} className="gx-dd">
                  <button
                    type="button"
                    className={dropdown === e.id || e.children.some((c) => c.type === 'link' && c.section === section) ? 'gx-pill gx-pill--on' : 'gx-pill'}
                    aria-haspopup="menu"
                    aria-expanded={dropdown === e.id}
                    onClick={() => setDropdown((d) => (d === e.id ? null : e.id))}
                  >
                    {e.label}
                    <Icon name="chev-down" size={14} />
                  </button>
                  {dropdown === e.id ? (
                    <>
                      <div className="gx-dd__scrim" onClick={() => setDropdown(null)} />
                      <div role="menu" className="gx-dd__menu">
                        {e.children.map((c) =>
                          c.type === 'head' ? (
                            <p key={`h-${c.label}`} className="gx-dd__head" role="presentation">
                              {c.label}
                            </p>
                          ) : (
                            <Link
                              key={c.section}
                              to={c.path}
                              role="menuitem"
                              className={section === c.section ? 'gx-dd__item gx-dd__item--on' : 'gx-dd__item'}
                            >
                              {c.label}
                            </Link>
                          ),
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              ),
            )}
          </nav>
        ) : null}
        <span className="gx-tb__spacer" aria-hidden="true" />
        {authed && !authSettling ? (
          <div className="gx-tb__right">
            <div className="gx-tb__filter">{scopeFilter}</div>
            {switchGroup}
            <FullscreenButton />
            {themeButton}
            {avatarLink}
            {logoutButton}
          </div>
        ) : null}
        <button type="button" className="gx-iconbtn gx-tb__burger" aria-label="Abrir menu" onClick={() => setSidebarOpen(true)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        </button>
      </header>

      {sidebarOpen ? (
        <aside className="gx-drawer" aria-label="Navegação principal">
          <div className="gx-drawer__head">
            <Link to="/" className="gx-brand" aria-label="Ir para o início da Educação" onClick={closeOnMobile}>
              <img className="gx-brand__light" src="/crias-logo-educacao.svg" alt="Crias Educação" />
              <img className="gx-brand__dark" src="/crias-logo-educacao-branco.svg" alt="Crias Educação" />
            </Link>
            <button type="button" className="gx-iconbtn" aria-label="Fechar menu" onClick={() => setSidebarOpen(false)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="3" />
                <path d="M9 4v16" />
              </svg>
            </button>
          </div>
          <nav className="gx-drawer__nav">
            {authed && !authSettling ? (
              entries.map((e) =>
                e.type === 'link' ? (
                  <Link key={e.section} to={e.path} className={section === e.section ? 'gx-dd__item gx-dd__item--on' : 'gx-dd__item'} onClick={closeOnMobile}>
                    {e.label}
                  </Link>
                ) : (
                  <div key={e.id}>
                    <p className="gx-dd__head">{e.label}</p>
                    {e.children.map((c) =>
                      c.type === 'head' ? (
                        <p key={`h-${c.label}`} className="gx-dd__head gx-dd__head--sub" role="presentation">
                          {c.label}
                        </p>
                      ) : (
                        <Link key={c.section} to={c.path} className={section === c.section ? 'gx-dd__item gx-dd__item--on' : 'gx-dd__item'} onClick={closeOnMobile}>
                          {c.label}
                        </Link>
                      ),
                    )}
                  </div>
                ),
              )
            ) : (
              <Link to="/doc" className="gx-dd__item" onClick={closeOnMobile}>
                API e documentação
              </Link>
            )}
          </nav>
          {authed && !authSettling ? (
            <div className="gx-drawer__foot">
              {switchGroup}
              <div className="gx-drawer__row">
                {avatarLink}
                <span data-fade="1" className="gx-me__mail">
                  {email || 'Usuário'}
                </span>
                {themeButton}
                {logoutButton}
              </div>
            </div>
          ) : null}
        </aside>
      ) : null}

      <div className="gx-stage">
        <Horizon mode={homeMode ? 'home' : 'soft'} />
        <span className="gx-veil gx-veil--top" aria-hidden="true" />
        <span className="gx-veil gx-veil--bottom" aria-hidden="true" />
        <main className="gx-main" data-main="1" ref={mainRef}>
          <div className="gx-wrap">
            <div className="gx-topbar">
              {canBack ? (
                <button type="button" className="gx-backbtn" onClick={() => guardedNavigate(-1)}>
                  <Icon name="back" size={14} />
                  Voltar
                </button>
              ) : null}
              <span className="gx-topbar__spacer" aria-hidden="true" />
              <div className="gx-topbar__filter">{scopeFilter}</div>
              <span className="gx-topbar__fs">
                <FullscreenButton />
              </span>
            </div>
            {children}
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        title="Tem certeza que deseja sair da conta?"
        text="Suas alterações salvas continuam guardadas."
        confirmLabel="Sair"
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false)
          void signOut()
        }}
      />
    </div>
  )
}

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <GestaoProvider>
      <UnsavedProvider>
        <Shell>{children}</Shell>
      </UnsavedProvider>
    </GestaoProvider>
  )
}
