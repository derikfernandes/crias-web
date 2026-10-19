import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePermissions } from '../hooks/usePermissions'
import {
  fetchAiPromptVersions,
  fetchAiPrompts,
  restoreAiPromptDefault,
  updateAiPrompt,
  type AiPromptRecord,
  type AiPromptVersion,
} from '../lib/aiPromptsApi'
import { Banner, BootSymbol, ConfirmDialog, Icon, na, PageHead } from '../design/gx/ui'
import { formatSaoPauloDateTimeShort } from '../lib/formatSaoPaulo'

function fmtWhen(raw: string | null | undefined): string {
  if (!raw) return 'N/A'
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return formatSaoPauloDateTimeShort(raw)
  return raw
}

/** Prompt fixo do sistema: só leitura, invisível para a escola (orientações 1 e 14). */
const LOCKED = new Set(['criar_trilha_ia'])

/** Prompts (1.1.14): seletor "Agente", texto, nota da versão, Salvar e versões anteriores. */
export function AiPromptsPage() {
  const { isMaster, permissionsLoading } = usePermissions()
  const [prompts, setPrompts] = useState<AiPromptRecord[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState('')
  const [note, setNote] = useState('')
  const [versions, setVersions] = useState<AiPromptVersion[]>([])
  const [openVersions, setOpenVersions] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [confirmRestore, setConfirmRestore] = useState(false)

  const selected = useMemo(() => prompts.find((p) => p.id === selectedId) ?? null, [prompts, selectedId])
  const locked = selected ? LOCKED.has(selected.id) : false
  const dirty = selected ? draft.trim() !== selected.body.trim() : false

  const load = useCallback(async () => {
    if (permissionsLoading || !isMaster) return
    setLoading(true)
    setError(null)
    try {
      const list = await fetchAiPrompts()
      setPrompts(list)
      setSelectedId((prev) => (prev && list.some((p) => p.id === prev) ? prev : (list[0]?.id ?? '')))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar os prompts.')
    } finally {
      setLoading(false)
    }
  }, [isMaster, permissionsLoading])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selected) {
      setDraft('')
      setVersions([])
      return
    }
    setDraft(selected.body)
    setNote('')
    setOpenVersions(new Set())
    void fetchAiPromptVersions(selected.id)
      .then(setVersions)
      .catch(() => setVersions([]))
    // Só ao trocar de agente ou depois de salvar uma versão nova.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.version])

  async function save() {
    if (!selected || locked || !dirty) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const updated = await updateAiPrompt({ id: selected.id, body: draft, note: note.trim() || undefined })
      setMessage(`Salvo: ${updated.title} (versão ${updated.version}).`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function restoreDefault() {
    if (!selected) return
    setConfirmRestore(false)
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const updated = await restoreAiPromptDefault(selected.id)
      setMessage(`Padrão do sistema aplicado: ${updated.title} (versão ${updated.version}).`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao aplicar o padrão.')
    } finally {
      setSaving(false)
    }
  }

  if (permissionsLoading) return <BootSymbol />
  if (!isMaster) {
    return (
      <div className="gx-page">
        <PageHead title="Prompts" />
        <Banner>
          Acesso restrito a Master. Peça a um administrador para marcar &quot;Master (senhas dos alunos)&quot; no seu
          login em Configurações, Permissões.
        </Banner>
      </div>
    )
  }
  if (loading && prompts.length === 0) return <BootSymbol />

  return (
    <div className="gx-page">
      <PageHead
        title="Prompts"
        subtitle="Instruções que orientam a IA. Cada salvamento cria uma nova versão e fica registrado."
      />
      {error ? <Banner onRetry={() => void load()}>{error}</Banner> : null}
      {message ? <Banner tone="ok">{message}</Banner> : null}

      <section className="gx-card" aria-label="Prompt selecionado">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16 }}>
          <label className="gx-field" style={{ flex: '0 1 340px', minWidth: 220 }}>
            <span>Agente</span>
            <select className="gx-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} disabled={saving}>
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} · versão {p.version}
                </option>
              ))}
            </select>
          </label>
          {selected ? (
            <p className="gx-muted" style={{ flex: '1 1 260px', lineHeight: 1.5 }}>
              {selected.description}
              {' · '}Última edição: {na(selected.updated_by_email)} · {fmtWhen(selected.updated_at)}
            </p>
          ) : null}
        </div>
        {selected ? (
          <>
            {locked ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="gx-tag gx-tag--lg">Somente leitura</span>
                <span className="gx-muted">Fixo do sistema: não editável e invisível para a escola.</span>
              </div>
            ) : null}
            {selected.is_default === false ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <span className="gx-muted">Este texto é diferente do padrão do sistema (v1.1).</span>
                <button
                  type="button"
                  className="gx-btn gx-btn--sm"
                  disabled={saving}
                  onClick={() => setConfirmRestore(true)}
                >
                  Aplicar padrão do sistema
                </button>
              </div>
            ) : null}
            <label className="gx-field">
              <span>Texto</span>
              <textarea
                className="gx-textarea"
                rows={18}
                value={draft}
                readOnly={locked || saving}
                onChange={(e) => setDraft(e.target.value)}
                style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 14, lineHeight: 1.5 }}
              />
            </label>
            {locked ? null : (
              <>
                <label className="gx-field">
                  <span>Nota da versão (opcional)</span>
                  <input
                    className="gx-input"
                    value={note}
                    disabled={saving}
                    placeholder="Ex.: removeu menção a WhatsApp"
                    onChange={(e) => setNote(e.target.value)}
                    style={{ maxWidth: 560 }}
                  />
                </label>
                <div>
                  <button
                    type="button"
                    className={dirty ? 'gx-btn gx-btn--primary gx-btn--pulse' : 'gx-btn gx-btn--primary'}
                    disabled={!dirty || saving}
                    onClick={() => void save()}
                  >
                    {saving ? 'Salvando…' : 'Salvar'}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <p className="gx-muted">Nenhum prompt disponível.</p>
        )}
      </section>

      {selected ? (
        <section className="gx-card" aria-label="Versões anteriores">
          <h2>Versões anteriores</h2>
          {versions.length === 0 ? (
            <p className="gx-muted">Nenhuma versão arquivada ainda.</p>
          ) : (
            <ol className="gx-list">
              {versions.map((v) => {
                const open = openVersions.has(v.version)
                return (
                  <li className="gx-acc" key={v.version}>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() =>
                        setOpenVersions((s) => {
                          const n = new Set(s)
                          if (n.has(v.version)) n.delete(v.version)
                          else n.add(v.version)
                          return n
                        })
                      }
                    >
                      <span className="gx-num">v{v.version}</span>
                      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <strong data-fade="1" style={{ fontSize: 14 }}>
                          {v.note || 'Sem nota'}
                        </strong>
                        <span className="gx-muted" style={{ fontSize: 12 }}>
                          {na(v.updated_by_email)} · {fmtWhen(v.updated_at)}
                        </span>
                      </span>
                      <Icon name={open ? 'chev-up' : 'chev-down'} />
                    </button>
                    {open ? (
                      <div>
                        <pre className="gx-step__body" style={{ fontFamily: 'ui-monospace, Consolas, monospace', margin: 0 }}>
                          {v.body}
                        </pre>
                        {locked ? null : (
                          <div>
                            <button
                              type="button"
                              className="gx-btn"
                              onClick={() => {
                                setDraft(v.body)
                                window.scrollTo?.({ top: 0 })
                              }}
                            >
                              Restaurar no editor
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      ) : null}

      <ConfirmDialog
        open={confirmRestore}
        title="Aplicar padrão do sistema?"
        text={
          selected
            ? `O texto de "${selected.title}" passa a ser o padrão do sistema (v1.1). A versão atual fica guardada em Versões anteriores e a troca fica registrada com o seu login.`
            : undefined
        }
        confirmLabel="Aplicar padrão"
        busy={saving}
        onConfirm={() => void restoreDefault()}
        onCancel={() => setConfirmRestore(false)}
      />
    </div>
  )
}
