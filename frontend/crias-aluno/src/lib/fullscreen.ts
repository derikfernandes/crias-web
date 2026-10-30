/**
 * Tela cheia (1.1.1.b, Revisão 9). Usa a tela cheia do navegador: navegar dentro do app não sai do modo.
 * Sai só pelo X do app ou pela tecla Esc (o navegador também sai com F11 ou o gesto do sistema).
 *
 * Limites do navegador, que o app não consegue mudar:
 * - Trocar de app (Aluno <-> Gestão) ou recarregar a página sai da tela cheia. O app lembra que a pessoa
 *   estava em tela cheia e volta ao modo no primeiro toque ou tecla seguinte (o navegador só aceita
 *   tela cheia depois de um gesto da pessoa).
 * - iPhone (Safari) não tem tela cheia de páginas: o botão não aparece.
 */

const KEY = 'crias:tela-cheia'

type FsDoc = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
  webkitFullscreenEnabled?: boolean
}
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void }

let failed = false

/**
 * 1.3.3: o botão aparece onde a página consegue pedir tela cheia (computador, Android, iPad, também no layout
 * de celular e tablet). Detecção pela função no elemento raiz, igual ao protótipo. `fullscreenEnabled` sozinho
 * vem falso em parte dos navegadores de celular, tablet e navegadores internos de apps. Se o pedido falhar,
 * o botão some até recarregar. iPhone não tem a função para páginas: lá não aparece.
 */
export function fullscreenSupported(): boolean {
  if (typeof document === 'undefined' || failed) return false
  const el = document.documentElement as FsEl
  return typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function'
}

/** O pedido falhou neste aparelho: esconde o botão até recarregar. */
export function markFullscreenFailed(): void {
  failed = true
  window.dispatchEvent(new Event('crias:fullscreen-failed'))
}

export function isFullscreen(): boolean {
  const d = document as FsDoc
  return Boolean(d.fullscreenElement || d.webkitFullscreenElement)
}

function remember(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(KEY, '1')
    else sessionStorage.removeItem(KEY)
  } catch {
    /* sem armazenamento: só não volta sozinho depois de trocar de app */
  }
}

function wasFullscreen(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Entra em tela cheia. Precisa ser chamado dentro de um toque ou clique. */
export async function enterFullscreen(): Promise<boolean> {
  const el = document.documentElement as FsEl
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' })
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
    else {
      markFullscreenFailed()
      return false
    }
    remember(true)
    return true
  } catch {
    markFullscreenFailed()
    return false
  }
}

/** Sai da tela cheia (botão X). */
export async function exitFullscreen(): Promise<void> {
  remember(false)
  const d = document as FsDoc
  try {
    if (d.exitFullscreen) await d.exitFullscreen()
    else if (d.webkitExitFullscreen) await d.webkitExitFullscreen()
  } catch {
    /* já saiu */
  }
}

let bound = false

/**
 * Chamar uma vez ao abrir o app. Esquece a tela cheia quando a pessoa sai (Esc ou X) e, se ela estava em
 * tela cheia antes de trocar de app ou recarregar, volta ao modo no primeiro toque ou tecla.
 */
export function bindFullscreen(): void {
  if (bound || !fullscreenSupported()) return
  bound = true
  const onChange = () => {
    if (!isFullscreen()) remember(false)
  }
  document.addEventListener('fullscreenchange', onChange)
  document.addEventListener('webkitfullscreenchange', onChange)
  if (wasFullscreen() && !isFullscreen()) {
    const restore = () => {
      document.removeEventListener('click', restore, true)
      document.removeEventListener('keydown', restore, true)
      if (wasFullscreen() && !isFullscreen()) void enterFullscreen()
    }
    document.addEventListener('click', restore, true)
    document.addEventListener('keydown', restore, true)
  }
}
