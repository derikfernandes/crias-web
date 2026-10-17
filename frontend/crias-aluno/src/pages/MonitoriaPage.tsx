import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
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
import { parseInlineMarkdown, type InlineSeg } from '../lib/trailMessages'
import { useNavigate } from 'react-router-dom'
import { autoGrow, isMobileViewport } from '../lib/autoGrow'
import { useThreadScroll } from '../lib/useThreadScroll'
import {
  ArrowUpIcon,
  BotMessage,
  LockIcon,
  ScrollArrows,
  TypingRow,
  UserBubble,
} from '../components/ConversationParts'

function renderInlineSegments(
  segments: InlineSeg[] | undefined,
  fallback: string,
): ReactNode {
  if (!segments || segments.length === 0) return fallback || '\u00a0'
  return segments.map((seg) => {
    if (seg.kind === 'strong' || seg.kind === 'em') {
      const Tag = seg.kind === 'strong' ? 'strong' : 'em'
      const inner = parseInlineMarkdown(seg.value)
      const nested =
        inner.length === 1 && inner[0]?.kind === 'text'
          ? seg.value
          : renderInlineSegments(inner, seg.value)
      return <Tag key={seg.key}>{nested}</Tag>
    }
    return <span key={seg.key}>{seg.value}</span>
  })
}

type ChatLine = {
  id: string
  role: 'student' | 'monitor'
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
      out.push({ id: log.id, role: 'monitor', text })
    }
  }
  return out
}

const MONITOR_INTRO =
  'Oi, eu sou o monitor. Pode me perguntar sobre qualquer trilha ou assunto.'

/**
 * Monitoria (v1.0): conversa livre com o monitor, fora de uma trilha.
 * Usa o mesmo agente de antes (a lógica não mudou), agora com o nome e o visual do monitor.
 */
export default function MonitoriaPage() {
  const session = getSession()!
  const navigate = useNavigate()
  const [lines, setLines] = useState<ChatLine[]>([])
  const [draft, setDraft] = useState('')
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const lastDraftRef = useRef('')
  /** Pergunta que veio da barra do Início: é enviada sozinha ao abrir. */
  const homeDraftRef = useRef('')
  const { threadRef, upRef, downRef, toBottom } = useThreadScroll()

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

  /** Pergunta vinda da barra "Pergunte ao seu monitor…" do Início. */
  useEffect(() => {
    try {
      const key = `crias:maria-draft:${MARIA_AGENT_TRAIL_ID}`
      const pending = sessionStorage.getItem(key)?.trim() || ''
      if (pending) {
        homeDraftRef.current = pending
        sessionStorage.removeItem(key)
      }
    } catch {
      /* ignore */
    }
  }, [])

  // v1.0, seção 12.1: tudo que chega no fim da conversa faz ela descer sozinha.
  useEffect(() => {
    toBottom()
  }, [lines.length, sending, toBottom])
  useEffect(() => {
    if (!loadingHistory) toBottom(true)
  }, [loadingHistory, toBottom])

  async function sendMessage(raw: string) {
    const message = raw.trim()
    if (!message || sending) return
    lastDraftRef.current = message
    setDraft('')
    autoGrow(inputRef.current)
    setSendError(null)
    setCanRetry(false)
    setSending(true)
    const tempId = `local-${Date.now()}`
    setLines((prev) => [...prev, { id: tempId, role: 'student', text: message }])
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
        { id: `monitor-${Date.now()}`, role: 'monitor', text: result.reply },
      ])
    } catch (err) {
      if (isAuthError(err)) {
        clearSession('auth')
        navigate('/login', { replace: true, state: { reason: 'auth' } })
        return
      }
      setLines((prev) => prev.filter((l) => l.id !== tempId))
      setDraft(lastDraftRef.current)
      setSendError(
        toUserFacingError(err, 'Não foi possível falar com o monitor.'),
      )
      setCanRetry(isRetryableSystemError(err))
    } finally {
      setSending(false)
      window.requestAnimationFrame(() => inputRef.current?.focus())
    }
  }

  // Depois que o histórico carrega, envia a pergunta que veio do Início.
  useEffect(() => {
    if (loadingHistory || historyError || !homeDraftRef.current) return
    const message = homeDraftRef.current
    homeDraftRef.current = ''
    void sendMessage(message)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingHistory, historyError])

  function onSubmit(e?: FormEvent) {
    e?.preventDefault()
    void sendMessage(draft)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !isMobileViewport()) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <section className="v1-0-conv">
      <div className="v1-0-thread" data-thread="1" ref={threadRef}>
        <div className="v1-0-thread__col">
          {loadingHistory ? (
            <div className="v1-0-skel" role="status" aria-busy="true">
              <div style={{ width: '30%' }} />
              <div style={{ width: '90%' }} />
              <div style={{ width: '65%' }} />
            </div>
          ) : historyError ? (
            <div className="v1-0-errbox" role="alert">
              <p>{historyError}</p>
              <button type="button" onClick={() => void loadHistory()}>
                Tentar de novo
              </button>
            </div>
          ) : (
            <>
              {lines.length === 0 ? (
                <BotMessage label="Monitor" monitor live={!sending}>
                  <p>{MONITOR_INTRO}</p>
                </BotMessage>
              ) : null}
              {lines.map((line) =>
                line.role === 'student' ? (
                  <UserBubble key={line.id}>{line.text}</UserBubble>
                ) : (
                  <BotMessage key={line.id} label="Monitor" monitor live={!sending && line === lines[lines.length - 1]}>
                    <p>
                      {renderInlineSegments(
                        parseInlineMarkdown(line.text),
                        line.text,
                      )}
                    </p>
                  </BotMessage>
                ),
              )}
            </>
          )}
          {sending ? <TypingRow monitor /> : null}
          {sendError ? (
            <div className="v1-0-errbox" role="alert">
              <p>{sendError}</p>
              {canRetry ? (
                <button type="button" onClick={() => onSubmit()}>
                  Tentar de novo
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <ScrollArrows upRef={upRef} downRef={downRef} />

      <div className="v1-0-dock">
        <div className="v1-0-dock__col">
          <div className="v1-0-dock__row">
            <form
              className={`v1-0-composer v1-0-composer--thread${
                sending ? ' is-locked' : draft.trim() ? ' has-text' : ''
              }`}
              onSubmit={onSubmit}
            >
              {sending ? (
                <div
                  className="v1-0-composer__lock v1-0-composer__wait"
                  role="status"
                  aria-live="polite"
                >
                  <LockIcon />
                  <span>Aguarde...</span>
                </div>
              ) : (
                <>
                  <textarea
                    ref={inputRef}
                    className="v1-0-composer__input"
                    rows={1}
                    value={draft}
                    placeholder="Pergunte ao seu monitor…"
                    aria-label="Pergunte ao seu monitor"
                    autoComplete="off"
                    onChange={(e) => {
                      setDraft(e.target.value)
                      autoGrow(e.target)
                    }}
                    onKeyDown={onKeyDown}
                  />
                  <button
                    type="submit"
                    className="v1-0-sendbtn"
                    aria-label="Enviar pergunta ao monitor"
                  >
                    <ArrowUpIcon />
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
