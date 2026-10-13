import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'

export type LoginPageViewProps = {
  email: string
  password: string
  submitting: boolean
  formError: string | null
  configError: string | null
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  /** Quando true, mostra apenas o estado de carregamento. */
  loading?: boolean
}

export function LoginPageView({
  email,
  password,
  submitting,
  formError,
  configError,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  loading = false,
}: LoginPageViewProps) {
  if (loading) {
    return (
      <div className="login">
        <p className="muted">Carregando…</p>
      </div>
    )
  }

  return (
    <div className="login">
      <div className="login__card">
        <header className="login__header">
          <Link to="/" className="login__brand">
            Crias Trilha
          </Link>
          <h1>Entrar</h1>
          <p className="login__lede muted">
            Acesse o painel administrativo com sua conta Firebase.
          </p>
        </header>

        {configError ? (
          <p className="banner banner--error" role="alert">
            {configError}
          </p>
        ) : (
          <form className="form login__form" onSubmit={onSubmit}>
            <label className="field">
              <span>E-mail</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                disabled={submitting}
                required
              />
            </label>

            <label className="field">
              <span>Senha</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                disabled={submitting}
                required
              />
            </label>

            {formError ? (
              <p className="form__error banner banner--error" role="alert">
                {formError}
              </p>
            ) : null}

            <div className="form__actions">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={submitting}
              >
                {submitting ? 'Entrando…' : 'Entrar'}
              </button>
            </div>
          </form>
        )}

        <p className="login__footer muted">
          <Link to="/doc">Documentação da API</Link>
        </p>
      </div>
    </div>
  )
}
