import { useRef, useState, type ReactNode } from 'react'
import { Icon } from '../design/gx/ui'
import type { BulkIssue } from '../lib/bulkActions'
import { downloadText, readTable, toCsv, type Row } from '../lib/tableFiles'

/**
 * Painel de ação em massa por planilha (INTERFACE.md 1.1.1.b, seções C.3 e D).
 *
 * Sequência única: Baixar planilha (modelo ou base) > Carregar planilha > botão da ação > confirmação em
 * linha com a contagem > "Planilha aplicada: ..." com o resultado e os erros.
 * Quem usa o painel só diz como ler a planilha (`plan`) e como gravar (`apply`); o resto é igual em todas.
 */

export type BulkPreview = {
  /** Primeira frase da confirmação, em negrito: "Cadastrar alunos em massa?". */
  confirmTitle: string
  /** O que vai acontecer, com a contagem: "N alunos serão cadastrados, M ficam de fora." */
  confirmText: string
  /** Quantas linhas serão gravadas. Zero bloqueia o botão da ação. */
  actionable: number
  /** Linhas que não serão aplicadas, com o motivo. */
  issues: BulkIssue[]
  /** Frase extra de apoio, por exemplo "Essa ação não pode ser desfeita.". */
  warning?: string
}

export type BulkResult = {
  /** Depois de "Planilha aplicada: ". Ex.: "3 cadastrados, 1 fica de fora." */
  summary: string
  /** Erros que só apareceram ao gravar. Somam com os da leitura. */
  issues?: BulkIssue[]
}

