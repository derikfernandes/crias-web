import { useEffect, useRef } from 'react'

/**
 * Janela de saída (v6, seção 7). Nunca window.confirm.
 * Fundo coberto com blur, janela de até 400px. Clicar fora ou Esc cancela.
 */
type Props = {
  onCancel: () => void
  onConfirm: () => void
}

export default function LogoutDialog({ onCancel, onConfirm }: Props) {
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
    <div className="v6-modal" onClick={onCancel}>
      <div
        className="v6-modal__box"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="v6-logout-title"
        aria-describedby="v6-logout-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="v6-modal__text">
          <h2 id="v6-logout-title" className="v6-modal__title">
            Sair da conta?
          </h2>
          <p id="v6-logout-desc" className="v6-modal__desc">
            Seu progresso na trilha fica salvo.
          </p>
        </div>
        <div className="v6-modal__actions">
          <button
            ref={cancelRef}
            type="button"
            className="v6-btn-soft"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button type="button" className="v6-btn" onClick={onConfirm}>
            Sair
          </button>
        </div>
      </div>
    </div>
  )
}
