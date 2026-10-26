import { useState } from 'react'
import { ConfirmDialog } from '../design/gx/ui'

/**
 * Cancelar e Salvar no topo da página (1.1.1.b, E). Regra de toda a aplicação: ficam ocultos e só aparecem
 * quando há alteração na página que precisa de confirmação. Salvar pede "Tem certeza que deseja salvar?" e
 * Cancelar pede "Tem certeza que deseja cancelar a edição?". Ações em massa confirmam na própria tela e não
 * passam por aqui.
 */
export function EditBar({
  dirty,
  busy,
  onSave,
  onCancel,
  saveLabel = 'Salvar',
  saveTitle = 'Tem certeza que deseja salvar?',
  saveConfirmLabel = 'Salvar',
}: {
  dirty: boolean
  busy?: boolean
  onSave: () => void | Promise<void>
  /** Desfaz o que ainda não foi salvo. */
  onCancel: () => void
  saveLabel?: string
  saveTitle?: string
  saveConfirmLabel?: string
}) {
  const [popup, setPopup] = useState<'save' | 'cancel' | null>(null)
  if (!dirty) return null
  return (
    <>
      <span className="gx-editbar">
        <button type="button" className="gx-btn" disabled={busy} onClick={() => setPopup('cancel')}>
          Cancelar
        </button>
        <button type="button" className="gx-btn gx-btn--primary gx-btn--pulse" disabled={busy} onClick={() => setPopup('save')}>
          {saveLabel}
        </button>
      </span>
      <ConfirmDialog
        open={popup === 'save'}
        title={saveTitle}
        text="Essa ação não pode ser desfeita."
        cancelLabel="Continuar editando"
        confirmLabel={saveConfirmLabel}
        busy={busy}
        onCancel={() => setPopup(null)}
        onConfirm={() => {
          setPopup(null)
          void onSave()
        }}
      />
      <ConfirmDialog
        open={popup === 'cancel'}
        title="Tem certeza que deseja cancelar a edição?"
        text="Essa ação não pode ser desfeita."
        cancelLabel="Continuar editando"
        confirmLabel="Cancelar edição"
        tone="destructive"
        onCancel={() => setPopup(null)}
        onConfirm={() => {
          setPopup(null)
          onCancel()
        }}
      />
    </>
  )
}
