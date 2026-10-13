import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { DashboardPickerItem } from '../../types/dashboardPageView'

/**
 * Popover estilo AutoFiltro do Excel: busca, "(Selecionar tudo)" com estado
 * intermediário, lista rolável de checkboxes e OK/Cancelar. As mudanças só
 * são aplicadas ao clicar em OK; fechar (Cancelar, Esc ou clique fora)
 * descarta o rascunho.
 */
export function ExcelFilterPopover({
  hint,
  items,
  selectedIds,
  emptyMessage,
  onApply,
  onClose,
}: {
  hint?: string
  items: DashboardPickerItem[]
  selectedIds: Set<string>
  emptyMessage: string
  onApply: (next: Set<string>) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Set<string>>(() => new Set(selectedIds))
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const selectAllRef = useRef<HTMLInputElement | null>(null)

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => it.label.toLowerCase().includes(q))
  }, [items, search])

  const allFilteredSelected =
    filteredItems.length > 0 && filteredItems.every((it) => draft.has(it.id))
  const someFilteredSelected = filteredItems.some((it) => draft.has(it.id))

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        someFilteredSelected && !allFilteredSelected
    }
  }, [someFilteredSelected, allFilteredSelected])

  useEffect(() => {
    // Enquanto o OK está aplicando, ignora Esc/clique fora para o popover
    // não sumir antes do feedback de conclusão.
    if (isPending) return
    const onDocMouseDown = (e: MouseEvent) => {
      const root = rootRef.current
      if (!root) return
      // O wrapper inclui o botão que abre o popover; clique nele não conta
      // como "fora" (o próprio onClick do botão faz o toggle).
      const wrapper = root.parentElement ?? root
      if (e.target instanceof Node && !wrapper.contains(e.target)) onClose()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose, isPending])

  function toggleItem(id: string) {
    setDraft((curr) => {
      const next = new Set(curr)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setDraft((curr) => {
      const next = new Set(curr)
      if (allFilteredSelected) {
        for (const it of filteredItems) next.delete(it.id)
      } else {
        for (const it of filteredItems) next.add(it.id)
      }
      return next
    })
  }

  return (
    <div
      ref={rootRef}
      className={`excel-picker__popover${
        isPending ? ' excel-picker__popover--pending' : ''
      }`}
      role="dialog"
      aria-busy={isPending}
    >
      {hint ? <span className="muted excel-picker__hint">{hint}</span> : null}
      <input
        type="search"
        className="excel-picker__search"
        placeholder="Pesquisar…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="excel-picker__list">
        {items.length === 0 ? (
          <span className="muted">{emptyMessage}</span>
        ) : (
          <>
            <label className="field field--inline excel-picker__select-all">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAll}
                disabled={filteredItems.length === 0}
              />
              <span>(Selecionar tudo)</span>
            </label>
            {filteredItems.length === 0 ? (
              <span className="muted">Nenhum item encontrado.</span>
            ) : (
              filteredItems.map((it) => (
                <label key={it.id} className="field field--inline">
                  <input
                    type="checkbox"
                    checked={draft.has(it.id)}
                    onChange={() => toggleItem(it.id)}
                  />
                  <span>{it.label}</span>
                </label>
              ))
            )}
          </>
        )}
      </div>
      <div className="excel-picker__footer">
        <button
          type="button"
          className="btn btn--small excel-picker__ok"
          disabled={isPending}
          onClick={() => {
            // O fechamento do popover acontece dentro do onApply do pai;
            // como está na transição, só ocorre quando o recálculo termina.
            startTransition(() => {
              onApply(draft)
            })
          }}
        >
          {isPending ? (
            <>
              <span className="excel-picker__spinner" aria-hidden="true" />
              Aplicando…
            </>
          ) : (
            'OK'
          )}
        </button>
        <button
          type="button"
          className="btn btn--small btn--ghost"
          disabled={isPending}
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
