import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Pop-up de confirmação do Aluno (1.1.1.b, C.1). Neutro (contorno amarelo), ação (verde sólido) ou
 * destrutivo (contorno vermelho). Clicar fora ou Esc cancela.
 */
export default function ConfirmModal({
  title,
  text,
  cancelLabel = 'Cancelar',
  confirmLabel,
  tone = 'action',
  busy,
  extra,
  onCancel,
  onConfirm,
}: {
  title: string
  text?: ReactNode
  cancelLabel?: string
  confirmLabel: string
  tone?: 'action' | 'destructive'
  busy?: boolean
  extra?: ReactNode
  onCancel: () => void
  onConfirm: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])
  return (
    <div className="v1-0-modal" onClick={onCancel}>
      <div className="v1-0-modal__box" role="alertdialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="v1-0-modal__text">
          <h2 className="v1-0-modal__title">{title}</h2>
          {text ? <p className="v1-0-modal__desc">{text}</p> : null}
        </div>
        <div className="v1-0-modal__actions">
          <button ref={cancelRef} type="button" className="v1-0-btn-neutral" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === 'destructive' ? 'v1-0-btn-danger' : 'v1-0-btn'}
            disabled={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
        {extra ?? null}
      </div>
    </div>
  )
}
