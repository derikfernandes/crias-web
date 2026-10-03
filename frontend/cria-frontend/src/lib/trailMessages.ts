import type { ConversationLogRow } from './api'

export type ChatMessage = {
  id: string
  role: 'assistant' | 'user' | 'system'
  text: string
  stageType?: 'ai' | 'fixed' | 'exercise'
  cellKey?: string
  /** Question da trilha (para colapsar cross-q no tail default). */
  questionNumber?: number
  /** Só mensagens novas (pós-historyReady) entram com motion. */
  animate?: boolean
  /** Resume pós-Voltar — highlight de borda 1 ciclo. */
  kind?: 'resume' | 'feedback' | 'sidechat' | 'exercise-answer'
  /** Timestamp HH:MM exibido sob a bolha (mockup Maria). */
  timeLabel?: string
}

/** Formata HH:MM a partir de ms / ISO / agora. */
export function formatBubbleTime(
  input?: string | number | null,
  fallbackNow = false,
): string | undefined {
  let ms: number | null = null
  if (typeof input === 'number' && Number.isFinite(input)) ms = input
  else if (typeof input === 'string' && input.trim()) {
    const parsed = Date.parse(input)
    if (Number.isFinite(parsed)) ms = parsed
  }
  if (ms == null) {
    if (!fallbackNow) return undefined
    ms = Date.now()
  }
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(ms))
  } catch {
    const d = new Date(ms)
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  }
}

/** Detecta stage AI de feedback pedagógico (BLOCO RESPOSTA / FINAL). */
export function isBlocoRespostaContent(input: {
  stage_type?: string | null
  stage_title?: string | null
  prompt?: string | null
}): boolean {
  if (input.stage_type && input.stage_type !== 'ai') return false
  const p = (input.prompt ?? '').toUpperCase()
  const t = (input.stage_title ?? '').toUpperCase()
  return (
    p.includes('BLOCO RESPOSTA') ||
    p.includes('OBJETIVO - BLOCO RESPOSTA') ||
    p.includes('BLOCO FINAL') ||
    p.includes('OBJETIVO - BLOCO FINAL') ||
    (t.includes('RESPOSTA') && !t.includes('PERGUNTA'))
  )
}

/** Remove *markdown* / # headings soltos usados como título. */
export function stripDecorTitle(raw: string): string {
  let s = raw.trim()
  s = s.replace(/^#{1,6}\s+/, '')
  const starred = s.match(/^\*{1,3}([^*]+)\*{1,3}$/)
  if (starred) return starred[1].trim()
  return s
}

/**
 * Strip leve de *bold* — só quando o texto precisa ir cru (ex.: title key).
 * Display usa parseInlineMarkdown / renderMessageLines (preserva ênfase).
 */
export function lightStripMarkdown(raw: string): string {
  return raw
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
}

export type InlineSeg = {
  key: string
  kind: 'text' | 'em' | 'strong'
  value: string
}

/**
 * Parse inline markdown comum da escola/IA: **bold**, __bold__, *em*, _em_.
 * Não reescreve conteúdo — só marca segmentos para o renderer.
 * C2-R9 N04: valores em/strong podem ainda conter `*continue*` — o renderer
 * re-parseia aninhado (ver renderInlineSegments).
 */
export function parseInlineMarkdown(raw: string): InlineSeg[] {
  const src = String(raw ?? '')
  if (!src) return []
  const out: InlineSeg[] = []
  // Ordem: ** / __ antes de * / _
  const re = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(src)) != null) {
    if (m.index > last) {
      out.push({ key: `t${i++}`, kind: 'text', value: src.slice(last, m.index) })
    }
    if (m[2] != null) {
      out.push({ key: `s${i++}`, kind: 'strong', value: m[2] })
    } else if (m[3] != null) {
      out.push({ key: `s${i++}`, kind: 'strong', value: m[3] })
    } else if (m[4] != null) {
      out.push({ key: `e${i++}`, kind: 'em', value: m[4] })
    } else if (m[5] != null) {
      out.push({ key: `e${i++}`, kind: 'em', value: m[5] })
    }
    last = m.index + m[0].length
  }
  if (last < src.length) {
    out.push({ key: `t${i++}`, kind: 'text', value: src.slice(last) })
  }
  return out.length > 0 ? out : [{ key: 't0', kind: 'text', value: src }]
}

