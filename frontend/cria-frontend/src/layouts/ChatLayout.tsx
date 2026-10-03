import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import {
  isAuthError,
  listStudentTrails,
  type StudentTrailRow,
} from '../lib/api'
import {
  toUserFacingError,
  isRetryableSystemError,
} from '../lib/networkError'
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

/** ≤768px: drawer overlay — default closed so Continuar não fica sob a lista (C5-MOBILE-SIDEBAR-CTA). */
function initialSidebarOpen() {
  if (typeof window === 'undefined') return true
  return !window.matchMedia('(max-width: 768px)').matches
}

export default function ChatLayout() {
  const session = getSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [rows, setRows] = useState<StudentTrailRow[] | null>(null)
  const [trailsError, setTrailsError] = useState<string | null>(null)
  const [trailsLoading, setTrailsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen)

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
      void isRetryableSystemError(err)
    } finally {
      setTrailsLoading(false)
    }
  }, [navigate])

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

  // Player / rotas estreitas: nunca reabrir drawer só por navegar; desktop ignora --open no CSS.
  useEffect(() => {
    if (window.matchMedia('(max-width: 768px)').matches) {
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

  return (
    <div className="chat-shell">
      <aside
        id="crias-sidebar"
        className={`chat-sidebar ${sidebarOpen ? 'chat-sidebar--open' : ''}`}
        aria-label="Trilhas"
      >
        <nav className="chat-sidebar__nav">
          <Link
            to="/"
            className="chat-sidebar__new"
            onClick={() => setSidebarOpen(false)}
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
                      onClick={() => setSidebarOpen(false)}
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
          </button>
        </div>
      </aside>

      {sidebarOpen ? (
        <button
          type="button"
          className="chat-sidebar__backdrop"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="chat-main">
        <header className="chat-topbar">
          <button
            type="button"
            className="chat-topbar__menu"
            aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={sidebarOpen}
            aria-controls="crias-sidebar"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            ☰
          </button>
          <span className="chat-topbar__title">
            {activeTrailId
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
              : 'Crias · Suas trilhas'}
          </span>
        </header>
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
  )
}
