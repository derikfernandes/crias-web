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

/** O item selecionado abre para o conteúdo: curvas de encaixe (1.1.23). */
function Curves() {
  return (
    <>
      <span className="gx-nav__tabfill" aria-hidden="true" />
      <svg
        aria-hidden="true"
        className="gx-nav__curve gx-nav__curve--up"
        width="24"
        height="23.5"
        viewBox="0 0 24 23.5"
      >
        <path d="M0 23.5A23.5 23.5 0 0 0 23.5 0H25V23.5Z" fill="var(--v-bg)" />
        <path d="M0 23.5A23.5 23.5 0 0 0 23.5 0" fill="none" stroke="var(--v-line)" strokeWidth="1" />
      </svg>
      <svg
        aria-hidden="true"
        className="gx-nav__curve gx-nav__curve--down"
        width="24"
        height="23.5"
        viewBox="0 0 24 23.5"
      >
        <path d="M0 0A23.5 23.5 0 0 1 23.5 23.5H25V0Z" fill="var(--v-bg)" />
        <path d="M0 0A23.5 23.5 0 0 1 23.5 23.5" fill="none" stroke="var(--v-line)" strokeWidth="1" />
      </svg>
    </>
  )
}

function NavLink({
  item,
  on,
  onGo,
}: {
  item: GxNavLink
  on: boolean
  onGo: () => void
}) {
  return (
    <div className={on ? 'gx-nav__item gx-nav__item--on' : 'gx-nav__item'}>
      <Link
        to={item.path}
        className={on ? 'gx-nav__btn gx-nav__btn--on' : 'gx-nav__btn'}
        aria-current={on ? 'page' : undefined}
        onClick={onGo}
      >
        {item.label}
      </Link>
      {on ? <Curves /> : null}
    </div>
  )
}

/**
 * Moldura autenticada da Educação 1.3 (INTERFACE.md 1.3.6 e 1.3.7): menu lateral esquerdo igual ao do Aluno
 * (280px, placa #fdfcf9 com cantos e borda esfumada, grupos com rótulo em caixa alta, item ativo com encaixe,
 * recolher, vMenuIn no celular, rodapé com switch, avatar + nome, seta, tema e sair), topo com Voltar e o filtro
 * de instituições (ou a etiqueta da escola) à direita. Sem tela cheia (1.3.6). Permissões e escopo vêm dos hooks; as páginas só
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
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobile())
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
  const { adminProfile } = usePermissions()
  /** Rodapé mostra o nome (não o e-mail), como no Aluno (1.3.7). */
  const displayName = adminProfile?.name?.trim() || email || 'Usuário'

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
  const switchGroup = (
    // 1.3.5: na Educação o switch aparece sempre; troca para a conta de aluno da mesma pessoa.
    <div className="gx-switch" role="group" aria-label="Alternar entre aluno e educação">
      <a
        href="/"
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
      <button type="button" className="is-on" aria-pressed="true">
        Educação
      </button>
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
    <div className="gx-root gx-frame">
      {loadingBoot ? <BootSymbol /> : null}
      {sidebarOpen ? (
        <aside className="gx-side" aria-label="Navegação principal">
          <span className="gx-side__line" aria-hidden="true" />
          <div className="gx-side__bg" aria-hidden="true" />
          <div className="gx-side__head">
            <Link to="/" className="gx-brand" aria-label="Ir para o início da Educação" onClick={closeOnMobile}>
              <img className="gx-brand__light" src={`${import.meta.env.BASE_URL}crias-logo-educacao.svg`} alt="Crias Educação" />
              <img className="gx-brand__dark" src={`${import.meta.env.BASE_URL}crias-logo-educacao-branco.svg`} alt="Crias Educação" />
            </Link>
            <button type="button" className="gx-iconbtn" aria-label="Fechar menu" onClick={() => setSidebarOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="3" />
                <path d="M9 4v16" />
              </svg>
            </button>
          </div>
          <nav className="gx-nav" data-navfade="1">
            <div className="gx-nav__inner">
              {authSettling ? null : authed ? (
                entries.map((e) =>
                  e.type === 'link' ? (
                    <NavLink key={e.section} item={e} on={section === e.section} onGo={closeOnMobile} />
                  ) : (
                    <div key={e.id}>
                      <p className="gx-nav__group">
                        <span>{e.label}</span>
                        <span aria-hidden="true" />
                      </p>
                      {e.children.map((c) =>
                        c.type === 'head' ? (
                          <p key={`h-${c.label}`} className="gx-nav__head" role="presentation">
                            {c.label}
                          </p>
                        ) : (
                          <NavLink key={c.section} item={c} on={section === c.section} onGo={closeOnMobile} />
                        ),
                      )}
                    </div>
                  ),
                )
              ) : (
                <>
                  <NavLink item={{ type: 'link', section: 'doc', label: 'API e documentação', path: '/doc', permission: 'doc' }} on={section === 'doc'} onGo={closeOnMobile} />
                  <NavLink item={{ type: 'link', section: 'home', label: 'Entrar', path: '/login', permission: 'home' }} on={false} onGo={closeOnMobile} />
                </>
              )}
            </div>
          </nav>
          {authed && !authSettling ? (
            <div className="gx-side__foot">
              {switchGroup}
              <div className="gx-me">
                <Link to="/perfil" className="gx-me__who" title={email} aria-label={`Abrir perfil de ${displayName}`} onClick={closeOnMobile}>
                  <span className="gx-me__avatar">{(displayName.charAt(0) || 'U').toUpperCase()}</span>
                  <span className="gx-me__mail" data-fade="1">
                    {displayName}
                  </span>
                  <Icon name="chev-right" size={14} />
                </Link>
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
              {!sidebarOpen ? (
                // 1.3.7: com o menu recolhido, o botão de abrir fica à esquerda do Voltar.
                <button type="button" className="gx-iconbtn gx-openmenu2" aria-label="Abrir menu" onClick={() => setSidebarOpen(true)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="16" rx="3" />
                    <path d="M9 4v16" />
                  </svg>
                </button>
              ) : null}
              {canBack ? (
                <button type="button" className="gx-backbtn" onClick={() => guardedNavigate(-1)}>
                  <Icon name="back" size={14} />
                  Voltar
                </button>
              ) : null}
              <span className="gx-topbar__spacer" aria-hidden="true" />
              {scopeFilter}
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
