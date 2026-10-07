import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  fetchTrailNames,
  fetchTrailStageTotals,
  isAuthError,
  listStudentTrails,
  type StudentTrailRow,
} from '../lib/api'
import { confirmOnline } from '../lib/connectivity'
import { toUserFacingError } from '../lib/networkError'
import {
  clearSession,
  getSession,
  SESSION_CLEARED_EVENT,
} from '../lib/session'
import { pickHomeTrail, writeFocusedTrailId } from '../lib/trailFocus'

const STATUS_LABEL: Record<StudentTrailRow['status'], string> = {
  not_started: 'Não iniciada',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  blocked: 'Bloqueada',
}

/**
 * Shell compacto (= drawer): portrait estreito OU landscape curto.
 * R24-LS01: só max-width:768 falhava em 844×390 (sidebar desktop sem ☰).
 * R20-N02 / P30: max-height 500→600 — evita cliff 800×501 sidebar ↔ 800×500
 * drawer (e 769/768×501) quando a barra do browser come 1px de vh.
 */
const COMPACT_MQ =
  '(max-width: 768px), (max-height: 600px) and (orientation: landscape)'

function isCompactViewport() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(COMPACT_MQ).matches
}

/** Compacto: drawer fechado por padrão (C5-MOBILE-SIDEBAR-CTA / LS01). */
function initialSidebarOpen() {
  if (typeof window === 'undefined') return true
  return !isCompactViewport()
}

