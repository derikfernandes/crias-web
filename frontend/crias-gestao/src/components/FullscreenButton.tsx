import { useFullscreen } from '../lib/useFullscreen'

/**
 * Botão de tela cheia (1.1.1.b, Revisão 9): "open in full" (Material Symbols) e, no modo, um X que sai.
 * Só aparece onde o navegador permite (computador, Android e iPad; no iPhone não).
 */
export default function FullscreenButton({ className }: { className?: string }) {
  const { supported, active, toggle } = useFullscreen()
  if (!supported) return null
  const label = active ? 'Sair da tela cheia' : 'Entrar em tela cheia'
  return (
    <button
      type="button"
      className={`gx-fsbtn${className ? ` ${className}` : ''}`}
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={toggle}
    >
      {active ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
          <path d="M120-120v-320h80v184l504-504H520v-80h320v320h-80v-184L256-200h184v80H120Z" />
        </svg>
      )}
    </button>
  )
}
