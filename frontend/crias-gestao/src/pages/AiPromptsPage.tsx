import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePermissions } from '../hooks/usePermissions'
import {
  fetchAiPromptVersions,
  fetchAiPrompts,
  seedAiPrompts,
  updateAiPrompt,
  type AiPromptRecord,
  type AiPromptVersion,
} from '../lib/aiPromptsApi'

export function AiPromptsPage() {
  const { isMaster } = usePermissions()
  const [prompts, setPrompts] = useState<AiPromptRecord[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState('')
  const [note, setNote] = useState('')
  const [versions, setVersions] = useState<AiPromptVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const selected = useMemo(
    () => prompts.find((p) => p.id === selectedId) ?? null,
    [prompts, selectedId],
  )

  const load = useCallback(async () => {
    if (!isMaster) return
    setLoading(true)
    setError(null)
    try {
      const list = await fetchAiPrompts()
      setPrompts(list)
      setSelectedId((prev) => {
        if (prev && list.some((p) => p.id === prev)) return prev
        return list[0]?.id ?? ''
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar prompts.')
    } finally {
      setLoading(false)
    }
  }, [isMaster])

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
    void fetchAiPromptVersions(selected.id)
      .then(setVersions)
      .catch(() => setVersions([]))
  }, [selected])

  if (!isMaster) {
    return (
      <>
        <header className="admin__header">
          <h1>Prompts</h1>
        </header>
        <p className="banner banner--error" role="alert">
          Acesso restrito a Master. Peça a um administrador para liberar
          <code> is_master </code>
          ou incluir seu e-mail em
          <code> MASTER_ADMIN_EMAILS </code>.
        </p>
      </>
    )
  }

  async function onSave() {
    if (!selectedId) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const updated = await updateAiPrompt({
        id: selectedId,
        body: draft,
        note: note.trim() || undefined,
      })
      setMessage(`Salvo: ${updated.title} (v${updated.version}).`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function onSeed(force: boolean) {
    const ok = window.confirm(
      force
        ? 'Forçar seed sobrescreve todos os prompts no Firestore com o texto do código. Continuar?'
        : 'Popular prompts ausentes no Firestore com o texto corrigido do código?',
    )
    if (!ok) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const result = await seedAiPrompts(force)
      setMessage(
        `Seed: criados ${result.seeded.length}, pulados ${result.skipped.length}, forçados ${result.forced.length}.`,
      )
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no seed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <header className="admin__header">
        <h1>Prompts</h1>
        <p className="admin__lede muted">
          Fonte de verdade no Firestore. Edição Master-only com auditoria e
          versões anteriores. Fallbacks em código só se o documento estiver
          ausente.
        </p>
        <div className="admin__actions">
          <button
            type="button"
            className="btn"
            disabled={saving || loading}
            onClick={() => void onSeed(false)}
          >
            Seed (só ausentes)
          </button>
          <button
            type="button"
            className="btn"
            disabled={saving || loading}
            onClick={() => void onSeed(true)}
          >
            Seed forçado
          </button>
          <button
            type="button"
            className="btn"
            disabled={loading}
            onClick={() => void load()}
          >
            Recarregar
          </button>
        </div>
      </header>

      {error ? (
        <p className="banner banner--error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="banner banner--ok" role="status">
          {message}
        </p>
      ) : null}

      <div className="list-toolbar" style={{ alignItems: 'flex-start', gap: '1rem' }}>
        <label className="list-toolbar__field" style={{ minWidth: '14rem' }}>
          <span className="muted">Prompt</span>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={loading || saving}
          >
            {prompts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.source}
                {p.version ? ` · v${p.version}` : ''})
              </option>
            ))}
          </select>
        </label>
        {selected ? (
          <p className="muted" style={{ margin: 0, maxWidth: '40rem' }}>
            {selected.description}
            {selected.updated_by_email
              ? ` · Última edição: ${selected.updated_by_email}`
              : ''}
            {selected.updated_at ? ` · ${selected.updated_at}` : ''}
          </p>
        ) : null}
      </div>

      {selected ? (
        <>
          <label className="list-toolbar__field" style={{ display: 'block' }}>
            <span className="muted">Texto</span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={24}
              disabled={saving}
              style={{
                width: '100%',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '0.85rem',
                lineHeight: 1.4,
              }}
            />
          </label>
          <label className="list-toolbar__field" style={{ display: 'block', marginTop: '0.75rem' }}>
            <span className="muted">Nota da versão (opcional)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={saving}
              placeholder="Ex.: removeu menção a WhatsApp"
              style={{ width: '100%', maxWidth: '40rem' }}
            />
          </label>
          <p className="admin__actions" style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className="btn btn--primary"
              disabled={saving || draft.trim() === selected.body.trim()}
              onClick={() => void onSave()}
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </p>

          <h2 style={{ marginTop: '1.5rem' }}>Versões anteriores</h2>
          {versions.length === 0 ? (
            <p className="muted">Nenhuma versão arquivada ainda.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {versions.map((v) => (
                <li
                  key={v.version}
                  style={{
                    borderTop: '1px solid var(--border, #ddd)',
                    padding: '0.75rem 0',
                  }}
                >
                  <div className="muted">
                    v{v.version}
                    {v.updated_by_email ? ` · ${v.updated_by_email}` : ''}
                    {v.updated_at ? ` · ${v.updated_at}` : ''}
                    {v.note ? ` · ${v.note}` : ''}
                  </div>
                  <button
                    type="button"
                    className="btn"
                    style={{ marginTop: '0.35rem' }}
                    onClick={() => setDraft(v.body)}
                  >
                    Restaurar no editor
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : loading ? (
        <p className="muted">Carregando…</p>
      ) : (
        <p className="muted">Nenhum prompt disponível.</p>
      )}
    </>
  )
}
