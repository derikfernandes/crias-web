import { useMemo } from 'react'
import type { ConversationLog } from '../../../types/conversationLog'
import {
  formatLogDateLabel,
  formatLogTime,
  shouldShowDateSeparator,
} from '../../utils/conversationLogFormat'
import { renderSafeMarkdownInline } from '../trilha/SafeMarkdown'

export const LOGS_PAGE_SIZE = 50

export interface ConversationChatProps {
  logs: ConversationLog[]
  visibleCount: number
  onLoadMore?: () => void
  showTrail?: boolean
  showStudent?: boolean
  /** Mapa trail_id → nome legível (evita mostrar ids internos como t47). */
  trailNames?: Map<string, string> | Record<string, string>
}

/** Mensagens espúrias do bot/engine (ex.: literal "0") não entram no histórico. */
export function isNoiseMessage(text: string | null | undefined): boolean {
  const raw = (text ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '')
  const t = raw.trim()
  if (!t) return true
  // "0" / '0' / 0 / 0.0
  const unquoted = t.replace(/^["'`]+|["'`]+$/g, '').trim()
  if (
    unquoted === '0' ||
    unquoted === 'null' ||
    unquoted === 'undefined' ||
    unquoted === 'NaN'
  ) {
    return true
  }
  if (/^0+(\.0+)?$/.test(unquoted)) return true
  return false
}

function trailLabel(
  trailId: string,
  names?: Map<string, string> | Record<string, string>,
): string {
  if (!trailId) return ''
  if (!names) return trailId
  if (names instanceof Map) return names.get(trailId) || trailId
  return names[trailId] || trailId
}

export function ConversationChat({
  logs,
  visibleCount,
  onLoadMore,
  showTrail = false,
  showStudent = false,
  trailNames,
}: ConversationChatProps) {
  const filtered = useMemo(
    () => logs.filter((row) => !isNoiseMessage(row.message_text)),
    [logs],
  )

  const visibleLogs = useMemo(() => {
    const sortedNewestFirst = [...filtered].sort((a, b) => {
      const ma = a.created_at?.toMillis?.() ?? 0
      const mb = b.created_at?.toMillis?.() ?? 0
      return mb - ma
    })
    return sortedNewestFirst.slice(0, visibleCount).slice().reverse()
  }, [filtered, visibleCount])

  const remaining = Math.max(0, filtered.length - visibleCount)

  return (
    <>
      <p className="muted chat__summary">
        Mostrando {visibleLogs.length} de {filtered.length} mensagens (ordem
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
                      <span className="chat__context-tag">
                        {trailLabel(row.trail_id, trailNames)}
                      </span>
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
                  <div className="chat__text">
                    {renderSafeMarkdownInline(row.message_text || '', {
                      singleAsterisk: 'italic',
                    })}
                  </div>
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
