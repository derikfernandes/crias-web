import type { ConversationLogRow } from './api'

export type ChatMessage = {
  id: string
  role: 'assistant' | 'user' | 'system'
  text: string
  stageType?: 'ai' | 'fixed' | 'exercise'
  cellKey?: string
}

/** Remove *markdown* / # headings soltos usados como título. */
export function stripDecorTitle(raw: string): string {
  let s = raw.trim()
  s = s.replace(/^#{1,6}\s+/, '')
  const starred = s.match(/^\*{1,3}([^*]+)\*{1,3}$/)
  if (starred) return starred[1].trim()
  return s
}

/** Strip leve de *bold* no corpo (não só título de linha). */
export function lightStripMarkdown(raw: string): string {
  return raw
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
}

export function normalizeTitleKey(raw: string): string {
  return stripDecorTitle(raw)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function isContinuarText(text: string): boolean {
  return text.trim().toLowerCase() === 'continuar'
}

function metaSource(
  metadata: ConversationLogRow['metadata'],
): string {
  if (!metadata || typeof metadata !== 'object') return ''
  const source = (metadata as { source?: unknown }).source
  return typeof source === 'string' ? source : ''
}

function isTrailDeliveryLog(l: ConversationLogRow): boolean {
  if (l.sender !== 'system') return false
  const source = metaSource(l.metadata)
  if (
    source === 'maria-tutor' ||
    source === 'exercise_feedback' ||
    source === 'continuar'
  ) {
    return false
  }
  if (source === 'trail-ai' || source === 'next-content') return true
  return l.message_type === 'instruction'
}

/**
 * History → bolhas: 1 delivery por célula trail-ai/next-content;
 * filtra Continuar; strip markdown leve.
 */
export function logsToMessages(logs: ConversationLogRow[]): ChatMessage[] {
  const seenTrailCells = new Set<string>()
  const out: ChatMessage[] = []

  for (const l of logs) {
    const raw = String(l.message_text ?? '').trim()
    if (!raw) continue

    const source = metaSource(l.metadata)
    if (source === 'continuar') continue
    if (l.sender === 'student' && isContinuarText(raw)) continue

    const text = lightStripMarkdown(raw)

    if (isTrailDeliveryLog(l)) {
      const cell = `${l.stage_number}-${l.question_number}`
      if (seenTrailCells.has(cell)) continue
      seenTrailCells.add(cell)
      out.push({
        id: `trail-${cell}`,
        role: 'assistant',
        text,
        cellKey: cell,
      })
      continue
    }

    out.push({
      id: l.id,
      role: l.sender === 'student' ? 'user' : 'assistant',
      text,
    })
  }

  return out
}

export function trailCellKey(stage: number, question: number): string {
  return `${stage}-${question}`
}

export function trailMessageId(stage: number, question: number): string {
  return `trail-${stage}-${question}`
}

/** Autolink + embed básico de imagens (ibb) / links Drive. */
export function renderMessageLines(text: string): Array<{
  key: string
  kind: 'text' | 'image' | 'link'
  value: string
  label?: string
}> {
  const lines = text.split('\n')
  const out: Array<{
    key: string
    kind: 'text' | 'image' | 'link'
    value: string
    label?: string
  }> = []
  const urlRe = /(https?:\/\/[^\s<]+)/gi

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim()
    if (!trimmed) {
      // Colapsa linhas vazias / \xa0 — não renderiza spacer visual.
      return
    }

    const parts = trimmed.split(urlRe)
    if (parts.length === 1) {
      out.push({
        key: `t-${lineIdx}`,
        kind: 'text',
        value: stripDecorTitle(lightStripMarkdown(trimmed)),
      })
      return
    }

    parts.forEach((part, i) => {
      if (!part) return
      if (/^https?:\/\//i.test(part)) {
        const clean = part.replace(/[),.;]+$/, '')
        const isImg =
          /i\.ibb\.co\//i.test(clean) ||
          /\.(png|jpe?g|gif|webp)(\?|$)/i.test(clean)
        if (isImg) {
          out.push({ key: `img-${lineIdx}-${i}`, kind: 'image', value: clean })
        } else {
          out.push({
            key: `a-${lineIdx}-${i}`,
            kind: 'link',
            value: clean,
            label: /drive\.google\.com/i.test(clean) ? 'Abrir no Drive' : clean,
          })
        }
      } else {
        out.push({
          key: `t-${lineIdx}-${i}`,
          kind: 'text',
          value: stripDecorTitle(lightStripMarkdown(part)),
        })
      }
    })
  })

  return out
}
