import type { ConversationLog } from '../../types/conversationLog'

export function formatLogWhen(row: ConversationLog): string {
  if (row.created_at_brasilia) return row.created_at_brasilia
  if (row.created_at?.toDate) return row.created_at.toDate().toLocaleString('pt-BR')
  return '—'
}

export function getLogDate(row: ConversationLog): Date | null {
  if (row.created_at_brasilia) {
    const parsed = new Date(row.created_at_brasilia)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  if (row.created_at?.toDate) return row.created_at.toDate()
  return null
}

export function formatLogTime(row: ConversationLog): string {
  const date = getLogDate(row)
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

export function formatLogDateLabel(row: ConversationLog): string | null {
  const date = getLogDate(row)
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

export function shouldShowDateSeparator(
  logs: ConversationLog[],
  index: number,
): boolean {
  if (index === 0) return true
  const current = getLogDate(logs[index])
  const previous = getLogDate(logs[index - 1])
  if (!current || !previous) return false
  return !sameCalendarDay(current, previous)
}
