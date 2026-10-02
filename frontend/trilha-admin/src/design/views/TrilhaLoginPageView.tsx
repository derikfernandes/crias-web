import type { FormEvent } from 'react'
import { TrilhaPathIcon } from '../icons/trilha/TrilhaPathIcon'

export type TrilhaLoginPageViewProps = {
  phone: string
  submitting: boolean
  formError: string | null
  onPhoneChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
}

export function TrilhaLoginPageView({
  phone,
  submitting,
  formError,
  onPhoneChange,
  onSubmit,
}: TrilhaLoginPageViewProps) {
  const errorId = 'trilha-login-error'

  return (
    <div className="trilha-login">
      <div className="trilha-login__panel">
        <header className="trilha-login__header">
          <p className="trilha-login__brand">
            <span className="trilha-login__brand-mark" aria-hidden="true" />
            Crias
          </p>
          <h1 className="trilha-login__title">
            <TrilhaPathIcon size={32} aria-hidden />
            Trilha
          </h1>
          <p className="trilha-login__lede muted">
            Entre com o telefone cadastrado na escola.
          </p>
          <p className="trilha-login__hint muted">Mesmo número do WhatsApp.</p>
        </header>

        <form className="form trilha-login__form" onSubmit={onSubmit}>
          <label className="field">
            <span>Telefone</span>
            <input
              type="tel"
              name="phone"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="(12) 97408-5258"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              disabled={submitting}
              required
              aria-invalid={formError ? true : undefined}
              aria-describedby={formError ? errorId : undefined}
            />
          </label>

          {formError ? (
            <p id={errorId} className="banner banner--error" role="alert">
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn btn--primary trilha-cta"
            disabled={submitting || !phone.trim()}
            aria-busy={submitting || undefined}
          >
            {submitting ? 'A entrar…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
