import { useRef, useState } from 'react'
import { Icon } from '../../design/gx/ui'

export type PickedFile = { id: string; file: File }

const ACCEPT = '.pdf,.docx,.txt,.md'
const MAX_FILES = 8
const MAX_BYTES = 4 * 1024 * 1024

function ext(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name)
  return (m ? m[1] : 'ARQ').toUpperCase().slice(0, 4)
}

function size(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Arquivos de apoio (texto, PDF, DOCX): arrastar ou escolher. Opcional. */
export function FilesPicker({
  files,
  onChange,
  compact,
  disabled,
}: {
  files: PickedFile[]
  onChange: (next: PickedFile[]) => void
  compact?: boolean
  disabled?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [warn, setWarn] = useState<string | null>(null)

  function add(list: FileList | File[] | null) {
    if (!list || disabled) return
    const next = [...files]
    let message: string | null = null
    for (const f of Array.from(list)) {
      if (!new RegExp(`(${ACCEPT.replaceAll('.', '\\.').replaceAll(',', '|')})$`, 'i').test(f.name)) {
        message = `${f.name}: use PDF, DOCX, TXT ou MD.`
        continue
      }
      if (f.size > MAX_BYTES) {
        message = `${f.name}: o arquivo passa de 4 MB.`
        continue
      }
      if (next.length >= MAX_FILES) {
        message = `No máximo ${MAX_FILES} arquivos.`
        break
      }
      next.push({ id: `${f.name}-${f.size}-${f.lastModified}`, file: f })
    }
    setWarn(message)
    onChange(next)
    if (input.current) input.current.value = ''
  }

  const list =
    files.length > 0 ? (
      <ul className="gx-list" aria-label="Arquivos escolhidos">
        {files.map((f) => (
          <li className="gx-file" key={f.id}>
            <span className="gx-file__ext">{ext(f.file.name)}</span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <strong data-fade="1" style={{ fontSize: 14 }}>
                {f.file.name}
              </strong>
              <span className="gx-muted" style={{ fontSize: 12 }}>
                {size(f.file.size)}
              </span>
            </span>
            <button
              type="button"
              className="gx-btn gx-btn--icon gx-btn--ghost"
              aria-label={`Remover ${f.file.name}`}
              onClick={() => onChange(files.filter((x) => x.id !== f.id))}
            >
              <Icon name="trash" />
            </button>
          </li>
        ))}
      </ul>
    ) : null

  const hidden = (
    <input
      ref={input}
      type="file"
      accept={ACCEPT}
      multiple
      hidden
      aria-label="Escolher arquivos"
      onChange={(e) => add(e.target.files)}
    />
  )

  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <span className="gx-label">Arquivos (opcional)</span>
          <button type="button" className="gx-btn" disabled={disabled} onClick={() => input.current?.click()}>
            <Icon name="download" />
            Adicionar arquivos
          </button>
        </div>
        {hidden}
        {warn ? <p className="gx-muted" role="status">{warn}</p> : null}
        {list}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        className={over ? 'gx-dropzone is-over' : 'gx-dropzone'}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          add(e.dataTransfer.files)
        }}
      >
        <strong>Arraste os documentos aqui</strong>
        <span className="gx-muted">Texto ou PDF (PDF, DOCX, TXT)</span>
        <button type="button" className="gx-btn gx-btn--primary" disabled={disabled} onClick={() => input.current?.click()}>
          {files.length > 0 ? 'Adicionar mais arquivos' : 'Escolher arquivos'}
        </button>
      </div>
      {hidden}
      {warn ? <p className="gx-muted" role="status">{warn}</p> : null}
      {list}
    </div>
  )
}
