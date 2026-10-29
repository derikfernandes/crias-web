import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../design/gx/ui'

/**
 * Alterações não salvas (INTERFACE.md 1.1.1.b, E). Quando a página tem alteração pendente, sair dela (menu,
 * Voltar, links, botão voltar do navegador) abre "Tem certeza que deseja sair?" com Continuar editando,
 * Salvar e Sair sem salvar. Fechar ou recarregar a aba usa o aviso do próprio navegador.
 *
 * A página só conta a esta camada se está suja e como salvar: `useUnsavedChanges(dirty, save)`.
 */

type Entry = { dirty: boolean; save?: () => Promise<void> | void }
type Ctx = {
  register: (entry: Entry | null) => void
  /** Roda `go` agora, ou depois da resposta do pop-up se houver alteração pendente. */
  requestLeave: (go: () => void) => void
}

const UnsavedCtx = createContext<Ctx | null>(null)

export function UnsavedProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const entryRef = useRef<Entry | null>(null)
  const [pending, setPending] = useState<(() => void) | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ignorePop = useRef(false)

  const register = useCallback((entry: Entry | null) => {
    entryRef.current = entry
  }, [])
  const requestLeave = useCallback((go: () => void) => {
    if (entryRef.current?.dirty) setPending(() => go)
    else go()
  }, [])

  // A cada troca de página a entrada anterior deixa de valer (a nova página registra a dela).
  useEffect(() => {
    setPending(null)
    setError(null)
  }, [location.pathname])

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!entryRef.current?.dirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    const onClick = (e: MouseEvent) => {
      if (!entryRef.current?.dirty || e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin) return
      const to = url.pathname + url.search + url.hash
      if (to === window.location.pathname + window.location.search + window.location.hash) return
      e.preventDefault()
      e.stopPropagation()
      setPending(() => () => navigate(to))
    }
    const onPop = () => {
      if (ignorePop.current) {
        ignorePop.current = false
        return
      }
      if (!entryRef.current?.dirty) return
      // Desfaz o "voltar" do navegador e pergunta antes.
      ignorePop.current = true
      window.history.go(1)
      setPending(() => () => {
        entryRef.current = null
        ignorePop.current = true
        window.history.go(-1)
      })
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPop)
    }
  }, [navigate])

  function leave() {
    const go = pending
    entryRef.current = null
    setPending(null)
    setError(null)
    go?.()
  }

  async function saveAndLeave() {
    const save = entryRef.current?.save
    if (!save) return
    setSaving(true)
    setError(null)
    try {
      await save()
      leave()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  const canSave = Boolean(entryRef.current?.save)
  const value = useMemo<Ctx>(() => ({ register, requestLeave }), [register, requestLeave])
  return (
    <UnsavedCtx.Provider value={value}>
      {children}
      <ConfirmDialog
        open={pending !== null}
        title="Tem certeza que deseja sair?"
        text={error ?? undefined}
        cancelLabel="Continuar editando"
        confirmLabel={canSave ? 'Salvar' : 'Sair sem salvar'}
        tone={canSave ? 'action' : 'destructive'}
        busy={saving}
        onCancel={() => {
          setPending(null)
          setError(null)
        }}
        onConfirm={() => (canSave ? void saveAndLeave() : leave())}
        extra={
          canSave ? (
            <button type="button" className="gx-btn gx-btn--danger-line" disabled={saving} onClick={leave}>
              Sair sem salvar
            </button>
          ) : null
        }
      />
    </UnsavedCtx.Provider>
  )
}

/** A página diz se tem alteração pendente e como salvar. Sem o provider, não faz nada. */
export function useUnsavedChanges(dirty: boolean, save?: () => Promise<void> | void) {
  const ctx = useContext(UnsavedCtx)
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    ctx?.register({ dirty, save: saveRef.current ? () => saveRef.current?.() : undefined })
    return () => ctx?.register(null)
  }, [ctx, dirty, Boolean(save)]) // eslint-disable-line react-hooks/exhaustive-deps
}

/** Navegação que respeita a alteração pendente (por exemplo, o botão Voltar). */
export function useGuardedNavigate() {
  const ctx = useContext(UnsavedCtx)
  const navigate = useNavigate()
  return useCallback(
    (to: string | number) => {
      const go = () => (typeof to === 'number' ? navigate(to) : navigate(to))
      if (ctx) ctx.requestLeave(go)
      else go()
    },
    [ctx, navigate],
  )
}

/** Roda uma ação que descarta a edição (por exemplo, trocar de item no seletor) depois de confirmar. */
export function useLeaveGuard() {
  const ctx = useContext(UnsavedCtx)
  return useCallback((go: () => void) => (ctx ? ctx.requestLeave(go) : go()), [ctx])
}
