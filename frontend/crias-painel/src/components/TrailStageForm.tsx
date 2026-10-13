import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { dataLayerReady } from '../lib/public/dataLayer'
import {
  createTrailStage,
  deleteTrailStage,
  updateTrailStage,
} from '../lib/public/trailStages'
import {
  trailStageCreateSchema,
  trailStageUpdateSchema,
} from '../lib/trailStageSchema'
import type { TrailStage } from '../types/trailStage'
import type { TrailStageType } from '../types/trailStage'

type Props = {
  trailId: string
  /** Se presente, modo edição. */
  docId?: string
  /** Dados atuais (necessários no modo edição). */
  initial?: TrailStage
  /** Usado como sugestão no modo criação. */
  suggestedStageNumber?: number
  onCancel?: () => void
  onSaved?: () => void
}

function parseStageNumberInt(v: string): number | null {
  const trimmed = v.trim()
  if (!trimmed) return null
  const n = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null
  return n
}

export function TrailStageForm({
  trailId,
  docId,
  initial,
  suggestedStageNumber,
  onCancel,
  onSaved,
}: Props) {
  const isEdit = Boolean(docId)

  const [stageNumber, setStageNumber] = useState<number>(
    suggestedStageNumber ?? 1,
  )
  const stageNumberLabel = useMemo(
    () => `Stage #${stageNumber}`,
    [stageNumber],
  )
  const [title, setTitle] = useState('')
  const [stageType, setStageType] = useState<TrailStageType>('fixed')
  const [prompt, setPrompt] = useState('')
  const [isReleased, setIsReleased] = useState(false)
  const [active, setActive] = useState(true)

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (isEdit) {
      if (!initial) {
        return
      }
      setStageNumber(initial.stage_number)
      setTitle(initial.title)
      setStageType(initial.stage_type)
      setPrompt(initial.prompt ?? '')
      setIsReleased(initial.is_released)
      setActive(initial.active)
      return
    }

    setStageNumber(suggestedStageNumber ?? 1)
    setTitle('')
    setStageType('fixed')
    setPrompt('')
    setIsReleased(false)
    setActive(true)
  }, [isEdit, initial, suggestedStageNumber])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!dataLayerReady) {
      setFormError('Firebase não inicializado.')
      return
    }

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setFormError('Informe o nome do stage.')
      return
    }

    if (!trailId.trim()) {
      setFormError('trail_id ausente.')
      return
    }

    if (isEdit) {
      if (!docId || !initial) {
        setFormError('Stage inicial ausente para edição.')
        return
      }

      const promptForStore =
        stageType === 'ai' ? prompt.trim() : null
      const updatePayload = {
        title: trimmedTitle,
        stage_type: stageType,
        prompt: promptForStore,
        is_released: isReleased,
        active,
      }

      const parsed = trailStageUpdateSchema.safeParse(updatePayload)
      if (!parsed.success) {
        const msg =
          parsed.error.issues[0]?.message ?? 'Dados inválidos.'
        setFormError(msg)
        return
      }

      setSaving(true)
      setFormError(null)
      try {
        await updateTrailStage(docId, {
          title: trimmedTitle,
          stage_type: stageType,
          prompt: stageType === 'ai' ? prompt.trim() : null,
          is_released: isReleased,
          active,
        })
        onSaved?.()
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Erro ao salvar.')
      } finally {
        setSaving(false)
      }
      return
    }

    const stageNumberInput = String(stageNumber)
    const stageNumberInt = parseStageNumberInt(stageNumberInput)
    if (!stageNumberInt) {
      setFormError('stage_number inválido (inteiro >= 1).')
      return
    }

    const promptForCreate = stageType === 'ai' ? prompt.trim() : null
    const createPayload = {
      trail_id: trailId,
      stage_number: stageNumberInt,
      title: trimmedTitle,
      stage_type: stageType,
      prompt: promptForCreate,
    }

    const created = trailStageCreateSchema.safeParse(createPayload)
    if (!created.success) {
      const msg = created.error.issues[0]?.message ?? 'Dados inválidos.'
      setFormError(msg)
      return
    }

    setSaving(true)
    setFormError(null)
    try {
      await createTrailStage({
        trail_id: trailId,
        stage_number: stageNumberInt,
        title: trimmedTitle,
        stage_type: stageType,
        prompt: stageType === 'ai' ? prompt.trim() : null,
      })

      onSaved?.()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!dataLayerReady || !docId) return
    if (!initial) return
    const ok = window.confirm(
      `Excluir stage "${initial.title || docId}"? Esta ação não pode ser desfeita.`,
    )
    if (!ok) return

    setSaving(true)
    setFormError(null)
    try {
      await deleteTrailStage(docId)
      onSaved?.()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao excluir.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel">
      <h2>{isEdit ? 'Editar stage' : 'Novo stage'}</h2>
      <p className="admin__lede muted">
        {isEdit
          ? stageNumberLabel
          : 'Defina tipo e prompt conforme o chatbot vai processar este stage.'}
      </p>

      {formError ? (
        <p className="banner banner--error" role="alert">
          {formError}
        </p>
      ) : null}

      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span>stage_number</span>
          <input
            type="number"
            value={stageNumber}
            onChange={(e) => setStageNumber(Number.parseInt(e.target.value, 10))}
            disabled={isEdit}
            min={1}
            step={1}
          />
        </label>

        <label className="field">
          <span>title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Frações básicas"
          />
        </label>

        <label className="field">
          <span>stage_type</span>
          <select
            value={stageType}
            onChange={(e) => {
              const v = e.target.value as TrailStageType
              setStageType(v)
              if (v !== 'ai') setPrompt('')
            }}
          >
            <option value="ai">ai</option>
            <option value="fixed">fixed</option>
            <option value="exercise">exercise</option>
          </select>
        </label>

        <label className="field">
          <span>prompt</span>
          <textarea
            value={stageType === 'ai' ? prompt : ''}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={stageType !== 'ai'}
            rows={5}
            placeholder={
              stageType === 'ai'
                ? 'Instrução base para o modelo…'
                : 'Com fixed/exercise o prompt fica null no Firestore.'
            }
          />
          {stageType !== 'ai' ? (
            <span className="muted">null para fixed e exercise</span>
          ) : null}
        </label>

        {isEdit ? (
          <>
            <label className="field field--inline">
              <input
                type="checkbox"
                checked={isReleased}
                onChange={(e) => setIsReleased(e.target.checked)}
              />
              <span>stage liberado para alunos</span>
            </label>

            <label className="field field--inline">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              <span>stage ativo no sistema</span>
            </label>
          </>
        ) : (
          <>
            <label className="field field--inline">
              <input type="checkbox" checked={isReleased} disabled />
              <span>is_released inicia como false</span>
            </label>
            <label className="field field--inline">
              <input type="checkbox" checked={active} disabled />
              <span>active inicia como true</span>
            </label>
          </>
        )}

        <div className="form__actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={saving || !dataLayerReady}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          {onCancel ? (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => onCancel()}
              disabled={saving}
            >
              Cancelar
            </button>
          ) : null}

          {isEdit ? (
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => void handleDelete()}
              disabled={saving}
            >
              Excluir stage
            </button>
          ) : null}
        </div>
      </form>
    </section>
  )
}
