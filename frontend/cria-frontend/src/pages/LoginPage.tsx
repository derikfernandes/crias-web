import { useEffect, useState, type FormEvent, type FocusEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { identifyStudent } from '../lib/api'
import {
  isRetryableSystemError,
  toUserFacingError,
} from '../lib/networkError'
import { getSession, setSession } from '../lib/session'
import {
  bindVisualViewport,
  scrollFocusedIntoView,
} from '../lib/visualViewport'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const existing = getSession()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(() => {
    const st = location.state as { message?: string; reason?: string } | null
    if (st?.message) return st.message
    if (st?.reason === 'auth' || st?.reason === 'missing') {
      return 'Entre de novo para continuar.'
    }
    return null
  })
  const [canRetry, setCanRetry] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => bindVisualViewport(), [])

  if (existing) return <Navigate to="/" replace />

  async function onSubmit(e?: FormEvent) {
    e?.preventDefault()
    setError(null)
    setCanRetry(false)
    setLoading(true)
    try {
      const result = await identifyStudent({
        phone_number: phone,
        institution_code: code.trim(),
        password,
      })
      setSession({
        student_id: result.student_id,
        institution_id: result.institution_id,
        name: result.name,
        phone_number: result.phone_number,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(toUserFacingError(err, 'Não foi possível entrar.'))
      setCanRetry(isRetryableSystemError(err))
    } finally {
      setLoading(false)
    }
  }

  function onFieldFocus(e: FocusEvent<HTMLInputElement>) {
    scrollFocusedIntoView(e.currentTarget)
  }

  return (
    <main className="login-page">
      <div className="login-atmosphere" aria-hidden />
      <form className="login-panel" onSubmit={(e) => void onSubmit(e)}>
        <p className="brand">Crias</p>
        <h1>Entre na sua trilha</h1>
        <p className="lede">
          Telefone, código da instituição e senha definida pelo admin.
        </p>
        <label>
          Telefone
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onFocus={onFieldFocus}
            placeholder="5511999990000"
            required
          />
        </label>
        <label>
          Código da instituição
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onFocus={onFieldFocus}
            placeholder="ex.: inst_1"
            required
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={onFieldFocus}
            required
            minLength={6}
          />
        </label>
        {error ? (
          <div className="login-error" role="alert">
            <p className="error">{error}</p>
            {canRetry ? (
              <button
                type="button"
                className="login-retry"
                onClick={() => void onSubmit()}
                disabled={loading}
              >
                Tentar de novo
              </button>
            ) : null}
          </div>
        ) : null}
        <button type="submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
