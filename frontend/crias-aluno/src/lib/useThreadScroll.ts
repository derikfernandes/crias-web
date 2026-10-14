import { useCallback, useEffect, useRef } from 'react'
import { attachThreadScroll, type ThreadScroll } from './threadScroll'

/**
 * Liga a rolagem v1.0 à conversa. Devolve os refs do scroller e das duas setas
 * (topo e fim), e `toBottom` para descer sempre que chega algo novo.
 */
export function useThreadScroll() {
  const threadRef = useRef<HTMLDivElement>(null)
  const upRef = useRef<HTMLButtonElement>(null)
  const downRef = useRef<HTMLButtonElement>(null)
  const apiRef = useRef<ThreadScroll | null>(null)

  useEffect(() => {
    const t = threadRef.current
    if (!t) return
    const api = attachThreadScroll(t, upRef.current, downRef.current)
    apiRef.current = api
    return () => {
      api.destroy()
      apiRef.current = null
    }
  }, [])

  const toBottom = useCallback((instant?: boolean) => {
    apiRef.current?.toBottom(instant)
  }, [])

  return { threadRef, upRef, downRef, toBottom }
}
