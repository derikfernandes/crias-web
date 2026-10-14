import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { FirebaseError } from 'firebase/app'
import { useAuth } from '../hooks/useAuth'
import { firebaseConfigError } from '../lib/firebase'
import { firebaseAuthErrorMessage } from '../lib/authErrors'
import { LoginPageView } from '../design/views/LoginPageView'

/** Destino pós-login: lista de Instituições. */
const POST_LOGIN_PATH = '/'

export function LoginPage() {
  const { user, loading, signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  if (loading) {
    return (
      <LoginPageView
        loading
        email=""
        password=""
        submitting={false}
        formError={null}
        configError={null}
        onEmailChange={() => {}}
        onPasswordChange={() => {}}
        onSubmit={(e) => e.preventDefault()}
      />
    )
  }

  if (user) {
    return <Navigate to={POST_LOGIN_PATH} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setFormError('Informe seu e-mail.')
      return
    }
    if (!password) {
      setFormError('Informe sua senha.')
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      await signIn(trimmedEmail, password)
    } catch (err) {
      if (err instanceof FirebaseError) {
        setFormError(firebaseAuthErrorMessage(err.code))
      } else {
        setFormError(
          err instanceof Error ? err.message : 'Não foi possível entrar.',
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LoginPageView
      email={email}
      password={password}
      submitting={submitting}
      formError={formError}
      configError={firebaseConfigError}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
    />
  )
}
