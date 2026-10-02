import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  advanceTrail,
  fetchNextContent,
  type NextContentOk,
  type NextContentStatus,
} from '../lib/api'
import { getSession } from '../lib/session'

export default function PlayerPage() {
  const { trailId = '' } = useParams()
  const session = getSession()!
  const [content, setContent] = useState<NextContentOk | NextContentStatus | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setSelectedOption(null)
    try {
      const data = await fetchNextContent(session.student_id, trailId)
      setContent(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar.')
      setContent(null)
    }
  }, [session.student_id, trailId])

  useEffect(() => {
    void load()
  }, [load])

  async function onAdvance() {
    setBusy(true)
    setError(null)
    try {
      const result = await advanceTrail(session.student_id, trailId)
      if (result.status === 'ok' && result.completed) {
        setContent({
          status: 'completed',
          student_id: session.student_id,
          trail_id: trailId,
          message: 'Trilha concluída.',
        })
      } else if (result.status === 'ok') {
        await load()
      } else {
        setContent(result as NextContentStatus)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao avançar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page player">
      <header className="page-header">
        <div>
          <p className="brand">Crias</p>
          <h1>Trilha {trailId}</h1>
        </div>
        <Link className="ghost" to="/">
          Voltar
        </Link>
      </header>

      {error ? <p className="error" role="alert">{error}</p> : null}

      {!content ? (
        <p className="muted">Carregando conteúdo…</p>
      ) : content.status === 'blocked' ? (
        <section className="empty-state">
          <h2>Conteúdo bloqueado</h2>
          <p>
            {content.message ||
              'Esta etapa ainda não foi liberada pela instituição.'}
          </p>
        </section>
      ) : content.status === 'completed' ? (
        <section className="empty-state">
          <h2>Trilha concluída</h2>
          <p>{content.message || 'Você terminou esta trilha. Parabéns!'}</p>
        </section>
      ) : content.status !== 'ok' ? (
        <section className="empty-state">
          <h2>Indisponível</h2>
          <p>{content.message || `Status: ${content.status}`}</p>
        </section>
      ) : (
        <section className="content-block" data-stage-type={content.stage_type}>
          <p className="eyebrow">
            {content.stage_title || content.stage_type} · etapa{' '}
            {content.stage_number} · questão {content.question_number}
          </p>

          {content.stage_type === 'ai' && content.prompt ? (
            <p className="prompt-hint">{content.prompt}</p>
          ) : null}

          <div className="content-body">
            {(content.content || '').split('\n').map((line, i) => (
              <p key={i}>{line || '\u00a0'}</p>
            ))}
          </div>

          {content.stage_type === 'exercise' &&
          Array.isArray(content.options) &&
          content.options.length > 0 ? (
            <fieldset className="options">
              <legend>Escolha uma opção</legend>
              {content.options.map((opt, i) => {
                const label = String(opt)
                return (
                  <label key={i}>
                    <input
                      type="radio"
                      name="opt"
                      value={label}
                      checked={selectedOption === label}
                      onChange={() => setSelectedOption(label)}
                    />
                    {label}
                  </label>
                )
              })}
            </fieldset>
          ) : null}

          {content.explanation && selectedOption ? (
            <p className="explanation">{content.explanation}</p>
          ) : null}

          <button
            type="button"
            onClick={() => void onAdvance()}
            disabled={
              busy ||
              (content.stage_type === 'exercise' &&
                Array.isArray(content.options) &&
                content.options.length > 0 &&
                !selectedOption)
            }
          >
            {busy ? 'Avançando…' : 'Continuar'}
          </button>
        </section>
      )}
    </main>
  )
}