/** Remove vereditos hardcoded do player legado no histórico. */
export function stripHardcodedVerdict(text: string): string {
  return String(text ?? '')
    .replace(
      /^(Resposta correta!|Resposta incorreta\.|Resposta registrada\.)(\s*\n+)?/i,
      '',
    )
    .trim()
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

/** Conclusão de aula embutida em BLOCO/feedback antigo (mid-aula). */
const LESSON_CONCLUDE_RE =
  /parab[eé]ns\s+por\s+concluir(?:\s+a\s+aula)?/i

/** CTA de fechamento frequentemente colado após o conclude. */
const LESSON_CONCLUDE_TRAILER_RE =
  /💬\s*_?Ficou com alguma d[uú]vida\?[\s\S]*$/i

export function looksLikeLessonConclusion(text: string): boolean {
  return LESSON_CONCLUDE_RE.test(String(text ?? ''))
}

/**
 * Remove “Parabéns por concluir a aula…” (e trailer) de bolhas mid-aula.
 * Não apaga o restante do BLOCO/feedback — só o fecho prematuro.
 * (Não usa “Resposta Final” como âncora — é título legítimo do BLOCO.)
 */
export function stripMidLessonConclusion(text: string): string {
  let s = String(text ?? '')
  if (!LESSON_CONCLUDE_RE.test(s)) return s
  const m = s.match(LESSON_CONCLUDE_RE)
  if (m && typeof m.index === 'number') {
    s = s.slice(0, m.index)
  }
  s = s.replace(LESSON_CONCLUDE_TRAILER_RE, '')
  return s.replace(/\n{3,}/g, '\n\n').trim()
}

function metaSource(
  metadata: ConversationLogRow['metadata'],
): string {
  if (!metadata || typeof metadata !== 'object') return ''
  const source = (metadata as { source?: unknown }).source
  return typeof source === 'string' ? source : ''
}

/** Entrega de célula da trilha (fixed/exercise/ai) — não sidechat/feedback. */
export function isTrailDeliveryLog(l: ConversationLogRow): boolean {
  if (l.sender !== 'system') return false
  const source = metaSource(l.metadata)
  if (
    source === 'maria-tutor' ||
    source === 'exercise_feedback' ||
    source === 'exercise_attempt' ||
    source === 'continuar'
  ) {
    return false
  }
  if (source === 'trail-ai' || source === 'next-content') return true
  // Logs legados Chatis: exercise/instruction sem metadata.source
  return l.message_type === 'instruction' || l.message_type === 'exercise'
}

const FOREIGN_LANG_RE =
  /\b(reg[eê]ncia(\s+verbal)?|preposi[cç][aã]o|verbo\s+gostar|gosta\s+de\s+nadar)\b/i

/** Alinha feedback antigo que mistura incorreta + celebração. */
export function sanitizeFeedbackText(text: string): string {
  let raw = stripHardcodedVerdict(String(text ?? '').trim())
  if (!raw) return raw
  const incorrect = /resposta\s+incorreta/i.test(raw)
  if (incorrect) return alignBlocoWithAttempt(raw, false) || raw
  if (
    /resposta\s+correta/i.test(raw) &&
    /voc[eê]\s+errou|n[aã]o\s+acert/i.test(raw)
  ) {
    return alignBlocoWithAttempt(raw, true) || raw
  }
  return raw
}

/**
 * History → bolhas: 1 delivery por célula trail-ai/next-content;
 * filtra Continuar; strip markdown leve; higiene de feedback contraditório.
 */
export function logsToMessages(logs: ConversationLogRow[]): ChatMessage[] {
  /** Índice da bolha trail por célula — preferimos a entrega mais recente. */
  const trailCellIndex = new Map<string, number>()
  const out: ChatMessage[] = []

  for (const l of logs) {
    let raw = String(l.message_text ?? '').trim()
    if (!raw) continue

    const source = metaSource(l.metadata)
    if (source === 'continuar') continue
    if (l.sender === 'student' && isContinuarText(raw)) continue

    const isFeedback =
      l.message_type === 'feedback' || source === 'exercise_feedback'
    if (isFeedback) {
      raw = sanitizeFeedbackText(raw)
      if (!raw) continue
    }

    // Defesa: delivery trail com matéria estrangeira cede à mais recente limpa.
    if (isTrailDeliveryLog(l) && FOREIGN_LANG_RE.test(raw)) {
      const cell = `${l.stage_number}-${l.question_number}`
      const prevIdx = trailCellIndex.get(cell)
      if (prevIdx !== undefined) {
        const prev = out[prevIdx]
        if (prev && !FOREIGN_LANG_RE.test(prev.text)) {
          // Mantém a limpa já na lista; ignora stale foreign.
          continue
        }
      }
    }

    // Preserva markdown inline (_em_ / **bold**) para o renderer.
    const text = raw

    if (isTrailDeliveryLog(l)) {
      const cell = `${l.stage_number}-${l.question_number}`
      const prevIdx = trailCellIndex.get(cell)
      const msg: ChatMessage = {
        id: `trail-${cell}`,
        role: 'assistant',
        text,
        cellKey: cell,
        questionNumber: l.question_number,
        timeLabel: formatBubbleTime(
          l.created_at_ms ?? l.created_at ?? l.created_at_brasilia,
        ),
      }
      if (prevIdx !== undefined) {
        // force_regenerate / BLOCO corrigido: substitui a bolha antiga da célula.
        // Não trocar texto limpo por foreign mais recente (log podre).
        if (
          FOREIGN_LANG_RE.test(text) &&
          !FOREIGN_LANG_RE.test(out[prevIdx].text)
        ) {
          continue
        }
        out[prevIdx] = msg
      } else {
        trailCellIndex.set(cell, out.length)
        out.push(msg)
      }
      continue
    }

    const isExerciseAnswer =
      l.sender === 'student' &&
      (l.message_type === 'exercise' || source === 'exercise_attempt')

    out.push({
      id: l.id,
      role: l.sender === 'student' ? 'user' : 'assistant',
      text,
      questionNumber:
        typeof l.question_number === 'number' && l.question_number >= 1
          ? l.question_number
          : undefined,
      kind: isExerciseAnswer
        ? 'exercise-answer'
        : isFeedback
          ? 'feedback'
          : undefined,
      stageType: isExerciseAnswer || isFeedback ? 'exercise' : undefined,
      timeLabel: formatBubbleTime(
        l.created_at_ms ?? l.created_at ?? l.created_at_brasilia,
      ),
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

/** Label amigável para URLs conhecidas (YouTube / Drive / genérico). */
export function linkLabelForUrl(url: string): string {
  if (/youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts\//i.test(url)) {
    return 'Assistir no YouTube'
  }
  if (/drive\.google\.com/i.test(url)) return 'Abrir no Drive'
  if (/docs\.google\.com/i.test(url)) return 'Abrir no Google Docs'
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return host || url
  } catch {
    return url
  }
}

export type EmbedKind = 'youtube' | 'drive'

/** True se o texto da bolha/etapa contém YT/Drive embutível (R08-M02). */
export function textHasEmbed(text: string): boolean {
  if (!text) return false
  const urlRe = /https?:\/\/[^\s<]+/gi
  let m: RegExpExecArray | null
  while ((m = urlRe.exec(text))) {
    const clean = m[0].replace(/[),.;]+$/, '')
    if (embedInfoForUrl(clean)) return true
  }
  return false
}

/** URL de embed in-app para YT/Drive; null se não suportado. */
export function embedInfoForUrl(
  url: string,
): { kind: EmbedKind; embedUrl: string } | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '').toLowerCase()

    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0]
      if (id) {
        return {
          kind: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(id)}`,
        }
      }
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') {
        const id = u.searchParams.get('v')
        if (id) {
          return {
            kind: 'youtube',
            embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(id)}`,
          }
        }
      }
      const shorts = u.pathname.match(/^\/shorts\/([^/]+)/)
      if (shorts?.[1]) {
        return {
          kind: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(shorts[1])}`,
        }
      }
      const embed = u.pathname.match(/^\/embed\/([^/]+)/)
      if (embed?.[1]) {
        return {
          kind: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(embed[1])}`,
        }
      }
    }

    if (host === 'drive.google.com') {
      const file = u.pathname.match(/\/file\/d\/([^/]+)/)
      if (file?.[1]) {
        return {
          kind: 'drive',
          embedUrl: `https://drive.google.com/file/d/${encodeURIComponent(file[1])}/preview`,
        }
      }
      const openId = u.searchParams.get('id')
      if (openId) {
        return {
          kind: 'drive',
          embedUrl: `https://drive.google.com/file/d/${encodeURIComponent(openId)}/preview`,
        }
      }
    }
  } catch {
    return null
  }
  return null
}

