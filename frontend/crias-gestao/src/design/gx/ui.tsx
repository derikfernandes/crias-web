import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/* Peças de interface da Gestão v1.1 (INTERFACE.md 1.1.x). Só apresentação. */

export function Icon({
  name,
  size = 16,
}: {
  name:
    | 'back'
    | 'chev-down'
    | 'chev-up'
    | 'chev-right'
    | 'filter'
    | 'pencil'
    | 'eye'
    | 'eye-off'
    | 'copy'
    | 'check'
    | 'refresh'
    | 'plus'
    | 'sort'
    | 'trash'
    | 'download'
  size?: number
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (name) {
    case 'back':
      return (
        <svg {...common} strokeWidth={2.2}>
          <path d="M15 6l-6 6 6 6" />
        </svg>
      )
    case 'chev-down':
      return (
        <svg {...common} strokeWidth={2.2}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      )
    case 'chev-up':
      return (
        <svg {...common} strokeWidth={2.2}>
          <path d="M6 15l6-6 6 6" />
        </svg>
      )
    case 'chev-right':
      return (
        <svg {...common} strokeWidth={2.8}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      )
    case 'filter':
      return (
        <svg {...common}>
          <path d="M3 5h18l-7 8v6l-4-2v-4z" />
        </svg>
      )
    case 'pencil':
      return (
        <svg {...common}>
          <path d="M4 20h4L19 9l-4-4L4 16v4z" />
          <path d="M13.5 6.5l4 4" />
        </svg>
      )
    case 'eye':
      return (
        <svg {...common}>
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    case 'eye-off':
      return (
        <svg {...common}>
          <path d="M3 3l18 18" />
          <path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 7.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.2-.9" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </svg>
      )
    case 'copy':
      return (
        <svg {...common}>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V6a2 2 0 0 1 2-2h9" />
        </svg>
      )
    case 'check':
      return (
        <svg {...common} strokeWidth={3}>
          <path d="M5 12.5l4.5 4.5L19 7" />
        </svg>
      )
    case 'refresh':
      return (
        <svg {...common} strokeWidth={2.4}>
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...common} strokeWidth={2.4}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case 'trash':
      return (
        <svg {...common}>
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
        </svg>
      )
    case 'download':
      return (
        <svg {...common}>
          <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <path d="M8 9l4-4 4 4" />
          <path d="M8 15l4 4 4-4" />
        </svg>
      )
  }
}

/** Símbolo animado de carregamento (1.1.5 e 1.1.18): cobre a tela até a página estar pronta. */
export function BootSymbol() {
  const ref = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth > 0) setLoaded(true)
  }, [])
  return (
    <div className="gx-boot" role="status" aria-label="Carregando">
      <span className="gx-boot__wrap">
        {loaded ? <span className="gx-boot__glow" /> : null}
        <img ref={ref} src="/crias-symbol-192.png" alt="" decoding="sync" onLoad={() => setLoaded(true)} />
      </span>
    </div>
  )
}

/** Fundo: malha 3D no Início, névoa a 70% nas demais páginas (1.0.2). */
export function Horizon({ mode }: { mode: 'home' | 'soft' }) {
  const H = mode === 'home' ? 129 : 64
  const glow = (
    <span
      className="gx-hz__glow"
      style={{
        top: `calc(100% - ${H + 380}px)`,
        animation: 'vRise 2.4s cubic-bezier(.16,1,.3,1) both, vAurora 16s ease-in-out 2.4s infinite',
      }}
    />
  )
  if (mode === 'home') {
    return (
      <div className="gx-hz" aria-hidden="true">
        {glow}
        <div
          className="gx-hz__floor"
          style={{ transform: 'perspective(700px) rotateX(70deg)' }}
        />
      </div>
    )
  }
  return (
    <div className="gx-hz gx-hz--soft" aria-hidden="true">
      {glow}
      <span className="gx-hz__smoke" />
    </div>
  )
}

