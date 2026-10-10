import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  askMaria,
  fetchTrailHistoryPage,
  isAuthError,
  type ConversationLogRow,
} from '../lib/api'
import { MARIA_AGENT_TRAIL_ID } from '../lib/mariaAgent'
import {
  isRetryableSystemError,
  toUserFacingError,
} from '../lib/networkError'
import { clearSession, getSession } from '../lib/session'
import { useNavigate } from 'react-router-dom'

type ChatLine = {
  id: string
  role: 'student' | 'maria'
  text: string
}

function logsToLines(logs: ConversationLogRow[]): ChatLine[] {
  const out: ChatLine[] = []
  for (const log of logs) {
    const text = (log.message_text || '').trim()
    if (!text) continue
    if (log.sender === 'student') {
      out.push({ id: log.id, role: 'student', text })
    } else if (log.sender === 'system' || log.sender === 'ai') {
      out.push({ id: log.id, role: 'maria', text })
    }
  }
  return out
}

export default function MariaPage() {
  const session = getSession()!
  const navigate = useNavigate()
  const [lines, setLines] = useState<ChatLine[]>([])
  const [draft, setDraft] = useState('')
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const lastDraftRef = useRef('')

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    setHistoryError(null)
    try {
      const page = await fetchTrailHistoryPage(
        session.student_id,
        MARIA_AGENT_TRAIL_ID,
        { limit: 80 },
      )
      setLines(logsToLines(page.logs ?? []))
    } catch (err) {
      if (isAuthError(err)) {
        clearSession('auth')
        navigate('/login', { replace: true, state: { reason: 'auth' } })
        return
      }
      setHistoryError(
        toUserFacingError(err, 'Não foi possível carregar a conversa.'),
      )
    } finally {
      setLoadingHistory(false)
    }
  }, [navigate, session.student_id])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  /** Rascunho vindo da barra “Pergunte à Maria…” na home. */
  useEffect(() => {
    try {
      const key = `crias:maria-draft:${MARIA_AGENT_TRAIL_ID}`
      const pending = sessionStorage.getItem(key)?.trim() || ''
      if (pending) {
        setDraft(pending)
        sessionStorage.removeItem(key)
        window.requestAnimationFrame(() => inputRef.current?.focus())
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [lines, sending])

  async function onSend(e?: FormEvent) {
    e?.preventDefault()
    const message = draft.trim()
    if (!message || sending) return
    lastDraftRef.current = message
    setDraft('')
    setSendError(null)
    setCanRetry(false)
    setSending(true)
    const tempId = `local-${Date.now()}`
    setLines((prev) => [
      ...prev,
      { id: tempId, role: 'student', text: message },
    ])
    try {
      const result = await askMaria({
        student_id: session.student_id,
        trail_id: MARIA_AGENT_TRAIL_ID,
        message,
        stage_number: 1,
        question_number: 1,
      })
      setLines((prev) => [
        ...prev,
        {
          id: `maria-${Date.now()}`,
          role: 'maria',
          text: result.reply,
        },
      ])
    } catch (err) {
      if (isAuthError(err)) {
        clearSession('auth')
        navigate('/login', { replace: true, state: { reason: 'auth' } })
        return
      }
      setLines((prev) => prev.filter((l) => l.id !== tempId))
      setDraft(lastDraftRef.current)
      setSendError(toUserFacingError(err, 'Não foi possível falar com Maria.'))
      setCanRetry(isRetryableSystemError(err))
    } finally {
      setSending(false)
      window.requestAnimationFrame(() => inputRef.current?.focus())
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void onSend()
    }
  }

  const firstName = session.name.split(' ')[0] || 'aluno'
  const sendDisabled = sending || !draft.trim()

  return (
    <div className="maria-page horizonte">
      <span className="hz hz-brilho" aria-hidden />
      <span className="hz hz-linha" aria-hidden />
      <span className="hz hz-arco" aria-hidden />
      <div className="maria-page__scroll" ref={scrollRef}>
        <div className="maria-page__intro">
          <p className="maria-page__lede">
            Olá, {firstName}. Sou Maria, sua parceira de estudos.
          </p>
        </div>
        {loadingHistory ? (
          <p className="muted" role="status">
            Carregando conversa…
          </p>
        ) : historyError ? (
          <div className="maria-page__error" role="alert">
            <p>{historyError}</p>
            <button type="button" onClick={() => void loadHistory()}>
              Tentar de novo
            </button>
          </div>
        ) : lines.length === 0 ? (
          <p className="muted">Pergunte o que quiser sobre seus estudos.</p>
        ) : (
          <ul className="maria-page__messages">
            {lines.map((line) => (
              <li
                key={line.id}
                className={
                  line.role === 'student'
                    ? 'maria-page__bubble maria-page__bubble--student'
                    : 'maria-page__bubble maria-page__bubble--maria'
                }
              >
                {line.role === 'maria' ? (
                  <span className="maria-page__label">Maria</span>
                ) : null}
                <p>{line.text}</p>
              </li>
            ))}
          </ul>
        )}
        {sending ? (
          <p className="muted" role="status" aria-live="polite">
            Maria está pensando…
          </p>
        ) : null}
        {sendError ? (
          <div className="maria-page__error" role="alert">
            <p>{sendError}</p>
            {canRetry ? (
              <button type="button" onClick={() => void onSend()}>
                Tentar de novo
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <footer className="chat-composer maria-page__composer">
        <form
          className="chat-composer__form"
          onSubmit={(e) => void onSend(e)}
        >
          <textarea
            ref={inputRef}
            className="chat-composer__input"
            rows={1}
            value={draft}
            disabled={sending}
            placeholder="Pergunte à Maria…"
            aria-label="Pergunte à Maria…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            type="submit"
            className="chat-composer__send"
            disabled={sendDisabled}
            aria-label="Enviar pergunta à Maria"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4.5 11.2 19.2 4.7a.8.8 0 0 1 1.1.9l-3.6 14.2a.8.8 0 0 1-1.3.4l-4.3-3.7-2.5 2.4a.6.6 0 0 1-1-.4v-3.9l11-8.2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>
      </footer>
    </div>
  )
}
