import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type FocusEvent,
} from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { identifyStudent } from '../lib/api'
import {
  isRetryableSystemError,
  toUserFacingError,
} from '../lib/networkError'
import { canonicalizeStudentPhone } from '../lib/phone'
import { getSession, setSession } from '../lib/session'
import { confirmOnline } from '../lib/connectivity'
import {
  bindVisualViewport,
  scrollFocusedIntoView,
} from '../lib/visualViewport'

type LoginLocationState = {
  message?: string
  reason?: string
  from?: { pathname?: string; search?: string; hash?: string }
} | null

/** Destino pós-login: deep-link guardado em RequireAuth, senão home. */
function resolvePostLoginPath(state: LoginLocationState): string {
  const from = state?.from
  const path = from?.pathname?.trim()
  if (!path || path === '/login') return '/'
  return `${path}${from?.search ?? ''}${from?.hash ?? ''}`
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const loginState = location.state as LoginLocationState
  const existing = getSession()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(() => {
    if (loginState?.message) return loginState.message
    if (loginState?.reason === 'auth' || loginState?.reason === 'missing') {
      return 'Entre de novo para continuar.'
    }
    return null
  })
  const [canRetry, setCanRetry] = useState(false)
  const [loading, setLoading] = useState(false)
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  )
  /** C2-R16 N02: Tentar pós-erro rede — autofocus (não limbo BODY). */
  const retryBtnRef = useRef<HTMLButtonElement>(null)
  const canRetryRef = useRef(false)
  canRetryRef.current = canRetry

  useEffect(() => bindVisualViewport(), [])

  /**
   * C3-R9 N01: após o soft-KB abrir (vv resize), reancora o campo focado
   * para Entrar ficar acima do teclado — o onFocus sozinho corre antes do inset.
   */
  useEffect(() => {
    const onVvResize = () => {
      const el = document.activeElement
      if (!(el instanceof HTMLElement)) return
      if (!el.closest('.login-page')) return
      if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return
      scrollFocusedIntoView(el)
    }
    const vv = window.visualViewport
    vv?.addEventListener('resize', onVvResize)
    return () => vv?.removeEventListener('resize', onVvResize)
  }, [])

  useEffect(() => {
    const goOffline = () => setOffline(true)
    // C3-R12 N02: não limpar banner só com evento `online` mentiroso.
    const goOnline = () => {
      void (async () => {
        const ok = await confirmOnline()
        setOffline(!ok)
      })()
    }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  /** C2-R16 N02: alert + Tentar montaram → foco no recovery único. */
  useEffect(() => {
    if (!canRetry || !error) return
    const tryFocus = () => {
      const btn = retryBtnRef.current
      if (!btn || btn.disabled) return false
      btn.focus({ preventScroll: true })
      return document.activeElement === btn
    }
    window.requestAnimationFrame(() => {
      tryFocus()
      for (const ms of [16, 50, 120, 300, 800] as const) {
        window.setTimeout(() => {
          if (!canRetryRef.current) return
          const active = document.activeElement
          if (active === retryBtnRef.current) return
          if (
            !active ||
            active === document.body ||
            active === document.documentElement
          ) {
            tryFocus()
          }
        }, ms)
      }
    })
  }, [canRetry, error])

  if (existing) {
    return <Navigate to={resolvePostLoginPath(loginState)} replace />
  }

  async function onSubmit(e?: FormEvent) {
    e?.preventDefault()
    if (offline) return
    setError(null)
    setCanRetry(false)
    setLoading(true)
    try {
      const result = await identifyStudent({
        phone_number: canonicalizeStudentPhone(phone),
        institution_code: code.trim(),
        password,
      })
      setSession({
        student_id: result.student_id,
        institution_id: result.institution_id,
        name: result.name,
        phone_number: result.phone_number,
      })
      navigate(resolvePostLoginPath(loginState), { replace: true })
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

  const entrarDisabled = loading || offline

  return (
    <main className="login-page">
      <div className="login-atmosphere" aria-hidden />
      {offline ? (
        <div className="chat-offline-banner" role="status" aria-live="polite">
          Você está offline. Conecte-se para entrar.
        </div>
      ) : null}
      <form className="login-panel" onSubmit={(e) => void onSubmit(e)}>
        <p className="brand">Crias</p>
        <h1>Entre na sua trilha</h1>
        <p className="lede">
          Use o telefone, o código da sua escola e a senha que você recebeu.
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
            placeholder="DDD + número"
            required
          />
        </label>
        <label>
          Código da escola
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onFocus={onFieldFocus}
            placeholder="código da sua escola"
            required
          />
        </label>
        <label>
          Senha
          <div className="login-password-row">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={onFieldFocus}
              required
              minLength={6}
            />
            <button
              type="button"
              className="login-password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </label>
        {error ? (
          <div className="login-error" role="alert">
            <p className="error">{error}</p>
            {canRetry ? (
              <button
                ref={retryBtnRef}
                type="button"
                className="login-retry"
                onClick={() => void onSubmit()}
                disabled={entrarDisabled}
              >
                Tentar de novo
              </button>
            ) : null}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={entrarDisabled}
          aria-disabled={entrarDisabled || undefined}
          aria-busy={loading || undefined}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