export function BulkPanel<T>({
  title,
  subtitle,
  columns,
  note,
  baseLabel,
  onDownload,
  plan,
  apply,
  actionLabel,
  confirmLabel,
  tone = 'green',
  disabled,
  disabledHint,
  extra,
  resultAction,
  defaultOpen = false,
  fileLabel = 'Carregar planilha',
  read,
}: {
  title: string
  subtitle: string
  /** Cabeçalhos exatos da planilha, com o que vem entre parênteses (obrigatório, opcional, sim / não...). */
  columns: string[]
  note?: string
  baseLabel: string
  onDownload: () => void
  /** Lê a planilha e diz o que vai acontecer. Chamado assim que o arquivo é carregado. */
  plan: (rows: Row[]) => { preview: BulkPreview; data: T }
  /** Grava. Só roda depois da confirmação em linha. */
  apply: (data: T) => Promise<BulkResult>
  actionLabel: string
  confirmLabel: string
  tone?: 'green' | 'red'
  disabled?: boolean
  disabledHint?: string
  /** Campos extras antes do botão de baixar (por exemplo, a seleção de instituição). */
  extra?: ReactNode
  /** Botão de texto à direita da mensagem final, por exemplo "Ver em alunos". */
  resultAction?: { label: string; onClick: () => void }
  defaultOpen?: boolean
  fileLabel?: string
  /** Leitura própria do arquivo (por exemplo, uma aba específica). Padrão: primeira aba. */
  read?: (file: File) => Promise<Row[]>
}) {
  const [open, setOpen] = useState(defaultOpen)
  const input = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [loaded, setLoaded] = useState<{ preview: BulkPreview; data: T } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ summary: string; issues: BulkIssue[] } | null>(null)

  function reset() {
    setLoaded(null)
    setFileName('')
    setConfirming(false)
    if (input.current) input.current.value = ''
  }

  async function onFile(file: File | null) {
    setLoaded(null)
    setConfirming(false)
    setResult(null)
    setError(null)
    setFileName(file?.name ?? '')
    if (!file) return
    try {
      const rows = await (read ?? readTable)(file)
      if (rows.length === 0) {
        setError('A planilha está vazia.')
        return
      }
      setLoaded(plan(rows))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível ler a planilha.')
    }
  }

  async function run() {
    if (!loaded) return
    setBusy(true)
    setError(null)
    try {
      const r = await apply(loaded.data)
      setResult({ summary: r.summary, issues: [...loaded.preview.issues, ...(r.issues ?? [])] })
      reset()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível aplicar a planilha.')
      setConfirming(false)
    } finally {
      setBusy(false)
    }
  }

  const preview = loaded?.preview ?? null
  const canAct = Boolean(preview && preview.actionable > 0) && !busy && !disabled
  const resultIssues = result?.issues ?? []

  return (
    <section className="gx-card gx-bulk" aria-label={title}>
      <div
        className="gx-bulk__head"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen((v) => !v)
          }
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2>{title}</h2>
          <p className="gx-muted">{subtitle}</p>
        </div>
        <span className="gx-roundarrow" aria-hidden="true">
          <Icon name={open ? 'chev-up' : 'chev-down'} />
        </span>
      </div>

      {open ? (
        <div className="gx-bulk__body">
          {disabled && disabledHint ? <p className="gx-banner gx-banner--err">{disabledHint}</p> : null}
          {extra}
          <div className="gx-bulk__cols">
            <span className="gx-label">Colunas</span>
            {columns.map((c) => (
              <span key={c} className="gx-tag gx-tag--col">
                {c}
              </span>
            ))}
          </div>
          {note ? <p className="gx-muted">{note}</p> : null}

          <div className="gx-bulk__actions">
            <button type="button" className="gx-btn" disabled={disabled} onClick={onDownload}>
              <Icon name="download" />
              {baseLabel}
            </button>
            <label className="gx-btn" style={{ position: 'relative', opacity: disabled ? 0.45 : 1 }}>
              {fileLabel}
              <input
                ref={input}
                type="file"
                accept=".csv,.xlsx,.xls"
                disabled={disabled}
                aria-label={`${fileLabel}: ${title}`}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type="button"
              className={tone === 'red' ? 'gx-btn gx-btn--soft-red' : 'gx-btn gx-btn--soft-green'}
              disabled={!canAct}
              onClick={() => setConfirming(true)}
            >
              {actionLabel}
            </button>
            <span data-fade="1" className="gx-muted gx-bulk__file">
              {fileName || 'Nenhum arquivo selecionado'}
            </span>
          </div>

          {error ? <p className="gx-banner gx-banner--err">{error}</p> : null}

          {preview && !confirming ? (
            <div className="gx-bulk__preview" role="status">
              <p>
                {preview.actionable === 0
                  ? 'Nada para aplicar nesta planilha.'
                  : `${preview.actionable} ${preview.actionable === 1 ? 'linha pronta' : 'linhas prontas'} para aplicar.`}
                {preview.issues.length > 0
                  ? ` ${preview.issues.length} ${preview.issues.length === 1 ? 'linha com erro fica' : 'linhas com erro ficam'} de fora.`
                  : ''}
              </p>
            </div>
          ) : null}
          {preview && !confirming ? <IssueTable issues={preview.issues} /> : null}

          {preview && confirming ? (
            <div className="gx-bulk__confirm" role="alertdialog" aria-label={preview.confirmTitle}>
              <p>
                <strong>{preview.confirmTitle}</strong> {preview.confirmText}
                {preview.issues.length > 0
                  ? ` ${preview.issues.length} ${preview.issues.length === 1 ? 'linha com erro fica' : 'linhas com erro ficam'} de fora.`
                  : ''}
                {preview.warning ? ` ${preview.warning}` : ''}
              </p>
              <div className="gx-bulk__confirm-actions">
                <button type="button" className="gx-btn" disabled={busy} onClick={() => setConfirming(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className={tone === 'red' ? 'gx-btn gx-btn--soft-red' : 'gx-btn gx-btn--soft-green'}
                  disabled={busy}
                  onClick={() => void run()}
                >
                  {busy ? 'Aplicando…' : confirmLabel}
                </button>
              </div>
            </div>
          ) : null}

          {result ? (
            <div className="gx-bulk__result" role="status">
              <p>
                <strong>Planilha aplicada:</strong> {result.summary}
                {resultIssues.length > 0
                  ? ` ${resultIssues.length} ${resultIssues.length === 1 ? 'linha com erro' : 'linhas com erro'}.`
                  : ''}
              </p>
              {resultAction ? (
                <button type="button" className="gx-linkbtn" onClick={resultAction.onClick}>
                  {resultAction.label}
                </button>
              ) : null}
            </div>
          ) : null}
          {result ? <IssueTable issues={resultIssues} /> : null}
        </div>
      ) : null}
    </section>
  )
}

function IssueTable({ issues }: { issues: BulkIssue[] }) {
  if (issues.length === 0) return null
  const shown = issues.slice(0, 50)
  return (
    <div className="gx-bulk__issues">
      <div className="gx-tablewrap" data-sfade="x">
        <table className="gx-table" aria-label="Linhas com erro">
          <thead>
            <tr>
              <th>Linha</th>
              <th>Referência</th>
              <th>Erro</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e) => (
              <tr key={`${e.line}-${e.ref}-${e.error}`}>
                <td>{e.line}</td>
                <td>{e.ref || 'N/A'}</td>
                <td style={{ color: 'var(--v-err)' }}>{e.error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="gx-bulk__issues-foot">
        <span className="gx-muted">
          {issues.length > shown.length ? `Mostrando ${shown.length} de ${issues.length} linhas com erro.` : ''}
        </span>
        <button
          type="button"
          className="gx-linkbtn"
          onClick={() =>
            downloadText('linhas-com-erro.csv', toCsv(['Linha', 'Referência', 'Erro'], issues.map((e) => [String(e.line), e.ref, e.error])))
          }
        >
          Baixar erros
        </button>
      </div>
    </div>
  )
}
