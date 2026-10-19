/** Formatação de datas/horas no fuso America/Sao_Paulo (Gestão). */

const TZ = 'America/Sao_Paulo'

export function formatSaoPauloDateTime(
  value: Date | { toDate?: () => Date } | string | null | undefined,
): string {
  const d = toDate(value)
  if (!d) return 'N/A'
  return d.toLocaleString('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatSaoPauloDateTimeShort(
  value: Date | { toDate?: () => Date } | string | null | undefined,
): string {
  const d = toDate(value)
  if (!d) return 'N/A'
  // dd/mm/aaaa hh:mm
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`
}

export function formatSaoPauloTime(
  value: Date | { toDate?: () => Date } | string | null | undefined,
): string {
  const d = toDate(value)
  if (!d) return ''
  return d.toLocaleTimeString('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatSaoPauloDate(
  value: Date | { toDate?: () => Date } | string | null | undefined,
): string {
  const d = toDate(value)
  if (!d) return 'N/A'
  return d.toLocaleDateString('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function toDate(
  value: Date | { toDate?: () => Date } | string | null | undefined,
): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'string') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value.toDate === 'function') {
    try {
      const d = value.toDate()
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null
    } catch {
      return null
    }
  }
  return null
}