/**
 * Remove linhas do BLOCO RESPOSTA que contradizem o resultado do attempt
 * (ex.: "Parabéns pelo acerto" após resposta incorreta).
 */
export function alignBlocoWithAttempt(
  bloco: string,
  isCorrect: boolean,
): string {
  const celebrate =
    /parab[eé]ns|voc[eê]\s+acert|pelo\s+acerto|resposta\s+correta|muito\s+bem[,!]?\s*(voc|$)/i
  const mourn =
    /resposta\s+incorreta|voc[eê]\s+errou|n[aã]o\s+acert|infelizmente|n[aã]o\s+foi\s+dessa/i
  const lines = bloco.split(/\r?\n/)
  const kept = lines.filter((line) => {
    const t = line.trim()
    if (!t) return true
    if (!isCorrect && celebrate.test(t)) return false
    if (isCorrect && mourn.test(t)) return false
    return true
  })
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function blocoConflictsWithAttempt(
  bloco: string,
  isCorrect: boolean,
): boolean {
  const celebrate =
    /parab[eé]ns|voc[eê]\s+acert|pelo\s+acerto|resposta\s+correta/i
  const mourn = /resposta\s+incorreta|voc[eê]\s+errou|n[aã]o\s+acert/i
  if (!isCorrect && celebrate.test(bloco)) return true
  if (isCorrect && mourn.test(bloco)) return true
  return false
}

export type MessagePart = {
  key: string
  kind: 'text' | 'image' | 'link' | 'embed'
  value: string
  label?: string
  /** Segmentos inline (markdown) — só em kind=text. */
  segments?: InlineSeg[]
  embedKind?: EmbedKind
  embedUrl?: string
}

/** Autolink + embed YT/Drive/imagens (ibb) — markdown inline preservado. */
export function renderMessageLines(text: string): MessagePart[] {
  const lines = text.split('\n')
  const out: MessagePart[] = []
  const urlRe = /(https?:\/\/[^\s<]+)/gi

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim()
    if (!trimmed) {
      // Colapsa linhas vazias / \xa0 — não renderiza spacer visual.
      return
    }

    const parts = trimmed.split(urlRe)
    if (parts.length === 1) {
      const value = stripDecorTitle(trimmed)
      out.push({
        key: `t-${lineIdx}`,
        kind: 'text',
        value,
        segments: parseInlineMarkdown(value),
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
          return
        }
        const embed = embedInfoForUrl(clean)
        if (embed) {
          out.push({
            key: `emb-${lineIdx}-${i}`,
            kind: 'embed',
            value: clean,
            label: linkLabelForUrl(clean),
            embedKind: embed.kind,
            embedUrl: embed.embedUrl,
          })
          return
        }
        out.push({
          key: `a-${lineIdx}-${i}`,
          kind: 'link',
          value: clean,
          label: linkLabelForUrl(clean),
        })
      } else {
        const value = stripDecorTitle(part)
        out.push({
          key: `t-${lineIdx}-${i}`,
          kind: 'text',
          value,
          segments: parseInlineMarkdown(value),
        })
      }
    })
  })

  return out
}