/** Cabeçalho da página: título, subtítulo e ações. O conteúdo começa 36px abaixo (1.1.4). */
export function PageHead({
  title,
  subtitle,
  actions,
  tools,
  titleAction,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  /** Linha fixa abaixo do subtítulo (filtros, abas). */
  tools?: ReactNode
  /** Botão no fim da linha do título (Salvar, Gerar prévia). */
  titleAction?: ReactNode
}) {
  return (
    <header className="gx-head" data-pin="1">
      <div className="gx-head__title">
        <h1 data-fade="1">{title}</h1>
        <span className="gx-head__rule" aria-hidden="true" />
        {titleAction ?? null}
      </div>
      <div className="gx-head__sub">
        <p data-fade="1">{subtitle}</p>
        {actions ? <div className="gx-head__actions">{actions}</div> : null}
      </div>
      {tools ? <div className="gx-head__tools">{tools}</div> : null}
    </header>
  )
}

export function Stat({
  label,
  value,
  bar,
  barTone = 'gradient',
}: {
  label: string
  value: ReactNode
  /** 0 a 100. Sem barra quando undefined. */
  bar?: number | null
  barTone?: 'gradient' | 'green' | 'red'
}) {
  return (
    <div className="gx-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {typeof bar === 'number' ? (
        <span
          className={
            barTone === 'green'
              ? 'gx-bar gx-bar--green'
              : barTone === 'red'
                ? 'gx-bar gx-bar--red'
                : 'gx-bar'
          }
          style={{ marginTop: 6 }}
        >
          <span style={{ width: `${Math.max(0, Math.min(100, bar))}%` }} />
        </span>
      ) : null}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <span className="gx-switchrow">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className="gx-switchkey"
        disabled={disabled}
        onClick={() => onChange(!checked)}
      />
      <span>{label}</span>
    </span>
  )
}

export function Banner({
  tone = 'err',
  children,
  onRetry,
}: {
  tone?: 'err' | 'ok'
  children: ReactNode
  onRetry?: () => void
}) {
  return (
    <div
      className={tone === 'ok' ? 'gx-banner gx-banner--ok' : 'gx-banner gx-banner--err'}
      role={tone === 'ok' ? 'status' : 'alert'}
    >
      <p>{children}</p>
      {onRetry ? (
        <button
          type="button"
          className="gx-btn gx-btn--danger gx-btn--icon"
          aria-label="Atualizar"
          title="Atualizar"
          onClick={onRetry}
          style={{ width: 32, height: 36 }}
        >
          <Icon name="refresh" size={15} />
        </button>
      ) : null}
    </div>
  )
}

/** Valor ausente: sempre "N/A" (1.1.25). */
export function na(value: unknown): string {
  if (value === 0) return '0'
  if (value === null || value === undefined) return 'N/A'
  const s = String(value).trim()
  return s ? s : 'N/A'
}

/* ===== Janelas ===== */

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
}

export function Dialog({
  open,
  title,
  onClose,
  wide,
  children,
  actions,
}: {
  open: boolean
  title: ReactNode
  onClose: () => void
  wide?: boolean
  children?: ReactNode
  actions?: ReactNode
}) {
  const id = useId()
  useEscape(open, onClose)
  if (!open) return null
  return (
    <div className="gx-modal" onClick={onClose}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={id}
        className={wide ? 'gx-dialog gx-dialog--wide' : 'gx-dialog'}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={id}>{title}</h2>
        {children}
        {actions ? <div className="gx-dialog__actions">{actions}</div> : null}
      </div>
    </div>
  )
}

/** Confirmação no padrão do app (substitui window.confirm). */
export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  cancelLabel = 'Cancelar',
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  text?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onCancel}
      actions={
        <>
          <button type="button" className="gx-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="gx-btn gx-btn--primary"
            disabled={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {text ? <p>{text}</p> : null}
    </Dialog>
  )
}

