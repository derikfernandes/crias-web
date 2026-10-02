import { useMemo } from 'react'
import type { ConversationLog } from '../../../types/conversationLog'
import {
  formatLogDateLabel,
  formatLogTime,
  shouldShowDateSeparator,
} from '../../utils/conversationLogFormat'

export const LOGS_PAGE_SIZE = 50

export interface ConversationChatProps {
  logs: ConversationLog[]
  visibleCount: number
  onLoadMore?: () => void
  showTrail?: boolean
  showStudent?: boolean
}

export function ConversationChat({
  logs,
  visibleCount,
  onLoadMore,
  showTrail = false,
  showStudent = false,
}: ConversationChatProps) {
  const visibleLogs = useMemo(() => {
    const sortedNewestFirst = [...logs].sort((a, b) => {
      const ma = a.created_at?.toMillis?.() ?? 0
      const mb = b.created_at?.toMillis?.() ?? 0
      return mb - ma
    })
    return sortedNewestFirst.slice(0, visibleCount).slice().reverse()
  }, [logs, visibleCount])

  const remaining = Math.max(0, logs.length - visibleCount)

  return (
    <>
      <p className="muted chat__summary">
        Mostrando {visibleLogs.length} de {logs.length} mensagens (ordem
        cronológica, estilo chat).
      </p>
      <div className="chat" role="log" aria-label="Histórico de conversa">
        {remaining > 0 && onLoadMore ? (
          <div className="chat__load-more">
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={onLoadMore}
            >
              Carregar mensagens anteriores ({remaining} restantes)
            </button>
          </div>
        ) : null}
        {visibleLogs.map((row, index) => {
          const isStudent = row.sender === 'student'
          const dateLabel = shouldShowDateSeparator(visibleLogs, index)
            ? formatLogDateLabel(row)
            : null

          return (
            <div key={row.id}>
              {dateLabel ? (
                <div className="chat__date" role="separator">
                  <span>{dateLabel}</span>
                </div>
              ) : null}
              <div
                className={`chat__row ${isStudent ? 'chat__row--out' : 'chat__row--in'}`}
              >
                <div
                  className={`chat__bubble ${isStudent ? 'chat__bubble--out' : 'chat__bubble--in'}`}
                >
                  <div className="chat__context">
                    {showStudent ? (
                      <span className="chat__context-tag">{row.student_id}</span>
                    ) : null}
                    {showTrail ? (
                      <span className="chat__context-tag">{row.trail_id}</span>
                    ) : null}
                    <span className="chat__context-tag">
                      S{row.stage_number} · Q{row.question_number}
                    </span>
                    {row.message_type ? (
                      <span className="chat__context-tag">{row.message_type}</span>
                    ) : null}
                    {row.metadata?.forced_completion === true ? (
                      <span className="chat__context-tag chat__context-tag--forced">
                        conclusão forçada
                      </span>
                    ) : null}
                  </div>
                  <div className="chat__text">{row.message_text}</div>
                  <div className="chat__foot">
                    <time dateTime={row.created_at_brasilia ?? undefined}>
                      {formatLogTime(row)}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
