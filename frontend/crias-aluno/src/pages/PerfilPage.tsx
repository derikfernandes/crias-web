import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal'
import { fetchStudentPanel, isAuthError, updateOwnProfile } from '../lib/api'
import { toUserFacingError } from '../lib/networkError'
import { clearSession, getSession, setSession } from '../lib/session'

const WHATSAPP = 'https://wa.me/553197520152'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Perfil do aluno (1.1.1.b): Cadastro e Suporte.
 * Login dual (dérik): nome obrigatório e telefone OU e-mail; com os dois, ambos
 * autenticam com a mesma senha (sem rádio exclusivo).
 */
export default function PerfilPage() {
  const navigate = useNavigate()
  const session = getSession()!
  const [saved, setSaved] = useState({ name: session.name, phone: session.phone_number, email: '' })
  const [name, setName] = useState(saved.name)
  const [phone, setPhone] = useState(saved.phone)
  const [email, setEmail] = useState(saved.email)
  const [popup, setPopup] = useState<'save' | 'cancel' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const p = await fetchStudentPanel(session.student_id)
      const next = { name: p.student.name, phone: p.student.phone, email: p.student.email }
      setSaved(next)
      setName(next.name)
      setPhone(next.phone)
      setEmail(next.email)
    } catch (err) {
      if (isAuthError(err)) {
        clearSession('auth')
        navigate('/login', { replace: true, state: { reason: 'auth' } })
      }
    }
  }, [navigate, session.student_id])
  useEffect(() => {
    void load()
  }, [load])

  const both = Boolean(phone.replace(/\D/g, '')) && Boolean(email.trim())
  const dirty =
    name.trim() !== saved.name ||
    phone.replace(/\D/g, '') !== saved.phone.replace(/\D/g, '') ||
    email.trim().toLowerCase() !== saved.email.toLowerCase()

  async function save() {
    setPopup(null)
    setError(null)
    const digits = phone.replace(/\D/g, '')
    if (!name.trim() || (!digits && !email.trim())) {
      setError('Informe o nome e o e-mail ou o telefone.')
      return
    }
    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      setError('E-mail inválido.')
      return
    }
    setBusy(true)
    try {
      await updateOwnProfile(session.student_id, {
        name: name.trim(),
        phone_number: digits,
        email: email.trim().toLowerCase(),
        // Limpa escolha exclusiva legada: os dois canais autenticam.
        login_identifier: null,
      })
      setSession({ ...session, name: name.trim(), phone_number: digits })
      setSaved({ name: name.trim(), phone: digits, email: email.trim().toLowerCase() })
    } catch (err) {
      setError(toUserFacingError(err, 'Não foi possível salvar as alterações.'))
    } finally {
      setBusy(false)
    }
  }

  function cancelEdit() {
    setPopup(null)
    setName(saved.name)
    setPhone(saved.phone)
    setEmail(saved.email)
    setError(null)
  }

  return (
    <section className="v1-2-perfil" aria-label="Perfil">
      <div className="v1-2-perfil__head">
        <h1>Perfil</h1>
        {dirty ? (
          <span className="v1-2-perfil__bar">
            <button type="button" className="v1-0-btn-soft" disabled={busy} onClick={() => setPopup('cancel')}>
              Cancelar
            </button>
            <button type="button" className="v1-0-btn" style={{ height: 44, padding: '0 22px' }} disabled={busy} onClick={() => setPopup('save')}>
              Salvar
            </button>
          </span>
        ) : null}
      </div>
      {error ? (
        <div className="v1-0-errbox" role="alert">
          <p>{error}</p>
        </div>
      ) : null}
      <div className="v1-2-perfil__cols">
        <div className="v1-2-perfil__main">
          <p className="v1-2-perfil__label">Cadastro</p>
          <label className="v1-0-field">
            Nome (obrigatório)
            <input className="v1-0-input" value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="v1-0-field">
            Telefone (obrigatório, ou e-mail)
            <input className="v1-0-input" type="tel" inputMode="tel" value={phone} autoComplete="off" onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="v1-0-field">
            E-mail (obrigatório, ou telefone)
            <input className="v1-0-input" type="text" inputMode="email" autoCapitalize="none" value={email} autoComplete="off" onChange={(e) => setEmail(e.target.value)} />
          </label>
          {both ? (
            <p className="v1-2-perfil__hint" style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
              Com telefone e e-mail, os dois valem para entrar (mesma senha).
            </p>
          ) : null}
        </div>
        <div className="v1-2-perfil__side">
          <p className="v1-2-perfil__label">Suporte</p>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp do suporte">
            (31) 9752-0152
          </a>
          <a href="mailto:contato@crias.org">contato@crias.org</a>
          <a className="v1-0-btn" style={{ height: 46, padding: '0 22px', textDecoration: 'none' }} href={WHATSAPP} target="_blank" rel="noopener noreferrer">
            Falar com o suporte
          </a>
        </div>
      </div>
      {popup === 'save' ? (
        <ConfirmModal
          title="Tem certeza que deseja salvar?"
          text="Essa ação não pode ser desfeita."
          cancelLabel="Continuar editando"
          confirmLabel="Salvar"
          onCancel={() => setPopup(null)}
          onConfirm={() => void save()}
        />
      ) : null}
      {popup === 'cancel' ? (
        <ConfirmModal
          title="Tem certeza que deseja cancelar a edição?"
          text="Essa ação não pode ser desfeita."
          cancelLabel="Continuar editando"
          confirmLabel="Cancelar edição"
          tone="destructive"
          onCancel={() => setPopup(null)}
          onConfirm={cancelEdit}
        />
      ) : null}
    </section>
  )
}
