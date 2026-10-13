import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { dataLayerReady } from '../lib/public/dataLayer'
import {
  createTrailStageQuestion,
  updateTrailStageQuestion,
} from '../lib/public/trailStageQuestions'
import type { TrailStageType } from '../types/trailStage'
import type { TrailStageQuestion } from '../types/trailStageQuestion'

type OptionRow = { key: string; text: string }

type Props = {
  trailId: string
  stageNumber: number
  /** Tipo do stage em `trail_stages` — define se há correção obrigatória. */
  stageType: TrailStageType
  docId?: string
  initial?: TrailStageQuestion
  suggestedQuestionNumber?: number
  onCancel?: () => void
  onSaved?: () => void
}

function parsePositiveInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isInteger(v) && v >= 1) return v
  if (typeof v === 'string') {
    const n = Number.parseInt(v.trim(), 10)
    if (Number.isFinite(n) && Number.isInteger(n) && n >= 1) return n
  }
  return null
}

function validateExerciseOptions(
  rows: OptionRow[],
  correctKey: string,
): string | null {
  const trimmed = correctKey.trim()
  if (!trimmed) return 'Informe a alternativa correta (ex.: A).'
  if (rows.length === 0) return null
  const keys = rows.map((r) => r.key.trim()).filter(Boolean)
  if (keys.length !== rows.length) return 'Cada opção precisa de uma key não vazia.'
  if (new Set(keys).size !== keys.length) return 'As keys das opções devem ser únicas.'
  if (!keys.includes(trimmed)) return 'A resposta correta deve ser uma das keys listadas.'
  for (const r of rows) {
    if (!r.text.trim()) return 'Preencha o texto de cada alternativa.'
  }
  return null
}

