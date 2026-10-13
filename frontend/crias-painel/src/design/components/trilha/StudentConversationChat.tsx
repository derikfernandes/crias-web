import { useEffect, useRef } from 'react'
import { SafeMarkdown } from './SafeMarkdown'
import {
  formatChatLogDateLabel,
  formatChatLogTime,
  shouldShowChatDateSeparator,
  type ChatLogLike,
} from '../../utils/studentChatFormat'

export type StudentChatBubble = ChatLogLike & {
  id: string
  sender: 'system' | 'student'
  message_text: string
  stage_number?: number
  question_number?: number
  /** Bolha efémera do passo atual (ainda sem log — resume sem ensure). */
  ephemeral?: boolean
}

export type StudentConversationChatProps = {
  messages: StudentChatBubble[]
  /** Scroll automático para a última mensagem ao montar / atualizar. */
  stickToEnd?: boolean
}

/**
 * Chat-first aluno — bolhas cronológicas (SoT conversation_logs).
 * Visual próprio (não reutiliza ConversationChat admin).
 */
export function StudentConversationChat({
  messages,
  stickToEnd = true,
}: StudentConversationChatProps) {
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!stickToEnd) return
    const el = endRef.current
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages.length, stickToEnd])

  if (messages.length === 0) {
    return (
      <div className="trilha-chat__empty" role="status">
        <p className="trilha-chat__empty-title">A conversa começa aqui</p>
        <p className="trilha-chat__empty-lede">
          Quando a trilha entregar o próximo passo, ele aparece como mensagem —
          como no WhatsApp.
        </p>
      </div>
    )
  }

  return (
    <div
      className="trilha-chat__thread"
      role="log"
      aria-label="Histórico da trilha"
      aria-live="polite"
    >
      {messages.map((row, index) => {
        const isStudent = row.sender === 'student'
        const dateLabel = shouldShowChatDateSeparator(messages, index)
          ? formatChatLogDateLabel(row)
          : null
        const time = formatChatLogTime(row)

        return (
          <div key={row.id} className="trilha-chat__block">
            {dateLabel ? (
              <div className="trilha-chat__day" role="separator">
                <span>{dateLabel}</span>
              </div>
            ) : null}
            <div
              className={
                isStudent
                  ? 'trilha-chat__row trilha-chat__row--out'
                  : 'trilha-chat__row trilha-chat__row--in'
              }
            >
              <div
                className={
                  isStudent
                    ? 'trilha-chat__bubble trilha-chat__bubble--out'
                    : row.ephemeral
                      ? 'trilha-chat__bubble trilha-chat__bubble--in trilha-chat__bubble--live'
                      : 'trilha-chat__bubble trilha-chat__bubble--in'
                }
              >
                {!isStudent ? (
                  <p className="trilha-chat__who">
                    Trilha
                    {typeof row.stage_number === 'number' &&
                    typeof row.question_number === 'number' ? (
                      <span className="trilha-chat__cell">
                        · E{row.stage_number} · Q{row.question_number}
                      </span>
                    ) : null}
                    {row.ephemeral ? (
                      <span className="trilha-chat__live-tag">agora</span>
                    ) : null}
                  </p>
                ) : (
                  <p className="trilha-chat__who trilha-chat__who--you">Você</p>
                )}
                <div className="trilha-chat__text">
                  {isStudent ? (
                    <p>{row.message_text}</p>
                  ) : (
                    <SafeMarkdown text={row.message_text} />
                  )}
                </div>
                {time ? (
                  <div className="trilha-chat__foot">
                    <time dateTime={row.created_at_brasilia ?? row.created_at ?? undefined}>
                      {time}
                    </time>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}
      <div ref={endRef} aria-hidden="true" />
    </div>
  )
}
