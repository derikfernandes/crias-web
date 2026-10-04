/**
 * Formatação de mensagens do chat aluno (conversation_logs).
 * Espelha regras de design/utils/conversationLogFormat sem depender de Timestamp Firebase.
 */

export type ChatLogLike = {
  created_at?: string | null
  created_at_brasilia?: string | null
}

export function getChatLogDate(row: ChatLogLike): Date | null {
  if (row.created_at_brasilia) {
    const parsed = new Date(row.created_at_brasilia.replace(' ', 'T'))
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  if (row.created_at) {
    const parsed = new Date(row.created_at)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return null
}

export function formatChatLogTime(row: ChatLogLike): string {
  const date = getChatLogDate(row)
  if (!date) return ''
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function formatChatLogDateLabel(row: ChatLogLike): string | null {
  const date = getChatLogDate(row)
  if (!date) return null

  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (sameCalendarDay(date, today)) return 'Hoje'
  if (sameCalendarDay(date, yesterday)) return 'Ontem'
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function shouldShowChatDateSeparator(
  logs: ChatLogLike[],
  index: number,
): boolean {
  if (index === 0) return true
  const current = getChatLogDate(logs[index])
  const previous = getChatLogDate(logs[index - 1])
  if (!current || !previous) return false
  return !sameCalendarDay(current, previous)
}
