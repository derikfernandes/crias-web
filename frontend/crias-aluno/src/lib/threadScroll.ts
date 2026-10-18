/**
 * Rolagem da conversa (v1.0, seções 12 e 12.1). Portada do protótipo.
 *
 * - Suave sempre: roda do mouse soma até 100px ao alvo, limitado a 400px
 *   da posição atual, e a conversa segue o alvo com 20% da distância por quadro.
 *   No toque, o dedo acompanha o arrasto (1:1), limitado a 280px por quadro, com um
 *   pequeno impulso final.
 * - Pontas: tentar passar do topo ou do fim faz um único movimento curto (5px).
 * - Esmaecer a base: com conteúdo abaixo, os últimos 56px da área esmaecem.
 * - Setas de topo e fim: aparecem ao rolar, somem após 2,2s parados.
 * - Descer até o fim: curva suave de 380 a 900ms, cancela rolagem em andamento
 *   e repete 350ms depois, para pegar imagem e vídeo que terminam de renderizar.
 */

const MASK_BASE = 'linear-gradient(to bottom,#000 calc(100% - 56px),transparent)'

export type ThreadScroll = {
  /** Desce até o fim. instant=true não anima. */
  toBottom: (instant?: boolean) => void
  /** Sobe até o topo com a mesma curva suave. */
  toTop: () => void
  /** Cancela qualquer rolagem suave em andamento. */
  stop: () => void
  destroy: () => void
}

function setMask(t: HTMLElement, value: string) {
  t.style.setProperty('-webkit-mask-image', value)
  t.style.maskImage = value
}