/** Exclusão: só habilita depois de digitar DELETAR (sem diferenciar maiúsculas). */
export function DeletarDialog({
  open,
  title,
  subtitle = 'Essa ação não pode ser desfeita.',
  confirmLabel = 'Excluir',
  hint = 'Escreva DELETAR para excluir.',
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  subtitle?: string
  hint?: string
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const [word, setWord] = useState('')
  useEffect(() => {
    if (!open) setWord('')
  }, [open])
  const ok = word.trim().toUpperCase() === 'DELETAR'
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onCancel}
      actions={
        <>
          <button type="button" className="gx-btn" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="gx-btn gx-btn--danger"
            disabled={!ok || busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p>{subtitle}</p>
      <div className="gx-danger-box">
        <span>{hint}</span>
        <input
          autoFocus
          value={word}
          onChange={(e) => setWord(e.target.value)}
          aria-label="Digite DELETAR"
          autoComplete="off"
        />
      </div>
    </Dialog>
  )
}

/* ===== Filtro estilo Excel ===== */

export type FilterOption = { id: string; name: string }

export function FilterPopover({
  label,
  options,
  selected,
  onChange,
  variant = 'pill',
  align = 'right',
  emptyText = 'Nada encontrado.',
}: {
  label: string
  options: FilterOption[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
  variant?: 'pill' | 'field'
  align?: 'left' | 'right'
  emptyText?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const sorted = useMemo(
    () => [...options].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [options],
  )
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle
      ? sorted.filter((o) => o.name.toLowerCase().includes(needle))
      : sorted
  }, [sorted, q])
  const count =
    selected.size === options.length
      ? 'Todas'
      : `${selected.size} de ${options.length}`

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }

  return (
    <div className="gx-filter">
      <button
        type="button"
        className={
          variant === 'field'
            ? 'gx-filter__btn gx-filter__btn--field'
            : 'gx-filter__btn'
        }
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="filter" />
        <span>{label}</span>
        <span className="gx-filter__count">{count}</span>
        <Icon name="chev-down" />
      </button>
      {open ? (
        <>
          <div className="gx-scrim" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label={label}
            className={
              align === 'left'
                ? 'gx-filter__panel gx-filter__panel--left'
                : 'gx-filter__panel'
            }
          >
            <input
              type="search"
              autoFocus
              autoComplete="off"
              aria-label="Pesquisar"
              placeholder="Pesquisar"
              className="gx-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="gx-filter__tools">
              <button
                type="button"
                className="gx-linkbtn"
                onClick={() => {
                  const next = new Set(selected)
                  for (const o of visible) next.add(o.id)
                  onChange(next)
                }}
              >
                Selecionar tudo
              </button>
              <button
                type="button"
                className="gx-linkbtn"
                style={{ color: 'var(--v-t2)' }}
                onClick={() => onChange(new Set())}
              >
                Limpar tudo
              </button>
            </div>
            <div
              className="gx-filter__list"
              data-sfade="y"
              role="listbox"
              aria-multiselectable="true"
            >
              {visible.map((o) => {
                const on = selected.has(o.id)
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="option"
                    aria-selected={on}
                    className="gx-filter__opt"
                    onClick={() => toggle(o.id)}
                  >
                    <span
                      className={on ? 'gx-filter__box is-on' : 'gx-filter__box'}
                      aria-hidden="true"
                    >
                      {on ? <Icon name="check" size={12} /> : null}
                    </span>
                    <span style={{ minWidth: 0 }}>{o.name}</span>
                  </button>
                )
              })}
              {visible.length === 0 ? (
                <p className="gx-muted" style={{ padding: '10px 8px' }}>
                  {emptyText}
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

/* ===== Tabelas: ordenação e paginação ===== */

export type SortState = { key: string; dir: 'asc' | 'desc' }

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || v === '' || v === 'N/A'
}

/** Ordena por coluna (asc/desc). Vazios e N/A sempre no fim (1.1.9). */
export function sortRows<T>(
  rows: T[],
  sort: SortState | null,
  value: (row: T, key: string) => unknown,
): T[] {
  if (!sort) return rows
  const dir = sort.dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const va = value(a, sort.key)
    const vb = value(b, sort.key)
    const ba = isBlank(va)
    const bb = isBlank(vb)
    if (ba && bb) return 0
    if (ba) return 1
    if (bb) return -1
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
    return (
      String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) * dir
    )
  })
}

export function SortHead({
  label,
  sortKey,
  sort,
  onSort,
  numeric,
}: {
  label: string
  sortKey: string
  sort: SortState | null
  onSort: (next: SortState) => void
  numeric?: boolean
}) {
  const dir = sort?.key === sortKey ? sort.dir : undefined
  return (
    <th
      className={numeric ? 'num' : undefined}
      aria-sort={
        dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'
      }
    >
      <button
        type="button"
        className="gx-sort"
        data-dir={dir}
        onClick={() =>
          onSort({ key: sortKey, dir: dir === 'asc' ? 'desc' : 'asc' })
        }
      >
        {label}
        <svg
          width="10"
          height="14"
          viewBox="0 0 10 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 5l3-3 3 3" />
          <path d="M2 9l3 3 3-3" />
        </svg>
      </button>
    </th>
  )
}

export function usePager<T>(items: T[], initialSize: number) {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(initialSize)
  const pages = Math.max(1, Math.ceil(items.length / size))
  const safe = Math.min(page, pages)
  const slice = useMemo(
    () => items.slice((safe - 1) * size, safe * size),
    [items, safe, size],
  )
  return {
    page: safe,
    pages,
    size,
    slice,
    total: items.length,
    setPage,
    setSize: (n: number) => {
      setSize(n)
      setPage(1)
    },
    reset: () => setPage(1),
  }
}

/** Números de página com reticências: 1 … 4 5 6 … 20 (null = reticências). */
export function pageNumbers(page: number, pages: number): (number | null)[] {
  if (pages <= 1) return []
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const out: (number | null)[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(pages - 1, page + 1)
  if (start > 2) out.push(null)
  for (let n = start; n <= end; n++) out.push(n)
  if (end < pages - 1) out.push(null)
  out.push(pages)
  return out
}

/** Rodapé de tabela: "X trilhas de Y", tamanho da página, Anterior, números (1 2 3…) e Próxima (1.1.24). */
export function Pager({
  pager,
  noun,
  nounPlural,
  sizes,
  gateAt = 0,
}: {
  pager: ReturnType<typeof usePager<unknown>>
  noun: string
  nounPlural: string
  sizes: number[]
  /** Anterior e Próxima só ficam ativos quando há mais itens que isto. */
  gateAt?: number
}) {
  const shown = pager.slice.length
  const label = `${shown} ${shown === 1 ? noun : nounPlural} de ${pager.total}`
  const enabled = pager.total > gateAt
  return (
    <div className="gx-pager">
      <span>{label}</span>
      <div className="gx-pager__ctl">
        <select
          className="gx-select"
          aria-label="Itens por página"
          value={pager.size}
          onChange={(e) => pager.setSize(Number(e.target.value))}
        >
          {sizes.map((n) => (
            <option key={n} value={n}>
              {n} por página
            </option>
          ))}
        </select>
        <button
          type="button"
          className="gx-btn gx-btn--sm"
          disabled={!enabled || pager.page <= 1}
          onClick={() => pager.setPage(pager.page - 1)}
        >
          Anterior
        </button>
        {pageNumbers(pager.page, pager.pages).map((n, i) =>
          n === null ? (
            <span key={`gap-${i}`} className="gx-pager__gap" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              className={`gx-btn gx-btn--sm${n === pager.page ? ' gx-btn--primary' : ''}`}
              aria-label={`Página ${n}`}
              aria-current={n === pager.page ? 'page' : undefined}
              disabled={!enabled}
              onClick={() => pager.setPage(n)}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          className="gx-btn gx-btn--sm"
          disabled={!enabled || pager.page >= pager.pages}
          onClick={() => pager.setPage(pager.page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  )
}

/** Rolagem horizontal com esmaecimento na borda que ainda tem conteúdo (1.1.25). */
export function ScrollX({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      const a = el.scrollLeft > 4
      const b = max - el.scrollLeft > 4
      const m =
        max <= 4
          ? 'none'
          : `linear-gradient(to right, ${a ? 'transparent' : '#000'} 0, #000 ${a ? 28 : 0}px, #000 calc(100% - ${b ? 28 : 0}px), ${b ? 'transparent' : '#000'} 100%)`
      el.style.webkitMaskImage = m
      el.style.maskImage = m
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  })
  return (
    <div className="gx-tablewrap" data-sfade="x" ref={ref}>
      {children}
    </div>
  )
}

/** Texto que não cabe esmaece no fim, nunca reticências (1.1.25). */
export function Fade({
  children,
  as: Tag = 'span',
  className,
  style,
}: {
  children: ReactNode
  as?: 'span' | 'p' | 'h3' | 'div'
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <Tag data-fade="1" className={className} style={style}>
      {children}
    </Tag>
  )
}

/** Liga o esmaecimento ao texto que estoura a linha. Chamar uma vez no layout. */
export function useFadeMasks() {
  useEffect(() => {
    const FADE = 'linear-gradient(to right,#000 calc(100% - 28px),transparent)'
    let raf = 0
    const run = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        document.querySelectorAll<HTMLElement>('[data-fade]').forEach((el) => {
          const m = el.scrollWidth > el.clientWidth + 1 ? FADE : 'none'
          el.style.webkitMaskImage = m
          el.style.maskImage = m
        })
      })
    }
    run()
    const mo = new MutationObserver(run)
    mo.observe(document.body, { childList: true, subtree: true, characterData: true })
    window.addEventListener('resize', run)
    return () => {
      cancelAnimationFrame(raf)
      mo.disconnect()
      window.removeEventListener('resize', run)
    }
  }, [])
}

/* ===== Senha (padrão da aplicação, orientação 19) ===== */

/**
 * Senha (orientação 19): sempre mascarada (••••••••) com olho para mostrar; depois editar
 * (libera digitação e vira Salvar), copiar e Gerar. "Sem senha" quando não existe.
 */
export function PasswordCell({
  password,
  onGenerate,
  onSave,
  generating,
  saving,
  canGenerate = true,
  legacyHint,
}: {
  password: string | null
  onGenerate?: () => void
  /** Grava uma senha digitada. Sem isto o lápis de editar não aparece. */
  onSave?: (next: string) => void
  generating?: boolean
  saving?: boolean
  canGenerate?: boolean
  legacyHint?: string
}) {
  const [shown, setShown] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const tooShort = draft.trim().length < 6

  async function copy() {
    try {
      await navigator.clipboard.writeText(password ?? '')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  if (editing) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <input
          className="gx-input"
          style={{ height: 36, width: 160 }}
          autoFocus
          aria-label="Nova senha"
          placeholder="Mínimo 6 caracteres"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="button"
          className="gx-btn gx-btn--primary gx-btn--sm"
          disabled={tooShort || saving}
          onClick={() => {
            onSave?.(draft.trim())
            setEditing(false)
          }}
        >
          Salvar
        </button>
        <button type="button" className="gx-btn gx-btn--sm" onClick={() => setEditing(false)}>
          Cancelar
        </button>
      </span>
    )
  }

  const editBtn = onSave ? (
    <button
      type="button"
      className="gx-btn gx-btn--icon gx-btn--ghost"
      aria-label="Editar senha"
      title="Editar senha"
      onClick={() => {
        setDraft('')
        setEditing(true)
      }}
    >
      <Icon name="pencil" />
    </button>
  ) : null
  const generateBtn =
    canGenerate && onGenerate ? (
      <button type="button" className="gx-btn gx-btn--sm" disabled={generating} onClick={onGenerate}>
        {generating ? 'Gerando…' : 'Gerar'}
      </button>
    ) : null

  if (!password) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span className="gx-muted" title={legacyHint}>
          Sem senha
        </span>
        {editBtn}
        {generateBtn}
      </span>
    )
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span className="gx-code" aria-label={shown ? 'Senha' : 'Senha oculta'}>
        {shown ? password : '••••••••'}
      </span>
      <button
        type="button"
        className="gx-btn gx-btn--icon gx-btn--ghost"
        aria-label={shown ? 'Ocultar senha' : 'Mostrar senha'}
        title={shown ? 'Ocultar senha' : 'Mostrar senha'}
        onClick={() => setShown((v) => !v)}
      >
        <Icon name={shown ? 'eye-off' : 'eye'} />
      </button>
      {editBtn}
      <button
        type="button"
        className="gx-btn gx-btn--icon gx-btn--ghost"
        aria-label="Copiar senha"
        title={copied ? 'Copiada' : 'Copiar senha'}
        onClick={() => void copy()}
      >
        <Icon name={copied ? 'check' : 'copy'} />
      </button>
      {generateBtn}
    </span>
  )
}
