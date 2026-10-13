import type { ReactNode } from 'react'
import { createElement, Fragment } from 'react'

/**
 * Markdown mínimo e seguro: **negrito**, *itálico*, `código`, quebras de linha.
 * Sem HTML cru — só nós React (sem XSS / sem dangerouslySetInnerHTML).
 */

type Seg =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'italic'; value: string }
  | { kind: 'code'; value: string }

function parseInline(text: string): Seg[] {
  const segs: Seg[] = []
  let last = 0
  let m: RegExpExecArray | null
  // WhatsApp: *negrito*; GitHub: **negrito**; _itálico_; `código`
  const re =
    /(\*\*([^*]+)\*\*|\*([^*\n]+)\*|_([^_\n]+)_|`([^`\n]+)`)/g
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      segs.push({ kind: 'text', value: text.slice(last, m.index) })
    }
    if (m[2] != null) segs.push({ kind: 'bold', value: m[2] })
    else if (m[3] != null) segs.push({ kind: 'bold', value: m[3] })
    else if (m[4] != null) segs.push({ kind: 'italic', value: m[4] })
    else if (m[5] != null) segs.push({ kind: 'code', value: m[5] })
    last = m.index + m[0].length
  }
  if (last < text.length) {
    segs.push({ kind: 'text', value: text.slice(last) })
  }
  return segs.length ? segs : [{ kind: 'text', value: text }]
}

function renderSegs(segs: Seg[], keyPrefix: string): ReactNode[] {
  return segs.map((seg, i) => {
    const key = `${keyPrefix}-${i}`
    if (seg.kind === 'bold') {
      return createElement('strong', { key }, seg.value)
    }
    if (seg.kind === 'italic') {
      return createElement('em', { key }, seg.value)
    }
    if (seg.kind === 'code') {
      return createElement(
        'code',
        { key, className: 'trilha-md__code' },
        seg.value,
      )
    }
    return createElement(Fragment, { key }, seg.value)
  })
}

function renderParagraph(para: string, key: string): ReactNode {
  const lines = para.split(/\n/)
  const children: ReactNode[] = []
  lines.forEach((line, i) => {
    if (i > 0) children.push(createElement('br', { key: `${key}-br-${i}` }))
    children.push(...renderSegs(parseInline(line), `${key}-L${i}`))
  })
  return createElement('p', { key }, children)
}

export function renderSafeMarkdownInline(source: string): ReactNode {
  const text = source.replace(/\r\n/g, '\n').trim()
  if (!text) return null
  const lines = text.split(/\n/)
  const children: ReactNode[] = []
  lines.forEach((line, i) => {
    if (i > 0) children.push(createElement('br', { key: `ibr-${i}` }))
    children.push(...renderSegs(parseInline(line), `iL${i}`))
  })
  return createElement(Fragment, null, children)
}

export function renderSafeMarkdown(source: string): ReactNode {
  const text = source.replace(/\r\n/g, '\n').trim()
  if (!text) return null
  const paragraphs = text.split(/\n{2,}/)
  return createElement(
    Fragment,
    null,
    paragraphs.map((p, i) => renderParagraph(p, `p${i}`)),
  )
}

export function SafeMarkdown({
  text,
  inline = false,
}: {
  text: string
  /** Sem `<p>` — para título / resposta dentro de heading ou parágrafo. */
  inline?: boolean
}) {
  return <>{inline ? renderSafeMarkdownInline(text) : renderSafeMarkdown(text)}</>
}
