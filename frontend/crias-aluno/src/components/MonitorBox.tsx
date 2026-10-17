import { useRef, type FormEvent, type KeyboardEvent } from 'react'
import { autoGrow, isMobileViewport } from '../lib/autoGrow'

/**
 * Barra "Pergunte ao seu monitor…" do Início (v1.0, seção 9).
 * Botão de enviar sempre visível, verde, com seta para cima.
 */
type Props = {
  draft: string
  onDraft: (value: string) => void
  onSend: () => void
  /** Id único: o Início tem duas barras (computador e celular), só uma aparece. */
  idSuffix: string
}

export default function MonitorBox({ draft, onDraft, onSend, idSuffix }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    onSend()
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !isMobileViewport()) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <form
      className={`v1-0-composer v1-0-composer--home${draft.trim() ? ' has-text' : ''}`}
      onSubmit={submit}
    >
      <textarea
        ref={ref}
        id={`monitor-box-${idSuffix}`}
        className="v1-0-composer__input"
        rows={1}
        value={draft}
        placeholder="Pergunte ao seu monitor…"
        aria-label="Pergunte ao seu monitor"
        autoComplete="off"
        onChange={(e) => {
          onDraft(e.target.value)
          autoGrow(e.target)
        }}
        onKeyDown={onKeyDown}
      />
      <button
        type="submit"
        className="v1-0-sendbtn"
        aria-label="Enviar pergunta ao monitor"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 19V5M6 11l6-6 6 6" />
        </svg>
      </button>
    </form>
  )
}
