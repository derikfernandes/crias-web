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

export default function ChatLayout() {
  const session = getSession()!
  const navigate = useNavigate()
  const location = useLocation()
  const [rows, setRows] = useState<StudentTrailRow[] | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await listStudentTrails(session.student_id)
        if (!cancelled) setRows(data)
      } catch {
        if (!cancelled) setRows([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session.student_id])

  function logout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className="chat-shell">
      <aside
        className={`chat-sidebar ${sidebarOpen ? 'chat-sidebar--open' : ''}`}
        aria-label="Trilhas"
      >
        <div className="chat-sidebar__head">
          <p className="chat-sidebar__brand">Crias</p>
          <p className="chat-sidebar__user">
            {session.name.split(' ')[0] || 'Aluno'}
          </p>
        </div>
        <nav className="chat-sidebar__nav">
          {rows === null ? (
            <p className="muted">Carregando trilhas…</p>
          ) : rows.length === 0 ? (
            <p className="muted">Nenhuma trilha vinculada.</p>
          ) : (
            <ul>
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
                      <span className="trail-id">{row.trail_id}</span>
                      <span className="trail-meta">
                        {STATUS_LABEL[row.status]} · etapa{' '}
                        {row.current_stage_number}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </nav>
        <button type="button" className="chat-sidebar__logout" onClick={logout}>
          Sair
        </button>
      </aside>

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
          <span className="chat-topbar__title">Sua trilha</span>
        </header>
        <Outlet context={{ trailRows: rows }} />
      </div>
    </div>
  )
}
