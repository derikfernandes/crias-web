import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type FocusEvent,
} from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  identifyStudent,
  type IdentifyInstitutionChoice,
  type IdentifyOkResponse,
} from '../lib/api'
import {
  isRetryableSystemError,
  toUserFacingError,
} from '../lib/networkError'
import { getSession, setSession } from '../lib/session'
import { confirmOnline } from '../lib/connectivity'
import {
  bindVisualViewport,
  scrollFocusedIntoView,
} from '../lib/visualViewport'
import Horizon from '../components/Horizon'
import EdgeFade from '../components/EdgeFade'
import CriasSymbol from '../components/CriasSymbol'
import { aplicarTema, temaAtual, type Tema } from '../lib/tema'

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

function applySession(result: IdentifyOkResponse) {
  setSession({
    student_id: result.student_id,
    institution_id: result.institution_id,
    name: result.name,
    phone_number: result.phone_number,
  })
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const loginState = location.state as LoginLocationState
  const existing = getSession()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [institutions, setInstitutions] = useState<IdentifyInstitutionChoice[]>(
    [],
  )
  const [selectedInstitution, setSelectedInstitution] = useState('')
  const [error, setError] = useState<string | null>(() => {
    if (loginState?.message) return loginState.message
    if (loginState?.reason === 'auth' || loginState?.reason === 'missing') {
      return 'Entre de novo para continuar.'
    }
    return null
  })
  const [canRetry, setCanRetry] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tema, setTema] = useState<Tema>(() => temaAtual())
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
      if (!el.closest('.v1-0-login')) return
      if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.tagName !== 'SELECT')
        return
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

  /**
   * C3-R15 N02: login na aba A seta LS — aba B em /login deve sair do form
   * (storage dispara só cross-tab; clear já era tratado no ChatLayout).
   */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'crias_student_session' || !e.newValue) return
      if (!getSession()) return
      navigate(resolvePostLoginPath(loginState), { replace: true })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [navigate, loginState])

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
        login: login.trim(),
        password,
        institution_id: selectedInstitution || undefined,
      })
      if (result.status === 'needs_institution') {
        setInstitutions(result.institutions)
        setSelectedInstitution(result.institutions[0]?.institution_id ?? '')
        setError('Escolha a escola para continuar.')
        return
      }
      applySession(result)
      navigate(resolvePostLoginPath(loginState), { replace: true })
    } catch (err) {
      const retryable = isRetryableSystemError(err)
      // v1.0, seção 6: falha de credenciais usa o texto do desenho. Erro de rede mantém a
      // mensagem própria, porque ali o aluno precisa saber que pode tentar de novo.
      setError(
        retryable
          ? toUserFacingError(err, 'Não foi possível entrar.')
          : 'Não foi possível entrar. Confira os dados.',
      )
      setCanRetry(retryable)
    } finally {
      setLoading(false)
    }
  }

  function onFieldFocus(e: FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    scrollFocusedIntoView(e.currentTarget)
  }

  const entrarDisabled =
    loading ||
    offline ||
    !login.trim() ||
    !password ||
    (institutions.length > 1 && !selectedInstitution)

  return (
    <main className="v1-0-login">
      <header className="v1-0-site-hd">
        <div className="v1-0-site-hd__in">
          <a
            className="v1-0-site-hd__logo"
            href="https://www.crias.org"
            target="_self"
            aria-label="Ir para o site do Crias"
          >
            <img
              src={`${import.meta.env.BASE_URL}${tema === 'escuro' ? 'crias-logo-site-branco.svg' : 'crias-logo-site.svg'}`}
              alt="Crias"
              decoding="sync"
            />
          </a>
          <button
            type="button"
            className="v1-0-site-btn"
            aria-label="Alternar modo claro e escuro"
            title="Alternar modo claro e escuro"
            onClick={() => {
              const next: Tema = tema === 'escuro' ? 'claro' : 'escuro'
              aplicarTema(next)
              setTema(next)
            }}
          >
            {tema === 'claro' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </button>
        </div>
      </header>
      <div className="v1-0-login__stage">
      <Horizon mode="login" />
      <EdgeFade />
      <form className="v1-0-login__form" onSubmit={(e) => void onSubmit(e)}>
        <div className="v1-0-login__brand" aria-hidden="true">
          <CriasSymbol size={72} />
        </div>
        <div className="v1-0-login__card">
          {offline ? (
            <div className="v1-0-alert" role="status" aria-live="polite">
              <p>Você está offline. Conecte-se para entrar.</p>
            </div>
          ) : null}
          {institutions.length > 1 ? (
            <label className="v1-0-field">
              Escola
              <select
                className="v1-0-login__select"
                value={selectedInstitution}
                onChange={(e) => setSelectedInstitution(e.target.value)}
                onFocus={onFieldFocus}
                required
              >
                {institutions.map((inst) => (
                  <option key={inst.institution_id} value={inst.institution_id}>
                    {inst.institution_name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="v1-0-field">
            Login
            <input
              className="v1-0-input"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              value={login}
              onChange={(e) => {
                setLogin(e.target.value)
                if (institutions.length) {
                  setInstitutions([])
                  setSelectedInstitution('')
                }
              }}
              onFocus={onFieldFocus}
              required
            />
          </label>
          <label className="v1-0-field">
            Senha
            <span className="v1-0-pw">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={onFieldFocus}
                required
              />
              <button
                type="button"
                className="v1-0-pw__toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </span>
          </label>
          {error ? (
            <div className="v1-0-alert" role="alert">
              <p>{error}</p>
              {canRetry ? (
                <button
                  ref={retryBtnRef}
                  type="button"
                  className="v1-0-login__retry"
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
            className="v1-0-btn v1-0-login__submit"
            disabled={entrarDisabled}
            aria-disabled={entrarDisabled || undefined}
            aria-busy={loading || undefined}
          >
            {loading ? 'Entrando…' : 'Entrar'}
            {!loading ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            ) : null}
          </button>
        </div>
      </form>
      </div>
      <footer className="v1-0-site-ft">
        <div className="v1-0-site-ft__in">
          <div className="v1-0-site-ft__social">
            <a className="v1-0-site-btn" href="https://www.linkedin.com/company/criasorg/" target="_blank" rel="noopener noreferrer" aria-label="Crias no LinkedIn" title="LinkedIn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect width="4" height="12" x="2" y="9" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            </a>
            <a className="v1-0-site-btn" href="https://www.instagram.com/criasorg" target="_blank" rel="noopener noreferrer" aria-label="Crias no Instagram" title="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </a>
          </div>
          <span className="v1-0-site-ft__cr">
            <span>© Crias Tecnologia LTDA</span>
            <span>·</span>
            <span>48.188.712/0001-02</span>
          </span>
        </div>
      </footer>
    </main>
  )
}
