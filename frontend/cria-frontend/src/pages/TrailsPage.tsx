import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listStudentTrails, type StudentTrailRow } from '../lib/api'
import { clearSession, getSession } from '../lib/session'

const STATUS_LABEL: Record<StudentTrailRow['status'], string> = {
  not_started: 'Não iniciada',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  blocked: 'Bloqueada',
}

export default function TrailsPage() {
  const session = getSession()!
  const navigate = useNavigate()
  const [rows, setRows] = useState<StudentTrailRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await listStudentTrails(session.student_id)
        if (!cancelled) setRows(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar.')
          setRows([])
        }
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
    <main className="page">
      <header className="page-header">
        <div>
          <p className="brand">Crias</p>
          <h1>Olá, {session.name.split(' ')[0] || 'aluno'}</h1>
          <p className="lede">Suas trilhas vinculadas</p>
        </div>
        <button type="button" className="ghost" onClick={logout}>
          Sair
        </button>
      </header>

      {error ? <p className="error" role="alert">{error}</p> : null}

      {rows === null ? (
        <p className="muted">Carregando…</p>
      ) : rows.length === 0 ? (
        <section className="empty-state">
          <h2>Nenhuma trilha ainda</h2>
          <p>Peça à sua instituição para vincular você a uma trilha.</p>
        </section>
      ) : (
        <ul className="trail-list">
          {rows.map((row) => (
            <li key={row.id}>
              <Link to={`/trilha/${encodeURIComponent(row.trail_id)}`}>
                <strong>{row.trail_id}</strong>
                <span>{STATUS_LABEL[row.status]}</span>
                <span className="muted">
                  Etapa {row.current_stage_number} · Questão{' '}
                  {row.current_question_number}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
