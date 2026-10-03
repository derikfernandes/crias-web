import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  fetchTrailStageTotals,
  listStudentTrails,
  type StudentTrailRow,
} from '../lib/api'
import { clearSession, getSession } from '../lib/session'

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

export default function ChatLayout() {
  const session = getSession()!
  const navigate = useNavigate()
  const location = useLocation()
  const [rows, setRows] = useState<StudentTrailRow[] | null>(null)
  const [stageTotals, setStageTotals] = useState<Record<string, number>>({})
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen)

  useEffect(() => {
    let cancelled = false
    async function reload() {
      try {
        const data = await listStudentTrails(session.student_id)
        if (!cancelled) setRows(data)
      } catch {
        if (!cancelled) setRows([])
      }
    }
    void reload()
    const onProgress = () => {
      void reload()
    }
    window.addEventListener('crias:trail-progress', onProgress)
    return () => {
      cancelled = true
      window.removeEventListener('crias:trail-progress', onProgress)
    }
  }, [session.student_id, location.pathname])

  useEffect(() => {
    let cancelled = false
    void fetchTrailStageTotals()
      .then((map) => {
        if (!cancelled) setStageTotals(map)
      })
      .catch(() => {
        if (!cancelled) setStageTotals({})
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Player / rotas estreitas: nunca reabrir drawer só por navegar; desktop ignora --open no CSS.
  useEffect(() => {
    if (window.matchMedia('(max-width: 768px)').matches) {
      setSidebarOpen(false)
    }
  }, [location.pathname])

  function logout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  const trailMatch = location.pathname.match(/^\/trilha\/([^/]+)/)
  const activeTrailId = trailMatch
    ? decodeURIComponent(trailMatch[1])
    : null

  const firstName = useMemo(
    () => session.name.split(' ')[0] || 'Aluno',
    [session.name],
  )

  return (
    <div className="chat-shell">
      <aside
        className={`chat-sidebar ${sidebarOpen ? 'chat-sidebar--open' : ''}`}
        aria-label="Trilhas"
      >
        <nav className="chat-sidebar__nav">
          <Link
            to="/"
            className="chat-sidebar__new"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="chat-sidebar__new-plus" aria-hidden>
              +
            </span>{' '}
            Minhas trilhas
          </Link>

          {rows === null ? (
            <p className="muted chat-sidebar__empty">Carregando trilhas…</p>
          ) : rows.length === 0 ? (
            <p className="muted chat-sidebar__empty">Nenhuma trilha vinculada.</p>
          ) : (
            <ul className="chat-sidebar__list">
              {rows.map((row) => {
                const href = `/trilha/${encodeURIComponent(row.trail_id)}`
                const active = location.pathname === href
                const total =
                  stageTotals[row.trail_id] && stageTotals[row.trail_id] > 0
                    ? stageTotals[row.trail_id]
                    : Math.max(row.current_stage_number, 1)
                const pct = Math.min(
                  100,
                  Math.round((row.current_stage_number / total) * 100),
                )
                return (
                  <li key={row.id}>
                    <Link
                      to={href}
                      className={`trail-card${active ? ' is-active' : ''}`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="trail-card__head">
                        <DocumentIcon />
                        <span className="trail-card__id">{row.trail_id}</span>
                      </span>
                      <span
                        className={`trail-card__status trail-card__status--${row.status}`}
                      >
                        <span className="trail-card__dot" aria-hidden />
                        {STATUS_LABEL[row.status]}
                      </span>
                      <span className="trail-card__meta">
                        Etapa {row.current_stage_number} de {total}
                      </span>
                      <span className="trail-card__progress" aria-hidden>
                        <span className="trail-card__progress-track">
                          <span
                            className="trail-card__progress-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <span className="trail-card__pct">{pct}%</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </nav>

        <div className="chat-sidebar__foot">
          <div className="chat-sidebar__brand-row">
            <span className="chat-sidebar__brand">Crias</span>
            <span className="chat-sidebar__user">{firstName}</span>
          </div>
          <button type="button" className="chat-sidebar__logout" onClick={logout}>
            <LogoutIcon />
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
            onClick={() => setSidebarOpen((v) => !v)}
          >
            ☰
          </button>
          <div className="chat-topbar__titles">
            <span className="chat-topbar__title">
              {activeTrailId ? `Crias · ${activeTrailId}` : 'Crias · Sua trilha'}
            </span>
            {activeTrailId ? (
              <span className="chat-topbar__maria">MARIA</span>
            ) : null}
          </div>
        </header>
        <Outlet context={{ trailRows: rows }} />
      </div>
    </div>
  )
}
