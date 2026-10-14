import { useEffect } from 'react'

/**
 * v1.0, seção 3: textos de uma linha nunca quebram e nunca usam reticências.
 * Quando não cabem, o fim esmaece (máscara de 40px), só se transborda.
 * Recalcula depois de carregar as fontes, ao redimensionar e a cada mudança no DOM.
 */
const FADE = 'linear-gradient(90deg,#000 calc(100% - 40px),transparent)'

export function useOverflowFade(): void {
  useEffect(() => {
    let raf = 0
    const run = () => {
      raf = 0
      document.querySelectorAll<HTMLElement>('[data-fade]').forEach((el) => {
        const mask = el.scrollWidth > el.clientWidth + 1 ? FADE : 'none'
        if (el.style.maskImage !== mask) {
          el.style.setProperty('-webkit-mask-image', mask)
          el.style.maskImage = mask
        }
      })
    }
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(run)
    }
    const mo = new MutationObserver(schedule)
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'data-fade'],
    })
    window.addEventListener('resize', schedule)
    if (document.fonts?.ready) void document.fonts.ready.then(schedule)
    schedule()
    return () => {
      mo.disconnect()
      window.removeEventListener('resize', schedule)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [])
}
