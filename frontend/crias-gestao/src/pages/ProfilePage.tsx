import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { EditBar } from '../components/EditBar'
import { useUnsavedChanges } from '../contexts/UnsavedContext'
import { Banner, Icon, PageHead } from '../design/gx/ui'
import { useAuth } from '../hooks/useAuth'
import { adminUserDocId } from '../lib/adminPermissions'
import { ADMIN_USERS_COLLECTION } from '../lib/adminUserFirestore'
import { db } from '../lib/firebase'

const WHATSAPP = 'https://wa.me/553197520152'

/**
 * Perfil (1.1.1.b): Cadastro (nome, telefone, e-mail) à esquerda e Suporte à direita. O e-mail é o do login e
 * não muda aqui. Regra de cadastro: nome obrigatório e e-mail ou telefone.
 */
export function ProfilePage() {
  const { user, adminProfile } = useAuth()
  const email = user?.email ?? ''
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const savedName = adminProfile?.name ?? ''
  const savedPhone = adminProfile?.phone_number ?? ''
  useEffect(() => {
    setName(savedName)
    setPhone(savedPhone)
  }, [savedName, savedPhone])

  const dirty = name.trim() !== savedName || phone.trim() !== savedPhone

  /** Valida e grava. Lança erro com a mensagem se algo estiver errado. */
  async function persist(): Promise<void> {
    if (!name.trim()) throw new Error('Informe o nome e o e-mail ou o telefone.')
    if (!email && !phone.trim()) throw new Error('Informe o nome e o e-mail ou o telefone.')
    if (!db) throw new Error('Firebase não inicializado.')
    await setDoc(
      doc(db, ADMIN_USERS_COLLECTION, adminUserDocId(email)),
      { email, name: name.trim(), phone_number: phone.trim(), updated_at: serverTimestamp() },
      { merge: true },
    )
    setNotice('Perfil salvo.')
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await persist()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  useUnsavedChanges(dirty && !saving, persist)

  return (
    <div className="gx-page">
      <PageHead
        title="Perfil"
        subtitle="Seus dados de cadastro e o contato do suporte."
        titleAction={
          <EditBar
            dirty={dirty}
            busy={saving}
            onSave={save}
            onCancel={() => {
              setName(savedName)
              setPhone(savedPhone)
              setError(null)
            }}
          />
        }
      />
      {error ? <Banner>{error}</Banner> : null}
      {notice ? <Banner tone="ok">{notice}</Banner> : null}
      <div className="gx-profile">
        <section className="gx-profile__main" aria-label="Cadastro">
          <p className="gx-profile__label">
            <span>Cadastro</span>
            <span aria-hidden="true" />
          </p>
          <label className="gx-field">
            <span>Nome (obrigatório)</span>
            <input className="gx-input" value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="gx-grid">
            <label className="gx-field">
              <span>Telefone</span>
              <input className="gx-input" type="tel" inputMode="tel" value={phone} autoComplete="off" onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="gx-field">
              <span>E-mail (do login)</span>
              <input className="gx-input" value={email} readOnly tabIndex={-1} aria-readonly="true" />
            </label>
          </div>
        </section>
        <section className="gx-profile__side" aria-label="Suporte">
          <p className="gx-profile__label">
            <span>Suporte</span>
            <span aria-hidden="true" />
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
            <a className="gx-profile__link" href={WHATSAPP} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp do suporte">
              (31) 9752-0152
            </a>
            <a className="gx-profile__link" href="mailto:contato@crias.org">
              contato@crias.org
            </a>
            <a className="gx-btn gx-btn--primary" href={WHATSAPP} target="_blank" rel="noopener noreferrer">
              Falar com o suporte
              <Icon name="chev-right" />
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
