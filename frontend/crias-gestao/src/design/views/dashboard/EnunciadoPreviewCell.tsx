const ENUNCIADO_PREVIEW_MAX = 100

function truncateEnunciadoPreview(text: string, max = ENUNCIADO_PREVIEW_MAX): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max).trimEnd()}…`
}

export function EnunciadoPreviewCell({
  content,
  title,
  onExpand,
}: {
  content: string
  title: string
  onExpand: () => void
}) {
  const fullText = content.trim() || title.trim()
  if (!fullText) {
    return <span className="muted">—</span>
  }
  const preview = truncateEnunciadoPreview(fullText)
  const isTruncated = preview.endsWith('…')

  return (
    <button
      type="button"
      className="table__text-btn dashboard-enunciado-preview"
      onClick={onExpand}
      title={isTruncated ? 'Clique para ver o enunciado completo' : fullText}
    >
      {preview}
    </button>
  )
}
