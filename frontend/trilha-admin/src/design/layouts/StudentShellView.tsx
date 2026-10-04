import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { TrilhaPathIcon } from '../icons/trilha/TrilhaPathIcon'

export type StudentShellViewProps = {
  brandLabel?: string
  studentName?: string | null
  onLogout?: () => void
  children: ReactNode
  /** Quando false, esconde rail (ex. login). */
  showNav?: boolean
}

export function StudentShellView({
  brandLabel = 'Crias',
  studentName = null,
  onLogout,
  children,
  showNav = true,
}: StudentShellViewProps) {
  const location = useLocation()
  const onHistory = location.pathname.includes('/historico')
  const path = location.pathname.replace(/\/$/, '') || '/'
  const onPlay = path.startsWith('/trilha/play')
  const onHome = path === '/trilha' || onPlay

  return (
    <div
      className={
        onPlay ? 'student-shell student-shell--chat' : 'student-shell'
      }
      data-shell="student"
    >
      {showNav ? (
        <aside className="student-shell__rail">
          <Link to="/trilha" className="student-shell__brand">
            <span className="student-shell__brand-mark" aria-hidden="true" />
            <span className="student-shell__brand-text">{brandLabel}</span>
          </Link>
          <nav className="student-shell__nav" aria-label="Navegação do aluno">
            <Link
              to="/trilha"
              className={
                onHome
                  ? 'student-shell__nav-item is-active'
                  : 'student-shell__nav-item'
              }
              aria-current={onHome ? 'page' : undefined}
            >
              <TrilhaPathIcon size={20} aria-hidden />
              <span>Trilhas</span>
            </Link>
            <Link
              to="/trilha/historico"
              className={
                onHistory
                  ? 'student-shell__nav-item is-active'
                  : 'student-shell__nav-item'
              }
              aria-current={onHistory ? 'page' : undefined}
            >
              <span className="student-shell__nav-dot" aria-hidden="true" />
              <span>Revisão</span>
            </Link>
          </nav>
          <div className="student-shell__rail-foot">
            {studentName ? (
              <p className="student-shell__user muted">{studentName}</p>
            ) : null}
            {onLogout ? (
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={onLogout}
              >
                Sair
              </button>
            ) : null}
          </div>
        </aside>
      ) : null}

      <div className="student-shell__main">
        {showNav ? (
          <header className="student-shell__top">
            <Link to="/trilha" className="student-shell__top-brand">
              <TrilhaPathIcon size={24} title="Trilha" />
              <span>Minhas trilhas</span>
            </Link>
            {onLogout ? (
              <button
                type="button"
                className="btn btn--ghost btn--small student-shell__top-logout"
                onClick={onLogout}
              >
                Sair
              </button>
            ) : null}
          </header>
        ) : null}
        <main className="student-shell__content">{children}</main>
      </div>
    </div>
  )
}
