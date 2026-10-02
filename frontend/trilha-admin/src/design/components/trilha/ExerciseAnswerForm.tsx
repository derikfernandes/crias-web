import type { FormEvent } from 'react'

export type ExerciseOption = {
  key: string
  label: string
}

export type ExerciseAnswerFormProps = {
  options: ExerciseOption[] | null
  value: string
  submitting: boolean
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  /** Label do CTA (chat-first: «Responder»). */
  submitLabel?: string
}

export function ExerciseAnswerForm({
  options,
  value,
  submitting,
  onChange,
  onSubmit,
  disabled = false,
  submitLabel = 'Enviar resposta',
}: ExerciseAnswerFormProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!disabled && !submitting && value.trim()) onSubmit()
  }

  const isMcq = Boolean(options && options.length > 0)

  return (
    <form className="trilha-exercise" onSubmit={handleSubmit}>
      {isMcq ? (
        <fieldset className="trilha-exercise__options" disabled={disabled || submitting}>
          <legend className="trilha-exercise__legend">Escolha uma opção</legend>
          <ul className="trilha-exercise__list" role="list">
            {options!.map((opt) => {
              const id = `ex-opt-${opt.key.replace(/[^A-Za-z0-9_-]/g, '')}`
              return (
                <li key={opt.key}>
                  <label className="trilha-exercise__option" htmlFor={id}>
                    <input
                      id={id}
                      type="radio"
                      name="exercise-answer"
                      value={opt.key}
                      checked={value === opt.key}
                      onChange={() => onChange(opt.key)}
                    />
                    <span>{opt.label}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </fieldset>
      ) : (
        <label className="field trilha-exercise__text">
          <span>Sua resposta</span>
          <textarea
            className="field__textarea"
            rows={3}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || submitting}
            required
          />
        </label>
      )}

      <button
        type="submit"
        className="btn btn--primary trilha-cta"
        disabled={disabled || submitting || !value.trim()}
        aria-busy={submitting || undefined}
      >
        {submitting ? 'A enviar…' : submitLabel}
      </button>
    </form>
  )
}
