import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { identifyStudent } from '../lib/api'
import { getSession, setSession } from '../lib/session'

export default function LoginPage() {
  const navigate = useNavigate()
  const existing = getSession()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (existing) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
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
      setError(err instanceof Error ? err.message : 'Erro ao entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-atmosphere" aria-hidden />
      <form className="login-panel" onSubmit={onSubmit}>
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
            required
            minLength={6}
          />
        </label>
        {error ? <p className="error" role="alert">{error}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
