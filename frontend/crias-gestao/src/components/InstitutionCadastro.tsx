import { useEffect, useState } from 'react'
import { useUnsavedChanges } from '../contexts/UnsavedContext'
import { Banner, HeadActions, Icon, Switch } from '../design/gx/ui'
import { fmtDate } from '../lib/gestaoFormat'
import { updateInstitution } from '../lib/institutionFirestore'
import type { Institution } from '../types/institution'
import { EditBar } from './EditBar'

/**
 * Cadastro da instituição (1.1.1.b, Revisão 8): o lápis ao lado do título libera a edição; Cancelar e Salvar
 * ficam no topo da página (só aparecem com alteração) e o Salvar pede "Tem certeza que deseja salvar?".
 */
export function InstitutionCadastro({ institution }: { institution: Institution }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(institution.name)
  const [type, setType] = useState(institution.type)
  const [active, setActive] = useState(institution.active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setName(institution.name)
    setType(institution.type)
    setActive(institution.active)
  }, [institution.name, institution.type, institution.active])

  const dirty =
    name.trim() !== institution.name.trim() || type.trim() !== institution.type.trim() || active !== institution.active

  /** Valida e grava. Lança erro com a mensagem se algo estiver errado. */
  async function persist(): Promise<void> {
    if (!name.trim() || !type.trim()) throw new Error('Informe o nome e o tipo da instituição.')
    await updateInstitution(institution.id, { name: name.trim(), type: type.trim(), active })
    setNotice('Cadastro salvo.')
    setEditing(false)
  }

  async function save() {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await persist()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  function cancelEdit() {
    setName(institution.name)
    setType(institution.type)
    setActive(institution.active)
    setError(null)
    setEditing(false)
  }

  useUnsavedChanges(dirty && !saving, persist)

  return (
    <>
      <HeadActions>
        <EditBar dirty={dirty} busy={saving} onSave={save} onCancel={cancelEdit} />
      </HeadActions>
      {error ? <Banner>{error}</Banner> : null}
      {notice ? <Banner tone="ok">{notice}</Banner> : null}
      <section className="gx-card" aria-label="Cadastro da instituição">
        <div className="gx-card__head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
            <h2>Cadastro da instituição</h2>
            {!editing ? (
              <button type="button" className="gx-btn gx-btn--icon gx-btn--ghost" aria-label="Editar cadastro da instituição" title="Editar" onClick={() => setEditing(true)}>
                <Icon name="pencil" size={18} />
              </button>
            ) : null}
            <span className="gx-muted" style={{ fontSize: 12 }}>
              ID {institution.id} · Criada em {fmtDate(institution.created_at)} · Atualizada em {fmtDate(institution.updated_at)}
            </span>
          </div>
          <Switch checked={active} label="Instituição ativa" disabled={!editing} onChange={setActive} />
        </div>
        <div className="gx-grid">
          <label className="gx-field">
            <span>Nome</span>
            <input className="gx-input" value={name} readOnly={!editing} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="gx-field">
            <span>Tipo</span>
            <input className="gx-input" value={type} readOnly={!editing} onChange={(e) => setType(e.target.value)} />
          </label>
        </div>
      </section>
    </>
  )
}
