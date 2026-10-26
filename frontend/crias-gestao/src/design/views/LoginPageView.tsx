import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Banner, BootSymbol, Horizon } from '../gx/ui'

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

/** Entrada da Gestão: logo, e-mail e senha sobre a malha 3D (mesmo padrão do Crias Aluno). */
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
  const [show, setShow] = useState(false)
  if (loading) return <BootSymbol />

  return (
    <div className="gx-root gx-login">
      <Horizon mode="home" />
      <div className="gx-login__card">
        <img className="gx-login__logo gx-brand__light" src="/crias-logo-educacao.svg" alt="Crias Educação" />
        <img className="gx-login__logo gx-brand__dark" src="/crias-logo-educacao-branco.svg" alt="Crias Educação" />
        {configError ? (
          <Banner>{configError}</Banner>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
            <label className="gx-field">
              <span>E-mail</span>
              <input
                className="gx-input"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                disabled={submitting}
                required
              />
            </label>
            <label className="gx-field">
              <span>Senha</span>
              <span style={{ position: 'relative', display: 'block' }}>
                <input
                  className="gx-input"
                  style={{ paddingRight: 84 }}
                  type={show ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  disabled={submitting}
                  required
                />
                <button
                  type="button"
                  className="gx-linkbtn"
                  style={{ position: 'absolute', right: 8, top: 6 }}
                  aria-pressed={show}
                  aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShow((v) => !v)}
                >
                  {show ? 'Ocultar' : 'Mostrar'}
                </button>
              </span>
            </label>
            {formError ? <Banner>{formError}</Banner> : null}
            <button type="submit" className="gx-btn gx-btn--primary" style={{ height: 44 }} disabled={submitting}>
              {submitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        )}
        <p className="gx-muted">
          <Link to="/doc">API e documentação</Link>
        </p>
      </div>
    </div>
  )
}
