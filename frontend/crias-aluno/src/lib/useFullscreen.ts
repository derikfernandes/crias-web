import { useEffect, useState } from 'react'
import { enterFullscreen, exitFullscreen, fullscreenSupported, isFullscreen } from './fullscreen'

/** Estado da tela cheia para o botão: `supported` (some no iPhone) e `active`. */
export function useFullscreen() {
  const [active, setActive] = useState(() => isFullscreen())
  const [supported, setSupported] = useState(() => fullscreenSupported())
  useEffect(() => {
    const sync = () => {
      setActive(isFullscreen())
      setSupported(fullscreenSupported())
    }
    window.addEventListener('crias:fullscreen-failed', sync)
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    sync()
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
      window.removeEventListener('crias:fullscreen-failed', sync)
    }
  }, [])
  return {
    supported,
    active,
    toggle: () => void (isFullscreen() ? exitFullscreen() : enterFullscreen()),
  }
}
