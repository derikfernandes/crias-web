import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { StudentShellView } from '../../design/layouts/StudentShellView'
import { TrilhaLoginPageView } from '../../design/views/TrilhaLoginPageView'
import { loginWithPhone, TrilhaApiError } from '../../lib/trilha/trilhaApi'
import {
  loadTrilhaSession,
  saveTrilhaSession,
} from '../../lib/trilha/trilhaSession'

function loginErrorMessage(err: unknown): string {
  if (err instanceof TrilhaApiError) {
    if (err.code === 'unauthorized' || err.status === 401) {
      return 'Não foi possível entrar com este telefone.'
    }
    if (err.code === 'invalid_phone') {
      return 'Informe um telefone válido.'
    }
    return err.message
  }
  return 'Não foi possível entrar. Tente de novo.'
}

export function TrilhaLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const existing = loadTrilhaSession()
  const returnUrl =
    (location.state as { returnUrl?: string } | null)?.returnUrl ?? '/trilha'

  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  if (existing) {
    return <Navigate to={returnUrl} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const session = await loginWithPhone(phone)
      saveTrilhaSession(session)
      navigate(returnUrl, { replace: true })
    } catch (err) {
      setFormError(loginErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <StudentShellView showNav={false}>
      <TrilhaLoginPageView
        phone={phone}
        submitting={submitting}
        formError={formError}
        onPhoneChange={setPhone}
        onSubmit={onSubmit}
      />
    </StudentShellView>
  )
}
