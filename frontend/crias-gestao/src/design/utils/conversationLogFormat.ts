import type { ConversationLog } from '../../types/conversationLog'
import {
  formatSaoPauloDate,
  formatSaoPauloTime,
} from '../../lib/formatSaoPaulo'

const TZ = 'America/Sao_Paulo'

export function formatLogWhen(row: ConversationLog): string {
  const date = getLogDate(row)
  if (!date) return 'N/A'
  return date.toLocaleString('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getLogDate(row: ConversationLog): Date | null {
  // Preferir Timestamp UTC e formatar em São Paulo (created_at_brasilia às vezes
  // já veio "local" sem offset e deslocava 3h ao parsear de novo).
  if (row.created_at?.toDate) {
    try {
      const d = row.created_at.toDate()
      if (d && !Number.isNaN(d.getTime())) return d
    } catch {
      // fallback abaixo
    }
  }
  if (row.created_at_brasilia) {
    const raw = row.created_at_brasilia.trim()
    // Se não tem fuso, interpreta como horário de Brasília.
    const hasTz = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)
    const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T')
    const parsed = Date.parse(
      hasTz ? normalized : `${normalized}-03:00`,
    )
    if (!Number.isNaN(parsed)) return new Date(parsed)
  }
  return null
}

export function formatLogTime(row: ConversationLog): string {
  const date = getLogDate(row)
  if (!date) return ''
  return formatSaoPauloTime(date)
}

function saoPauloDayKey(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: TZ })
}

export function formatLogDateLabel(row: ConversationLog): string | null {
  const date = getLogDate(row)
  if (!date) return null

  const todayKey = saoPauloDayKey(new Date())
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = saoPauloDayKey(yesterday)
  const key = saoPauloDayKey(date)

  if (key === todayKey) return 'Hoje'
  if (key === yesterdayKey) return 'Ontem'
  return formatSaoPauloDate(date)
}

export function shouldShowDateSeparator(
  logs: ConversationLog[],
  index: number,
): boolean {
  if (index === 0) return true
  const current = getLogDate(logs[index])
  const previous = getLogDate(logs[index - 1])
  if (!current || !previous) return false
  return saoPauloDayKey(current) !== saoPauloDayKey(previous)
}