export function TrailStageQuestionForm({
  trailId,
  stageNumber,
  stageType,
  docId,
  initial,
  suggestedQuestionNumber,
  onCancel,
  onSaved,
}: Props) {
  const isEdit = Boolean(docId)
  const isExerciseStage = stageType === 'exercise'

  const [questionNumber, setQuestionNumber] = useState(1)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [explanation, setExplanation] = useState('')
  const [correctOption, setCorrectOption] = useState('')
  const [optionRows, setOptionRows] = useState<OptionRow[]>([])
  const [isReleased, setIsReleased] = useState(false)
  const [active, setActive] = useState(true)

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const heading = useMemo(
    () => (isEdit ? `Editar questão #${questionNumber}` : 'Nova questão / etapa'),
    [isEdit, questionNumber],
  )

  useEffect(() => {
    if (isEdit) {
      if (!initial) return
      setQuestionNumber(initial.question_number)
      setTitle(initial.title)
      setContent(initial.content)
      setExplanation(initial.explanation ?? '')
      setCorrectOption(initial.correct_option ?? '')
      setOptionRows(
        initial.options?.map((o) => ({ key: o.key, text: o.text })) ?? [],
      )
      setIsReleased(initial.is_released)
      setActive(initial.active)
      return
    }

    const q0 = suggestedQuestionNumber ?? 1
    setQuestionNumber(q0)
    setTitle('')
    setContent('')
    setExplanation('')
    setCorrectOption('')
    setOptionRows([])
    setIsReleased(q0 === 1)
    setActive(true)
  }, [isEdit, initial, suggestedQuestionNumber])

  useEffect(() => {
    if (isEdit) return
    setIsReleased(questionNumber === 1)
  }, [isEdit, questionNumber])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!dataLayerReady) {
      setFormError('Firebase não inicializado.')
      return
    }

    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    if (!trimmedTitle) {
      setFormError('Informe o título da etapa.')
      return
    }
    if (!trimmedContent) {
      setFormError('Informe o conteúdo.')
      return
    }

    const expl = explanation.trim() ? explanation.trim() : null

    if (isExerciseStage) {
      const optErr = validateExerciseOptions(optionRows, correctOption)
      if (optErr) {
        setFormError(optErr)
        return
      }
    }

    if (isEdit) {
      if (!docId || !initial) {
        setFormError('Dados iniciais ausentes para edição.')
        return
      }

      setSaving(true)
      setFormError(null)
      try {
        const correct = isExerciseStage ? correctOption.trim() : null
        const optionsPayload =
          isExerciseStage && optionRows.length > 0
            ? optionRows.map((r) => ({
                key: r.key.trim(),
                text: r.text.trim(),
              }))
            : null

        await updateTrailStageQuestion(docId, {
          title: trimmedTitle,
          content: trimmedContent,
          explanation: expl,
          correct_option: correct,
          options: optionsPayload,
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

    const qn = parsePositiveInt(questionNumber)
    if (!qn) {
      setFormError('question_number inválido (inteiro >= 1).')
      return
    }

    const correct = isExerciseStage ? correctOption.trim() : null
    const optionsPayload =
      isExerciseStage && optionRows.length > 0
        ? optionRows.map((r) => ({
            key: r.key.trim(),
            text: r.text.trim(),
          }))
        : null

    setSaving(true)
    setFormError(null)
    try {
      await createTrailStageQuestion({
        trail_id: trailId,
        stage_number: stageNumber,
        question_number: qn,
        title: trimmedTitle,
        content: trimmedContent,
        correct_option: correct,
        options: optionsPayload,
        explanation: expl,
        is_released: isReleased,
      })
      onSaved?.()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  function addOptionRow() {
    const nextLetter = String.fromCodePoint(65 + optionRows.length)
    setOptionRows((rows) => [...rows, { key: nextLetter, text: '' }])
  }

  function removeOptionRow(i: number) {
    const option = optionRows[i]
    const label = option?.text.trim() || option?.key.trim() || `Alternativa ${i + 1}`
    const confirmed = window.confirm(
      `Excluir a alternativa "${label}"? Esta ação não pode ser desfeita.`,
    )
    if (!confirmed) return

    setOptionRows((rows) => rows.filter((_, idx) => idx !== i))
  }

  function updateOptionRow(i: number, field: 'key' | 'text', value: string) {
    setOptionRows((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)),
    )
  }

  return (
    <section className="panel trail-question-form">
      <h2>{heading}</h2>
      <p className="admin__lede muted">
        {isEdit
          ? 'Altere conteúdo e resposta (se o stage for exercício). O tipo do stage e o prompt ficam em trail_stages.'
          : `Stage ${stageNumber} (${stageType}) · apenas conteúdo sequencial.`}
      </p>

      {formError ? (
        <p className="banner banner--error" role="alert">
          {formError}
        </p>
      ) : null}

      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span>question_number</span>
          <input
            type="number"
            value={questionNumber}
            onChange={(e) =>
              setQuestionNumber(Number.parseInt(e.target.value, 10) || 1)
            }
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
            placeholder="Ex.: Exercício 1, Contexto, Final…"
          />
        </label>

        <label className="field">
          <span>content</span>
          <textarea
            className="field__textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="Texto exibido ao aluno / enunciado."
          />
        </label>

        <label className="field">
          <span>explanation (opcional)</span>
          <textarea
            className="field__textarea"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={3}
            placeholder="Feedback após resposta, dicas pedagógicas…"
          />
        </label>

        {isExerciseStage ? (
          <>
            <label className="field">
              <span>correct_option</span>
              <input
                type="text"
                value={correctOption}
                onChange={(e) => setCorrectOption(e.target.value)}
                placeholder="Ex.: A (ou texto da resposta se não houver lista)"
              />
            </label>

            <div className="field">
              <span>options (múltipla escolha — opcional)</span>
              <p className="muted trail-question-form__hint">
                Deixe vazio para exercício sem lista; se preencher, a resposta correta deve ser uma das keys.
              </p>
              {optionRows.map((row, i) => (
                <div key={i} className="trail-question-form__option-row">
                  <input
                    type="text"
                    aria-label={`Key alternativa ${i + 1}`}
                    value={row.key}
                    onChange={(e) => updateOptionRow(i, 'key', e.target.value)}
                    placeholder="Key"
                    className="trail-question-form__option-key"
                  />
                  <input
                    type="text"
                    aria-label={`Texto alternativa ${i + 1}`}
                    value={row.text}
                    onChange={(e) => updateOptionRow(i, 'text', e.target.value)}
                    placeholder="Texto"
                  />
                  <button
                    type="button"
                    className="btn btn--small btn--ghost"
                    onClick={() => removeOptionRow(i)}
                  >
                    Remover
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn--small btn--ghost trail-question-form__add-opt"
                onClick={addOptionRow}
              >
                + Alternativa
              </button>
            </div>
          </>
        ) : null}

        <label className="field field--inline">
          <input
            type="checkbox"
            checked={isReleased}
            onChange={(e) => setIsReleased(e.target.checked)}
          />
          <span>liberada para o aluno (is_released)</span>
        </label>

        {isEdit ? (
          <label className="field field--inline">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <span>questão ativa no sistema</span>
          </label>
        ) : (
          <p className="muted">
            <label className="field field--inline">
              <input type="checkbox" checked disabled />
              <span>active inicia como true</span>
            </label>
          </p>
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
        </div>
      </form>
    </section>
  )
}
