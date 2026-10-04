/** Sincroniza --vv-height / --keyboard-inset a partir de visualViewport. */

let bound = false

/** Altura de teclado a partir da qual o chrome entra em modo composer-focado (R24-LS05). */
const KEYBOARD_OPEN_PX = 100

function syncVisualViewportVars() {
  const root = document.documentElement
  const vv = window.visualViewport
  if (!vv) {
    root.style.setProperty('--vv-height', `${window.innerHeight}px`)
    root.style.setProperty('--vv-offset-top', '0px')
    root.style.setProperty('--keyboard-inset', '0px')
    root.dataset.keyboard = 'closed'
    return
  }
  root.style.setProperty('--vv-height', `${Math.round(vv.height)}px`)
  root.style.setProperty('--vv-offset-top', `${Math.round(vv.offsetTop)}px`)
  const keyboard = Math.max(
    0,
    Math.round(window.innerHeight - vv.height - vv.offsetTop),
  )
  root.style.setProperty('--keyboard-inset', `${keyboard}px`)
  // R24-LS05: data-attr para CSS compactar composer / esconder Continuar sob KB.
  root.dataset.keyboard = keyboard >= KEYBOARD_OPEN_PX ? 'open' : 'closed'
}

/** Idempotente — chamar no boot do app. */
export function bindVisualViewport(): () => void {
  if (bound) {
    syncVisualViewportVars()
    return () => undefined
  }
  bound = true
  syncVisualViewportVars()
  const vv = window.visualViewport
  window.addEventListener('resize', syncVisualViewportVars)
  vv?.addEventListener('resize', syncVisualViewportVars)
  vv?.addEventListener('scroll', syncVisualViewportVars)
  return () => {
    bound = false
    window.removeEventListener('resize', syncVisualViewportVars)
    vv?.removeEventListener('resize', syncVisualViewportVars)
    vv?.removeEventListener('scroll', syncVisualViewportVars)
  }
}

/** Garante que o campo focado fique acima do teclado. */
export function scrollFocusedIntoView(el: HTMLElement | null) {
  if (!el) return
  window.requestAnimationFrame(() => {
    try {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    } catch {
      el.scrollIntoView()
    }
  })
}