export function attachThreadScroll(
  t: HTMLElement,
  up: HTMLButtonElement | null,
  down: HTMLButtonElement | null,
): ThreadScroll {
  let tgt: number | null = null
  let raf = 0
  let jraf = 0
  let tmr = 0
  let lastTop = 0
  let lastW = 0
  let busy = false
  let ty0: number | null = null
  let st0 = 0
  let lastY = 0
  let vel = 0
  const timers = new Set<number>()

  const stop = () => {
    cancelAnimationFrame(jraf)
    if (raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
    tgt = null
  }

  const jumpTo = (to: number) => {
    cancelAnimationFrame(jraf)
    if (raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
    tgt = null
    const from = t.scrollTop
    const d = to - from
    const dur = Math.min(900, 380 + Math.abs(d) * 0.25)
    const t0 = performance.now()
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur)
      const e2 = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
      t.scrollTop = from + d * e2
      if (k < 1) jraf = requestAnimationFrame(step)
    }
    jraf = requestAnimationFrame(step)
  }

  const place = () => {
    if (!up || !down) return
    up.style.top = `${t.offsetTop + 10}px`
    down.style.top = `${t.offsetTop + t.clientHeight - 50}px`
  }

  const show = (b: HTMLButtonElement | null, on: boolean, isUp: boolean) => {
    if (!b) return
    b.style.opacity = on ? '1' : '0'
    b.style.pointerEvents = on ? 'auto' : 'none'
    b.style.transform = on ? 'none' : `translateY(${isUp ? '-6px' : '6px'})`
  }

  const upd = (dirn: number) => {
    place()
    const max = t.scrollHeight - t.clientHeight
    const big = max > 60
    const left = max - t.scrollTop
    setMask(t, big && left > 24 ? MASK_BASE : 'none')
    window.clearTimeout(tmr)
    if (!big) {
      show(up, false, true)
      show(down, false, false)
      return
    }
    show(up, dirn < 0 && t.scrollTop > 40, true)
    show(down, dirn > 0 && left > 40, false)
    tmr = window.setTimeout(() => {
      show(up, false, true)
      show(down, false, false)
    }, 2200)
  }

  const bounce = (sg: number) => {
    if (busy) return
    const c = t.firstElementChild as HTMLElement | null
    if (!c || !c.animate) return
    busy = true
    setMask(t, MASK_BASE)
    const an = c.animate(
      [
        { transform: 'translateY(0)' },
        { transform: `translateY(${3 * sg}px)`, offset: 0.45 },
        { transform: 'translateY(0)' },
      ],
      { duration: 500, easing: 'cubic-bezier(.37,0,.63,1)' },
    )
    const end = () => {
      const id = window.setTimeout(() => {
        timers.delete(id)
        busy = false
        upd(0)
      }, 150)
      timers.add(id)
    }
    an.onfinish = end
    an.oncancel = end
  }

  const glide = () => {
    if (tgt === null) {
      raf = 0
      return
    }
    const d = tgt - t.scrollTop
    if (Math.abs(d) < 0.5) {
      t.scrollTop = tgt
      tgt = null
      raf = 0
      return
    }
    t.scrollTop += d * 0.2
    raf = requestAnimationFrame(glide)
  }

  const onScroll = () => {
    const d = t.scrollTop - lastTop
    lastTop = t.scrollTop
    upd(d === 0 ? 0 : d)
  }

  const onWheel = (e: WheelEvent) => {
    const now = Date.now()
    const gap = now - lastW
    lastW = now
    const max = t.scrollHeight - t.clientHeight
    if (
      max > 1 &&
      !e.ctrlKey &&
      e.deltaMode === 0 &&
      ((e.deltaY < 0 && t.scrollTop > 0) ||
        (e.deltaY > 0 && max - t.scrollTop > 1))
    ) {
      e.preventDefault()
      if (tgt === null) tgt = t.scrollTop
      tgt = tgt + Math.max(-100, Math.min(100, e.deltaY))
      tgt = Math.max(t.scrollTop - 400, Math.min(t.scrollTop + 400, tgt))
      tgt = Math.max(0, Math.min(max, tgt))
      if (!raf) raf = requestAnimationFrame(glide)
      return
    }
    if (busy || gap < 200) return
    tgt = null
    if (e.deltaY < -2 && t.scrollTop <= 0) bounce(1)
    else if (e.deltaY > 2 && t.scrollHeight - t.clientHeight - t.scrollTop <= 1)
      bounce(-1)
  }

  const onTouchStart = (e: TouchEvent) => {
    ty0 = lastY = e.touches[0].clientY
    st0 = t.scrollTop
    vel = 0
    tgt = t.scrollTop
  }

  const onTouchMove = (e: TouchEvent) => {
    if (ty0 === null) return
    const y = e.touches[0].clientY
    const max = t.scrollHeight - t.clientHeight
    vel = lastY - y
    lastY = y
    const want = st0 + (ty0 - y)
    if (max <= 1 || want < 0 || want > max) {
      if (want < -4) bounce(1)
      else if (want > max + 4) bounce(-1)
    }
    if (max > 1) {
      if (e.cancelable) e.preventDefault()
      let next = Math.max(0, Math.min(max, want))
      next = Math.max(t.scrollTop - 280, Math.min(t.scrollTop + 280, next))
      tgt = next
      if (!raf) raf = requestAnimationFrame(glide)
    }
  }

  const onTouchEnd = () => {
    if (ty0 !== null && tgt !== null) {
      const max = t.scrollHeight - t.clientHeight
      let next = Math.max(0, Math.min(max, tgt + Math.max(-30, Math.min(30, vel * 3))))
      next = Math.max(t.scrollTop - 280, Math.min(t.scrollTop + 280, next))
      tgt = next
      if (!raf) raf = requestAnimationFrame(glide)
    }
    ty0 = null
  }

  const goUp = (e: Event) => {
    e.preventDefault()
    e.stopPropagation()
    jumpTo(0)
  }
  const goDown = (e: Event) => {
    e.preventDefault()
    e.stopPropagation()
    jumpTo(t.scrollHeight - t.clientHeight)
  }

  t.addEventListener('scroll', onScroll, { passive: true })
  t.addEventListener('wheel', onWheel, { passive: false })
  t.addEventListener('touchstart', onTouchStart, { passive: true })
  t.addEventListener('touchmove', onTouchMove, { passive: false })
  t.addEventListener('touchend', onTouchEnd, { passive: true })
  up?.addEventListener('click', goUp)
  down?.addEventListener('click', goDown)
  const ro =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => upd(0))
      : null
  ro?.observe(t)
  if (t.firstElementChild) ro?.observe(t.firstElementChild)
  upd(0)

  const toBottom = (instant?: boolean) => {
    /**
     * Desce ao fim e repete enquanto o scrollHeight ainda cresce
     * (histórico idle, imagens, content-visibility). Sem isso a trilha
     * abria “no fim” do layout parcial e parava no meio da conversa.
     */
    const go = () => {
      stop()
      const to = Math.max(0, t.scrollHeight - t.clientHeight)
      if (instant === true) {
        t.scrollTop = to
        return
      }
      jumpTo(to)
    }
    const settle = (left: number) => {
      const before = t.scrollHeight
      go()
      if (left <= 0) return
      requestAnimationFrame(() => {
        if (t.scrollHeight > before + 2) {
          settle(left - 1)
          return
        }
        // content-visibility: forçar um passo além do fim aparente revela mais.
        if (instant === true && t.scrollTop < t.scrollHeight - t.clientHeight - 2) {
          t.scrollTop = t.scrollHeight
          settle(left - 1)
        }
      })
    }
    requestAnimationFrame(() => requestAnimationFrame(() => settle(6)))
    // Histórico chega em idle (~1s+); reforça depois do primeiro paint.
    for (const ms of instant === true ? [350, 800, 1500, 2500] : [350]) {
      const id = window.setTimeout(() => {
        timers.delete(id)
        settle(4)
      }, ms)
      timers.add(id)
    }
  }

  return {
    toBottom,
    toTop: () => jumpTo(0),
    stop,
    destroy: () => {
      stop()
      window.clearTimeout(tmr)
      timers.forEach((id) => window.clearTimeout(id))
      timers.clear()
      t.removeEventListener('scroll', onScroll)
      t.removeEventListener('wheel', onWheel)
      t.removeEventListener('touchstart', onTouchStart)
      t.removeEventListener('touchmove', onTouchMove)
      t.removeEventListener('touchend', onTouchEnd)
      up?.removeEventListener('click', goUp)
      down?.removeEventListener('click', goDown)
      ro?.disconnect()
      setMask(t, 'none')
    },
  }
}
