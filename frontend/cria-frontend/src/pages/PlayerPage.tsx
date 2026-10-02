import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  advanceTrail,
  fetchNextContent,
  type NextContentOk,
  type NextContentStatus,
} from '../lib/api'
import { getSession } from '../lib/session'

type ChatMessage = {
  id: string
  role: 'assistant' | 'user' | 'system'
  text: string
  stageType?: NextContentOk['stage_type']
}

function contentToAssistantText(content: NextContentOk): string {
  const parts: string[] = []
  if (content.stage_title) parts.push(content.stage_title)
  if (content.stage_type === 'ai' && content.prompt) {
    parts.push(`_(Etapa com tutoria — ${content.prompt.slice(0, 120)}${content.prompt.length > 120 ? '…' : ''})_`)
  }
  if (content.content) parts.push(content.content)
  if (content.stage_type === 'ai' && !content.content) {
    parts.push(
      'Esta etapa usa tutoria inteligente. Em breve você poderá conversar aqui; por enquanto, leia a orientação acima e continue quando estiver pronto.',
    )
  }
  return parts.join('\n\n') || 'Conteúdo da etapa.'
}

export default function PlayerPage() {
  const { trailId = '' } = useParams()
  const session = getSession()!
  const [content, setContent] = useState<NextContentOk | NextContentStatus | null>(
    null,
  )
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const appendedKeyRef = useRef<string | null>(null)

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
    appendedKeyRef.current = null
    setMessages([])
    void load()
  }, [trailId, load])

  useEffect(() => {
    if (content?.status !== 'ok') return
    const key = `${content.stage_number}-${content.question_number}`
    if (appendedKeyRef.current === key) return
    appendedKeyRef.current = key
    setMessages((prev) => [
      ...prev,
      {
        id: `a-${key}-${Date.now()}`,
        role: 'assistant',
        text: contentToAssistantText(content),
        stageType: content.stage_type,
      },
    ])
  }, [content])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, content])

  async function onAdvance() {
    if (content?.status !== 'ok') return
    setBusy(true)
    setError(null)
    const userLine =
      content.stage_type === 'exercise' && selectedOption
        ? selectedOption
        : 'Continuar'
    setMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        role: 'user',
        text: userLine,
      },
    ])
    try {
      const result = await advanceTrail(session.student_id, trailId)
      if (result.status === 'ok' && result.completed) {
        setContent({
          status: 'completed',
          student_id: session.student_id,
          trail_id: trailId,
          message: 'Trilha concluída.',
        })
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            role: 'system',
            text: 'Parabéns! Você concluiu esta trilha.',
          },
        ])
      } else if (result.status === 'ok') {
        appendedKeyRef.current = null
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

  const showComposer =
    content?.status === 'ok' &&
    (content.stage_type !== 'exercise' ||
      !Array.isArray(content.options) ||
      content.options.length === 0 ||
      selectedOption)

  return (
    <div className="chat-thread">
      <div className="chat-thread__header">
        <Link className="ghost" to="/">
          Todas as trilhas
        </Link>
        <h1>{trailId}</h1>
      </div>

      {error ? (
        <p className="error chat-thread__banner" role="alert">
          {error}
        </p>
      ) : null}

      <div className="chat-thread__scroll" ref={threadRef}>
        {messages.map((msg) => (
          <article
            key={msg.id}
            className={`chat-bubble chat-bubble--${msg.role}`}
            data-stage-type={msg.stageType}
          >
            <p className="chat-bubble__label">
              {msg.role === 'assistant'
                ? 'Trilha'
                : msg.role === 'user'
                  ? 'Você'
                  : 'Sistema'}
            </p>
            <div className="chat-bubble__body">
              {msg.text.split('\n').map((line, i) => (
                <p key={i}>{line || '\u00a0'}</p>
              ))}
            </div>
          </article>
        ))}

        {!content ? (
          <p className="muted chat-thread__loading">Carregando…</p>
        ) : content.status === 'blocked' ? (
          <article className="chat-bubble chat-bubble--system">
            <p className="chat-bubble__body">
              {content.message ||
                'Esta etapa ainda não foi liberada pela instituição.'}
            </p>
          </article>
        ) : content.status === 'completed' ? null : content.status !== 'ok' ? (
          <article className="chat-bubble chat-bubble--system">
            <p className="chat-bubble__body">
              {content.message || `Indisponível (${content.status}).`}
            </p>
          </article>
        ) : null}

        {content?.status === 'ok' &&
        content.stage_type === 'exercise' &&
        Array.isArray(content.options) &&
        content.options.length > 0 ? (
          <fieldset className="chat-exercise">
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

        {content?.status === 'ok' && content.explanation && selectedOption ? (
          <p className="chat-exercise__hint">{content.explanation}</p>
        ) : null}
      </div>

      {content?.status === 'ok' ? (
        <footer className="chat-composer">
          {content.stage_type === 'exercise' &&
          Array.isArray(content.options) &&
          content.options.length > 0 &&
          !selectedOption ? (
            <p className="muted">Selecione uma opção acima para continuar.</p>
          ) : null}
          {showComposer ? (
            <button type="button" onClick={() => void onAdvance()} disabled={busy}>
              {busy ? 'Enviando…' : 'Continuar'}
            </button>
          ) : null}
        </footer>
      ) : null}
    </div>
  )
}
