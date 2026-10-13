/** Campo de mensagem: cresce com o texto até 160px e depois rola (v6, seção 11). */
export function autoGrow(el: HTMLTextAreaElement | null): void {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`
}

/** Celular: Enter quebra linha. Computador: Enter envia, Shift+Enter quebra linha. */
export function isMobileViewport(): boolean {
  try {
    return window.matchMedia('(max-width: 768px)').matches
  } catch {
    return false
  }
}
