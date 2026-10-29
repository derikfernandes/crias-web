import ConfirmModal from './ConfirmModal'

/** Janela de saída (1.1.1.b): "Tem certeza que deseja sair da conta?". Nunca window.confirm. */
type Props = {
  onCancel: () => void
  onConfirm: () => void
}

export default function LogoutDialog({ onCancel, onConfirm }: Props) {
  return (
    <ConfirmModal
      title="Tem certeza que deseja sair da conta?"
      text="Seu progresso fica salvo."
      confirmLabel="Sair"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
