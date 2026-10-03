import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  isAuthError,
  listStudentTrails,
  type StudentTrailRow,
} from '../lib/api'
import { toUserFacingError } from '../lib/networkError'
import {
  clearSession,
  getSession,
  SESSION_CLEARED_EVENT,
} from '../lib/session'

const STATUS_LABEL: Record<StudentTrailRow['status'], string> = {
  not_started: 'Não iniciada',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  blocked: 'Bloqueada',
}

/**
 * Shell compacto (= drawer): portrait estreito OU landscape de telefone.
 * R24-LS01: só max-width:768 falhava em 844×390 (sidebar desktop sem ☰).
 */
const COMPACT_MQ =
  '(max-width: 768px), (max-height: 500px) and (orientation: landscape)'

function isCompactViewport() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(COMPACT_MQ).matches
}

/** Compacto: drawer fechado por padrão (C5-MOBILE-SIDEBAR-CTA / LS01). */
function initialSidebarOpen() {
  if (typeof window === 'undefined') return true
  return !isCompactViewport()
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
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen)
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  )
  const [isNarrow, setIsNarrow] = useState(() => isCompactViewport())
  const drawerAsModal = isNarrow && sidebarOpen
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const restoreFocusRef = useRef(false)

  // ER05: sessão sumiu mid-app → login.
  useEffect(() => {
    if (!session) {
      navigate('/login', { replace: true, state: { reason: 'missing' } })
    }
  }, [session, navigate])

  useEffect(() => {
    const onCleared = () => {
      navigate('/login', { replace: true, state: { reason: 'auth' } })
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'crias_student_session' && !e.newValue) {
        navigate('/login', { replace: true, state: { reason: 'missing' } })
      }
    }
    window.addEventListener(SESSION_CLEARED_EVENT, onCleared)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(SESSION_CLEARED_EVENT, onCleared)
      window.removeEventListener('storage', onStorage)
    }
  }, [navigate])

  const reloadTrails = useCallback(async () => {
    const s = getSession()
    if (!s) {
      clearSession('missing')
      navigate('/login', { replace: true, state: { reason: 'missing' } })
      return
    }
    setTrailsLoading(true)
    setTrailsError(null)
    try {
      const data = await listStudentTrails(s.student_id)
      setRows(data)
    } catch (err) {
      if (isAuthError(err)) {
        clearSession('auth')
        navigate('/login', {
          replace: true,
          state: { reason: 'auth', message: (err as Error).message },
        })
        return
      }
      // ER01: não fingir lista vazia no catch.
      setTrailsError(
        toUserFacingError(err, 'Não foi possível carregar suas trilhas.'),
      )
      setRows(null)
    } finally {
      setTrailsLoading(false)
    }
  }, [navigate])

  const reloadTrailsRef = useRef(reloadTrails)
  reloadTrailsRef.current = reloadTrails

  // R12-O01: indicador offline (não silencioso).
  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => {
      setOffline(false)
      void reloadTrailsRef.current()
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
      // R24-LS01: ao girar para landscape compacto, fecha sidebar permanente.
      if (compact) setSidebarOpen(false)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const closeDrawer = useCallback((restoreFocus = true) => {
    restoreFocusRef.current = restoreFocus
    setSidebarOpen(false)
  }, [])

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

  // Player / rotas compactas: nunca reabrir drawer só por navegar.
  useEffect(() => {
    if (isCompactViewport()) {
      restoreFocusRef.current = false
      setSidebarOpen(false)
    }
  }, [location.pathname])

  function logout() {
    clearSession('logout')
    navigate('/login', { replace: true })
  }

  const trailMatch = location.pathname.match(/^\/trilha\/([^/]+)/)
  const activeTrailId = trailMatch
    ? decodeURIComponent(trailMatch[1])
    : null
  const activeRow = rows?.find((r) => r.trail_id === activeTrailId) ?? null
  const [playerChrome, setPlayerChrome] = useState<{
    stageTitle: string | null
    stageNumber: number | null
    questionNumber: number | null
  }>({ stageTitle: null, stageNumber: null, questionNumber: null })

  useEffect(() => {
    const onChrome = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        trailId?: string
        stageTitle?: string | null
        stageNumber?: number
        questionNumber?: number
      }
      if (detail?.trailId && detail.trailId !== activeTrailId) return
      setPlayerChrome({
        stageTitle: detail.stageTitle ?? null,
        stageNumber:
          typeof detail.stageNumber === 'number' ? detail.stageNumber : null,
        questionNumber:
          typeof detail.questionNumber === 'number'
            ? detail.questionNumber
            : null,
      })
    }
    window.addEventListener('crias:player-chrome', onChrome)
    return () => window.removeEventListener('crias:player-chrome', onChrome)
  }, [activeTrailId])

  useEffect(() => {
    if (!activeTrailId) {
      setPlayerChrome({
        stageTitle: null,
        stageNumber: null,
        questionNumber: null,
      })
    }
  }, [activeTrailId])

  if (!session) return null

  const titleText = activeTrailId
    ? [
        'Crias',
        playerChrome.stageTitle || activeTrailId,
        playerChrome.stageNumber != null
          ? `etapa ${playerChrome.stageNumber}`
          : activeRow
            ? `etapa ${activeRow.current_stage_number}`
            : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Crias · Suas trilhas'

  // R03-A01 / F05: sidebar fechada no mobile não entra no Tab; main inerte com drawer aberto.
  const sidebarInert = isNarrow && !sidebarOpen
  const mainInert = drawerAsModal

  return (
    <div className="chat-shell">
      {offline ? (
        <div className="chat-offline-banner" role="status" aria-live="polite">
          Você está offline. Algumas ações podem falhar até a conexão voltar.
        </div>
      ) : null}

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
          <Link
            to="/"
            className="chat-sidebar__new"
            onClick={() => closeDrawer(false)}
          >
            <span aria-hidden>+</span> Minhas trilhas
          </Link>

          {trailsLoading && rows === null ? (
            <p className="muted chat-sidebar__empty">Carregando trilhas…</p>
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
            <p className="muted chat-sidebar__empty">Nenhuma trilha vinculada.</p>
          ) : rows ? (
            <ul className="chat-sidebar__list">
              {rows.map((row) => {
                const href = `/trilha/${encodeURIComponent(row.trail_id)}`
                const active = location.pathname === href
                return (
                  <li key={row.id}>
                    <Link
                      to={href}
                      className={active ? 'is-active' : undefined}
                      onClick={() => closeDrawer(false)}
                    >
                      <span className="trail-icon" aria-hidden>
                        ▤
                      </span>
                      <span className="trail-copy">
                        <span className="trail-id">{row.trail_id}</span>
                        <span className="trail-meta">
                          {STATUS_LABEL[row.status]} · etapa{' '}
                          {row.current_stage_number}
                          {row.current_question_number
                            ? ` · q${row.current_question_number}`
                            : ''}
                        </span>
                      </span>
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
            <span className="chat-sidebar__user">
              {session.name.split(' ')[0] || 'Aluno'}
            </span>
          </div>
          <button type="button" className="chat-sidebar__logout" onClick={logout}>
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
          <span className="chat-topbar__title">{titleText}</span>
        </header>
        <div className="chat-main__content" inert={mainInert || undefined}>
          <Outlet
            context={{
              trailRows: rows,
              trailsError,
              trailsLoading,
              retryTrails: () => void reloadTrails(),
              activeTrailRow: activeRow,
            }}
          />
        </div>
      </div>
    </div>
  )
}
