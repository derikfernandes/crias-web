import { useEffect, useState } from 'react'
import { enterFullscreen, exitFullscreen, fullscreenSupported, isFullscreen } from './fullscreen'

/** Estado da tela cheia para o botão: `supported` (some no iPhone) e `active`. */
export function useFullscreen() {
  const [active, setActive] = useState(() => isFullscreen())
  useEffect(() => {
    const sync = () => setActive(isFullscreen())
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    sync()
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
    }
  }, [])
  return {
    supported: fullscreenSupported(),
    active,
    toggle: () => void (isFullscreen() ? exitFullscreen() : enterFullscreen()),
  }
}
