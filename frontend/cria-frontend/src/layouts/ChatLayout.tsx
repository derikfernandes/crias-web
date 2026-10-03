import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { listStudentTrails, type StudentTrailRow } from '../lib/api'
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

export default function ChatLayout() {
  const session = getSession()!
  const navigate = useNavigate()
  const location = useLocation()
  const [rows, setRows] = useState<StudentTrailRow[] | null>(null)
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
            <span aria-hidden>+</span> Minhas trilhas
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
          )}
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
            onClick={() => setSidebarOpen((v) => !v)}
          >
            ☰
          </button>
          <span className="chat-topbar__title">
            {activeTrailId ? `Crias · ${activeTrailId}` : 'Crias · Sua trilha'}
          </span>
        </header>
        <Outlet context={{ trailRows: rows }} />
      </div>
    </div>
  )
}