function DocumentIcon() {
  return (
    <svg
      className="trail-card__doc"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M7 3.75h7.5L19 8.25V20.25a.75.75 0 0 1-.75.75H7.75A.75.75 0 0 1 7 20.25V3.75z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M14.5 3.75V8.5H19" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9.5 12h5M9.5 15.5h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 4.75H6.75A2 2 0 0 0 4.75 6.75v10.5a2 2 0 0 0 2 2H10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M14 8l4 4-4 4M18 12H9.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)
}

export default function ChatLayout() {
  const session = getSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [rows, setRows] = useState<StudentTrailRow[] | null>(null)
  const [trailsError, setTrailsError] = useState<string | null>(null)
  const [trailsLoading, setTrailsLoading] = useState(true)
  const [stageTotals, setStageTotals] = useState<Record<string, number>>({})
  /** C2-R1 N04: nome humano da trilha (nunca ID cru na UI). */
  const [trailNames, setTrailNames] = useState<Record<string, string>>({})
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen)
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  )
  const [isNarrow, setIsNarrow] = useState(() => isCompactViewport())
  const [playerChrome, setPlayerChrome] = useState<{
    trailId: string | null
    stageTitle: string | null
    stageNumber: number | null
    mariaActive: boolean
    /** Player mostra a trilha concluída (progresso completo). */
    completed?: boolean
  }>({ trailId: null, stageTitle: null, stageNumber: null, mariaActive: false })
  const drawerAsModal = isNarrow && sidebarOpen
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const restoreFocusRef = useRef(false)
  /**
   * C3-R13 N01: entry de history do drawer modal — back do SO fecha o dialog
   * sem sair da trilha; Esc/Fechar dá history.back() para limpar a entry.
   */
  const drawerHistoryPushedRef = useRef(false)
  const drawerClosingFromPopRef = useRef(false)
  /** Só a resposta mais recente de /student_trails aplica (sem stale fora de ordem). */
  const trailsReqSeqRef = useRef(0)

  // ER05: sessão sumiu mid-app → login (guarda rota para pós-login).
  useEffect(() => {
    if (!session) {
      navigate('/login', {
        replace: true,
        state: { reason: 'missing', from: location },
      })
    }
  }, [session, navigate, location])

  useEffect(() => {
    const onCleared = () => {
      navigate('/login', {
        replace: true,
        state: { reason: 'auth', from: location },
      })
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'crias_student_session' && !e.newValue) {
        navigate('/login', {
          replace: true,
          state: { reason: 'missing', from: location },
        })
      }
    }
    window.addEventListener(SESSION_CLEARED_EVENT, onCleared)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(SESSION_CLEARED_EVENT, onCleared)
      window.removeEventListener('storage', onStorage)
    }
  }, [navigate, location])

  const reloadTrails = useCallback(async () => {
    const s = getSession()
    if (!s) {
      clearSession('missing')
      navigate('/login', {
        replace: true,
        state: { reason: 'missing', from: location },
      })
      return
    }
    const seq = ++trailsReqSeqRef.current
    setTrailsLoading(true)
    setTrailsError(null)
    try {
      const data = await listStudentTrails(s.student_id)
      if (seq !== trailsReqSeqRef.current) return
      setRows(data)
    } catch (err) {
      if (seq !== trailsReqSeqRef.current) return
      if (isAuthError(err)) {
        clearSession('auth')
        navigate('/login', {
          replace: true,
          state: {
            reason: 'auth',
            message: (err as Error).message,
            from: location,
          },
        })
        return
      }
      setTrailsError(
        toUserFacingError(err, 'Não foi possível carregar suas trilhas.'),
      )
      setRows(null)
    } finally {
      if (seq === trailsReqSeqRef.current) setTrailsLoading(false)
    }
  }, [navigate, location])

  const reloadTrailsRef = useRef(reloadTrails)
  reloadTrailsRef.current = reloadTrails

  // R12-O01: indicador offline (não silencioso).
  // C3-R12 N02: evento `online` com rede morta — banner/CTA só após probe ok.
  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => {
      void (async () => {
        const ok = await confirmOnline()
        if (!ok) {
          setOffline(true)
          return
        }
        setOffline(false)
        void reloadTrailsRef.current()
      })()
    }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_MQ)
    const sync = () => {
      const compact = mq.matches
      setIsNarrow(compact)
      // R24-LS01 / R06-E09: landscape/compacto — drawer fecha (não gruda aberta).
      if (compact) setSidebarOpen(false)
    }
    sync()
    mq.addEventListener('change', sync)
    window.addEventListener('orientationchange', sync)
    return () => {
      mq.removeEventListener('change', sync)
      window.removeEventListener('orientationchange', sync)
    }
  }, [])

  const closeDrawer = useCallback((restoreFocus = true) => {
    restoreFocusRef.current = restoreFocus
    setSidebarOpen(false)
  }, [])

  /**
   * C3-R13 N01: drawer modal empurra history; Android/browser back fecha o
   * dialog (popstate) em vez de ir para home. Esc/Fechar limpa a entry.
   */
  useEffect(() => {
    if (!drawerAsModal) {
      if (
        drawerHistoryPushedRef.current &&
        !drawerClosingFromPopRef.current
      ) {
        drawerHistoryPushedRef.current = false
        window.history.back()
      }
      drawerClosingFromPopRef.current = false
      return
    }
    if (!drawerHistoryPushedRef.current) {
      window.history.pushState({ criasDrawer: true }, '')
      drawerHistoryPushedRef.current = true
    }
    const onPop = () => {
      drawerClosingFromPopRef.current = true
      drawerHistoryPushedRef.current = false
      restoreFocusRef.current = true
      setSidebarOpen(false)
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
    }
  }, [drawerAsModal])

  // R03-A02 / A07 / F05: Escape + trap de foco + retorno ao ☰.
  useEffect(() => {
    if (!drawerAsModal) {
      if (restoreFocusRef.current) {
        restoreFocusRef.current = false
        window.requestAnimationFrame(() => {
          menuBtnRef.current?.focus()
        })
      }
      return
    }
    const sidebar = sidebarRef.current
    if (!sidebar) return

    const focusables = focusableIn(sidebar)
    const first = focusables[0]
    first?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeDrawer(true)
        return
      }
      if (e.key !== 'Tab') return
      const list = focusableIn(sidebar)
      if (list.length === 0) return
      const head = list[0]
      const tail = list[list.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (!active || active === head || !sidebar.contains(active)) {
          e.preventDefault()
          tail.focus()
        }
      } else if (!active || active === tail || !sidebar.contains(active)) {
        e.preventDefault()
        head.focus()
      }
    }
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Node | null
      if (target && !sidebar.contains(target)) {
        const list = focusableIn(sidebar)
        list[0]?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('focusin', onFocusIn)
    }
  }, [drawerAsModal, closeDrawer])

  useEffect(() => {
    void reloadTrails()
    const onProgress = () => {
      void reloadTrails()
    }
    window.addEventListener('crias:trail-progress', onProgress)
    return () => {
      window.removeEventListener('crias:trail-progress', onProgress)
    }
  }, [reloadTrails, location.pathname])

  useEffect(() => {
    let cancelled = false
    void fetchTrailStageTotals()
      .then((map) => {
        if (!cancelled) setStageTotals(map)
      })
      .catch(() => {
        if (!cancelled) setStageTotals({})
      })
    void fetchTrailNames()
      .then((map) => {
        if (!cancelled) setTrailNames(map)
      })
      .catch(() => {
        if (!cancelled) setTrailNames({})
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Player / rotas compactas: nunca reabrir drawer só por navegar.
  useEffect(() => {
    if (isCompactViewport()) {
      restoreFocusRef.current = false
      setSidebarOpen(false)
    }
  }, [location.pathname])

  function logout() {
    // R15-Y02: confirm antes de Sair (chrome; progresso já está na escola).
    const ok = window.confirm(
      'Sair da conta? Seu progresso na trilha fica salvo.',
    )
    if (!ok) return
    clearSession('logout')
    navigate('/login', { replace: true })
  }

  const trailMatch = location.pathname.match(/^\/trilha\/([^/]+)/)
  const activeTrailId = trailMatch
    ? decodeURIComponent(trailMatch[1])
    : null
  const activeRow = rows?.find((r) => r.trail_id === activeTrailId) ?? null

  /** R14-L11 / C3-N02: Continuar aula = trilha ativa ou foco recente. */
  const continueAulaRow =
    activeRow || pickHomeTrail(rows) || null
  const continueAulaHref = continueAulaRow
    ? `/trilha/${encodeURIComponent(continueAulaRow.trail_id)}`
    : null
  const continueAulaLabel =
    continueAulaRow?.status === 'not_started'
      ? 'Começar aula'
      : 'Continuar aula'
  const showContinueAula =
    Boolean(continueAulaHref) &&
    location.pathname !== continueAulaHref

  // Layout effect: listener ativo antes do layout effect do player que despacha.
  useLayoutEffect(() => {
    const onChrome = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        trailId?: string
        stageTitle?: string | null
        stageNumber?: number
        mariaActive?: boolean
        completed?: boolean
      }
      if (detail?.trailId && detail.trailId !== activeTrailId) return
      setPlayerChrome({
        trailId: detail.trailId ?? activeTrailId,
        stageTitle: detail.stageTitle ?? null,
        stageNumber:
          typeof detail.stageNumber === 'number' ? detail.stageNumber : null,
        mariaActive: Boolean(detail.mariaActive),
        completed: Boolean(detail.completed),
      })
    }
    window.addEventListener('crias:player-chrome', onChrome)
    return () => window.removeEventListener('crias:player-chrome', onChrome)
  }, [activeTrailId])

  useEffect(() => {
    if (!activeTrailId) {
      setPlayerChrome({
        trailId: null,
        stageTitle: null,
        stageNumber: null,
        mariaActive: false,
      })
    }
  }, [activeTrailId])

  /**
   * Etapa exibida pelo player (mesma fonte do header). O GET /student_trails
   * do sidebar volta depois do next-content — sem isto o card da trilha ativa
   * ficava 1 etapa atrás (ex.: “Etapa 3 de 12 · 25%” com a etapa 4 na tela).
   */
  const playerStageNumber =
    activeTrailId &&
    playerChrome.trailId === activeTrailId &&
    typeof playerChrome.stageNumber === 'number'
      ? playerChrome.stageNumber
      : null
  /** Trilha ativa concluída no player (antes do GET /student_trails voltar). */
  const playerCompleted =
    Boolean(activeTrailId) &&
    playerChrome.trailId === activeTrailId &&
    Boolean(playerChrome.completed)

  const firstName = useMemo(
    () => session?.name.split(' ')[0] || 'Aluno',
    [session?.name],
  )

  if (!session) return null

  // R03-A01 / F05: sidebar fechada no mobile não entra no Tab; main inerte com drawer aberto.
  const sidebarInert = isNarrow && !sidebarOpen
  const mainInert = drawerAsModal

  return (
    <div
      className={`chat-shell${offline ? ' chat-shell--offline' : ''}${
        drawerAsModal ? ' chat-shell--drawer-open' : ''
      }`}
    >
      <aside
        id="crias-sidebar"
        ref={sidebarRef}
        className={`chat-sidebar ${sidebarOpen ? 'chat-sidebar--open' : ''}`}
        aria-label="Trilhas"
        aria-modal={drawerAsModal ? true : undefined}
        role={drawerAsModal ? 'dialog' : 'navigation'}
        inert={sidebarInert || undefined}
      >
        <nav className="chat-sidebar__nav" aria-label="Lista de trilhas">
          {/* C2-R17 N02: Fechar dentro do dialog (trap); N01: ☰ topbar sobe via CSS. */}
          {drawerAsModal ? (
            <button
              type="button"
              className="chat-sidebar__close"
              aria-label="Fechar menu"
              onClick={() => closeDrawer(true)}
            >
              Fechar
            </button>
          ) : null}
          <Link
            to="/"
            className="chat-sidebar__home"
            aria-label="Minhas trilhas — início"
            onClick={() => closeDrawer(false)}
          >
            {/* C3-R7 N04: ícone de lista/início — não “+ criar”. */}
            <span className="chat-sidebar__home-icon" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6h16M4 12h16M4 18h10"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>{' '}
            Minhas trilhas
          </Link>

          {showContinueAula && continueAulaHref ? (
            <Link
              to={continueAulaHref}
              className="chat-sidebar__continue-aula"
              onClick={() => closeDrawer(false)}
            >
              {continueAulaLabel}
            </Link>
          ) : null}

          {trailsLoading && rows === null ? (
            <p
              className="muted chat-sidebar__empty"
              role="status"
              aria-busy="true"
              aria-live="polite"
            >
              Carregando trilhas…
            </p>
          ) : trailsError ? (
            <div className="chat-sidebar__error" role="alert">
              <p className="muted">{trailsError}</p>
              <button
                type="button"
                className="chat-sidebar__retry"
                onClick={() => void reloadTrails()}
              >
                Tentar de novo
              </button>
            </div>
          ) : rows && rows.length === 0 ? (
            <p className="muted chat-sidebar__empty">Nenhuma trilha liberada.</p>
          ) : rows ? (
            <ul className="chat-sidebar__list">
              {rows.map((row) => {
                const href = `/trilha/${encodeURIComponent(row.trail_id)}`
                const active = location.pathname === href
                const rowCompleted =
                  row.status === 'completed' ||
                  (row.trail_id === activeTrailId && playerCompleted)
                const stageNumberRaw =
                  row.trail_id === activeTrailId &&
                  playerStageNumber != null &&
                  row.status !== 'completed'
                    ? playerStageNumber
                    : row.current_stage_number
                const totalRaw =
                  stageTotals[row.trail_id] && stageTotals[row.trail_id] > 0
                    ? stageTotals[row.trail_id]
                    : null
                // Concluída = progresso completo (N de N · 100 %).
                const stageNumber =
                  rowCompleted && totalRaw != null
                    ? Math.max(totalRaw, stageNumberRaw)
                    : stageNumberRaw
                const total =
                  totalRaw != null
                    ? Math.max(totalRaw, stageNumber)
                    : null
                // C3-N05: % só com total conhecido — sem “0 %” mentiroso.
                // C3-R7 N02: (etapa−1)/total — estágio 1 = 0 %, não 25 %.
                const pct =
                  total != null
                    ? rowCompleted
                      ? 100
                      : Math.min(
                          100,
                          Math.max(
                            0,
                            Math.round(
                              ((Math.max(stageNumber, 1) - 1) / total) * 100,
                            ),
                          ),
                        )
                    : null
                const rowStatus = rowCompleted ? 'completed' : row.status
                const label = trailNames[row.trail_id] || 'Trilha'
                const etapaMeta =
                  total != null
                    ? `Etapa ${stageNumber} de ${total}`
                    : `Etapa ${stageNumber}`
                return (
                  <li key={row.id}>
                    <Link
                      to={href}
                      className={`trail-card${active ? ' is-active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                      title={label}
                      aria-label={`${label}. ${STATUS_LABEL[rowStatus]}. ${etapaMeta}${pct != null ? `. ${pct}\u00a0%` : ''}`}
                      onClick={() => {
                        writeFocusedTrailId(row.trail_id)
                        closeDrawer(false)
                      }}
                    >
                      <span className="trail-card__top">
                        <span className="trail-card__head">
                          <DocumentIcon />
                          <span className="trail-card__id">{label}</span>
                        </span>
                        <span
                          className={`trail-card__status trail-card__status--${rowStatus}`}
                        >
                          <span className="trail-card__dot" aria-hidden />
                          {STATUS_LABEL[rowStatus]}
                        </span>
                      </span>
                      <span className="trail-card__meta">{etapaMeta}</span>
                      {pct != null ? (
                        <span className="trail-card__progress" aria-hidden>
                          <span className="trail-card__progress-track">
                            <span
                              className="trail-card__progress-fill"
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                          {/* R28-I02: espaço fino pt-BR antes do % */}
                          <span className="trail-card__pct">
                            {pct}
                            {'\u00a0'}%
                          </span>
                        </span>
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </nav>

        <div className="chat-sidebar__foot">
          <div className="chat-sidebar__brand-row">
            <span className="chat-sidebar__brand">Crias</span>
            <span className="chat-sidebar__user">{firstName}</span>
          </div>
          <button type="button" className="chat-sidebar__logout" onClick={logout}>
            <LogoutIcon />
            Sair
            <span className="chat-sidebar__logout-hint">
              Seu progresso fica salvo
            </span>
          </button>
        </div>
      </aside>

      {drawerAsModal ? (
        <div
          className="chat-sidebar__backdrop"
          aria-hidden="true"
          onClick={() => closeDrawer(true)}
        />
      ) : null}

      <div className="chat-main">
        {/* C2-R6 N01: faixa in-flow — empurra topbar; não tapa brand/☰. */}
        {offline ? (
          <div className="chat-offline-banner" role="status" aria-live="polite">
            {/* C3-R12 N03: CTAs já hard-disabled — copy alinhada ao login OM04. */}
            Sem conexão. Reconecte para continuar.
          </div>
        ) : null}
        <header className="chat-topbar">
          <button
            ref={menuBtnRef}
            type="button"
            className="chat-topbar__menu"
            aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={sidebarOpen}
            aria-controls="crias-sidebar"
            aria-haspopup="dialog"
            tabIndex={drawerAsModal ? -1 : undefined}
            onClick={() => {
              if (sidebarOpen) closeDrawer(true)
              else setSidebarOpen(true)
            }}
          >
            ☰
          </button>
          <div className="chat-topbar__titles">
            <span className="chat-topbar__brand">Crias</span>
            {(() => {
              /* C2-R5 N05: topbar = trilha · Etapa (card guarda stage_title). */
              /* C3-R11 N02: title nativo com nome+etapa completo (ellipsis). */
              const topbarTitle = activeTrailId
                ? [
                    trailNames[activeTrailId] || 'Trilha',
                    (() => {
                      const totalRaw =
                        stageTotals[activeTrailId] > 0
                          ? stageTotals[activeTrailId]
                          : null
                      const n =
                        playerCompleted && totalRaw != null
                          ? Math.max(totalRaw, playerStageNumber ?? 0)
                          : playerStageNumber
                      if (n == null) return null
                      // C2-R1 N01: sem fallback current→total (“N de N” / “5 de 4”).
                      if (totalRaw == null) return `Etapa ${n}`
                      return `Etapa ${n} de ${Math.max(totalRaw, n)}`
                    })(),
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : 'Suas trilhas'
              return (
                <span className="chat-topbar__title" title={topbarTitle}>
                  {topbarTitle}
                </span>
              )
            })()}
            {/* C2-R5 N02: chip MARIA só na sessão sidechat — não no chrome da aula. */}
            {activeTrailId && playerChrome.mariaActive ? (
              <span className="chat-topbar__maria">MARIA</span>
            ) : null}
          </div>
        </header>
        <div className="chat-main__content" inert={mainInert || undefined}>
          <Outlet
            context={{
              trailRows: rows,
              trailsError,
              trailsLoading,
              retryTrails: () => void reloadTrails(),
              activeTrailRow: activeRow,
              trailNames,
              stageTotals,
            }}
          />
        </div>
      </div>
    </div>
  )
}
