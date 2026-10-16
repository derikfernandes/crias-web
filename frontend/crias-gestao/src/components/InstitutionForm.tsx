import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createInstitutionSequential } from '../lib/public/institutions'
import { Banner, Switch } from '../design/gx/ui'

const TYPES = ['Escola pública', 'Escola privada', 'Cursinho', 'Plataforma']

/** Nova instituição (1.1.12): nome, tipo e ativa. A edição do cadastro fica no Início da escola. */
export function InstitutionForm() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedType = type.trim()
    if (!trimmedName) {
      setFormError('Informe o nome da instituição.')
      return
    }
    if (!trimmedType) {
      setFormError('Informe o tipo (ex.: escola pública, cursinho, plataforma).')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const id = await createInstitutionSequential({ name: trimmedName, type: trimmedType, active })
      if (id) navigate('/', { replace: true })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="gx-card" onSubmit={handleSubmit} style={{ padding: 24, gap: 20 }}>
      <h2>Nome da escola</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <label style={{ display: 'flex', minWidth: 0, flex: '3 1 300px' }}>
          <input
            className="gx-input"
            aria-label="Nome da escola"
            value={name}
            required
            placeholder="Nome da instituição"
            autoComplete="organization"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label style={{ display: 'flex', minWidth: 0, flex: '1 1 240px' }}>
          <input
            className="gx-input"
            aria-label="Tipo"
            value={type}
            placeholder="Tipo"
            list="institution-types"
            onChange={(e) => setType(e.target.value)}
          />
          <datalist id="institution-types">
            {TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
        <Switch checked={active} label="Ativa" onChange={setActive} />
      </div>
      {formError ? <Banner>{formError}</Banner> : null}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gx-btn gx-btn--primary" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" className="gx-btn" onClick={() => navigate(-1)}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
