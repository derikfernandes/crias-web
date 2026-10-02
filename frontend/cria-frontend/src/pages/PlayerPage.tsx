import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useParams } from 'react-router-dom'
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
  if (content.content) parts.push(content.content)
  if (!content.content && content.stage_type === 'ai' && content.prompt) {
    parts.push(
      'Esta etapa usa tutoria. Envie uma mensagem para começar ou continue quando estiver pronto.',
    )
  }
  return parts.join('\n\n') || 'Conteúdo da etapa.'
}

function statusToSystemText(content: NextContentStatus): string {
  if (content.status === 'blocked') {
    return (
      content.message ||
      'Esta etapa ainda não foi liberada pela instituição.'
    )
  }
  if (content.status === 'completed') {
    return content.message || 'Trilha concluída.'
  }
  return content.message || `Indisponível (${content.status}).`
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
  const [draft, setDraft] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
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
    setDraft('')
    void load()
  }, [trailId, load])

  useEffect(() => {
    if (!content) return

    if (content.status === 'ok') {
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
      return
    }

    const key = `status-${content.status}-${content.stage_number ?? ''}-${content.question_number ?? ''}`
    if (appendedKeyRef.current === key) return
    appendedKeyRef.current = key
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${key}-${Date.now()}`,
        role: 'system',
        text: statusToSystemText(content),
      },
    ])
  }, [content])

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, content])

  useEffect(() => {
    if (content?.status === 'ok') inputRef.current?.focus()
  }, [content])

  async function submitAdvance(userLine: string) {
    if (content?.status !== 'ok') return
    setBusy(true)
    setError(null)
    setMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        role: 'user',
        text: userLine,
      },
    ])
    setDraft('')
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

  async function onSend(event?: FormEvent) {
    event?.preventDefault()
    if (busy || content?.status !== 'ok') return

    const trimmed = draft.trim()
    const hasOptions =
      content.stage_type === 'exercise' &&
      Array.isArray(content.options) &&
      content.options.length > 0

    if (hasOptions && !selectedOption && !trimmed) {
      setError('Selecione uma opção ou digite sua resposta.')
      return
    }

    let userLine: string
    if (hasOptions && selectedOption) {
      userLine = trimmed ? `${selectedOption}\n${trimmed}` : selectedOption
    } else if (trimmed) {
      userLine = trimmed
    } else if (content.stage_type === 'ai') {
      userLine = 'Vamos começar'
    } else {
      userLine = 'Continuar'
    }

    await submitAdvance(userLine)
  }

  function onComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void onSend()
    }
  }

  const canSend = content?.status === 'ok' && !busy
  const placeholder =
    content?.status !== 'ok'
      ? 'Trilha indisponível no momento'
      : content.stage_type === 'exercise'
        ? 'Digite sua resposta ou selecione uma opção…'
        : content.stage_type === 'ai'
          ? 'Envie uma mensagem para continuar a trilha…'
          : 'Digite uma mensagem ou envie para continuar…'

  return (
    <div className="chat-thread">
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
                ? 'Crias'
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
                    onChange={() => {
                      setSelectedOption(label)
                      setError(null)
                    }}
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

      <footer className="chat-composer">
        <form className="chat-composer__form" onSubmit={(e) => void onSend(e)}>
          <textarea
            ref={inputRef}
            className="chat-composer__input"
            rows={1}
            value={draft}
            disabled={!canSend}
            placeholder={placeholder}
            aria-label="Mensagem"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onComposerKeyDown}
          />
          <button type="submit" disabled={!canSend} aria-label="Enviar">
            {busy ? '…' : 'Enviar'}
          </button>
        </form>
        {content?.status === 'ok' && content.stage_type !== 'exercise' ? (
          <p className="muted chat-composer__hint">
            Enter envia · Shift+Enter quebra linha
            {content.stage_type === 'fixed' ? ' · mensagem vazia = Continuar' : ''}
          </p>
        ) : null}
      </footer>
    </div>
  )
}
