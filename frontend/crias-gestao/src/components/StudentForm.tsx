import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscribeToInstitutionOptions } from '../lib/public/institutions'
import {
  createStudentSequential,
  deleteStudent,
  updateStudent,
} from '../lib/public/students'
import { studentPath } from '../lib/paths'
import { updateStudentPassword } from '../lib/studentApi'
import {
  assertCanonicalBrPhone,
  assertSchoolGrade,
  assertStudentName,
} from '../lib/studentFieldValidation'
import { Banner, DeletarDialog, HeadActions, Switch } from '../design/gx/ui'
import { EditBar } from './EditBar'
import { useUnsavedChanges } from '../contexts/UnsavedContext'
import type { Student } from '../types/student'

type Props = {
  /** Se ausente, modo criação. */
  docId?: string
  /** Dados atuais (modo edição); o pai mantém o listener do Firestore. */
  initial?: Student
  /** Mudanças pendentes de fora do cadastro (trilhas vinculadas): entram no mesmo Salvar e Cancelar do topo. */
  extraDirty?: boolean
  extraSave?: () => Promise<void>
  extraCancel?: () => void
}

const FUNDAMENTAL_GRADES = [
  '1º ano',
  '2º ano',
  '3º ano',
  '4º ano',
  '5º ano',
  '6º ano',
  '7º ano',
  '8º ano',
  '9º ano',
]

const MIDDLE_GRADES = ['1º ano', '2º ano', '3º ano']

function sanitizePhoneNumber(v: string): string {
  // Remove tudo que não for dígito (deixa o telefone "limpo").
  return v.replace(/\D/g, '')
}

function normalizeSchoolLevel(v: string): Student['school_level'] {
  const s = v.trim().toLowerCase()
  if (s === 'fundamental') return 'fundamental'
  if (s === 'medio' || s === 'médio') return 'médio'
  return v
}

export function StudentForm({ docId, initial, extraDirty, extraSave, extraCancel }: Props) {
  const navigate = useNavigate()
  const isEdit = Boolean(docId)

  const [institutions, setInstitutions] = useState<
    { id: string; name: string }[]
  >([])

  const [institution_id, setInstitutionId] = useState('')
  const [name, setName] = useState('')
  const [phone_number, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [loginIdentifier, setLoginIdentifier] = useState<'phone' | 'email'>('phone')
  const [school_level, setSchoolLevel] = useState<Student['school_level']>(
    'fundamental',
  )
  const [school_grade, setSchoolGrade] = useState('')
  const [student_level, setStudentLevel] = useState<1 | 2 | 3>(2)
  const [active, setActive] = useState(true)
  const [password, setPassword] = useState('')

  const [saving, setSaving] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    // Carrega instituições apenas para montar o select de vínculo.
    const unsub = subscribeToInstitutionOptions(setInstitutions)
    return () => unsub?.()
  }, [])

  useEffect(() => {
    if (!isEdit) {
      setName('')
      setPhoneNumber('')
      setEmail('')
      setLoginIdentifier('phone')
      setInstitutionId('')
      setSchoolLevel('fundamental')
      setSchoolGrade(FUNDAMENTAL_GRADES[0])
      setStudentLevel(2)
      setActive(true)
      setPassword('')
      return
    }

    if (!initial) return
    setInstitutionId(initial.institution_id)
    setName(initial.name)
    setPhoneNumber(sanitizePhoneNumber(initial.phone_number))
    setEmail(initial.email ?? '')
    setLoginIdentifier(initial.login_identifier ?? 'phone')
    setSchoolLevel(normalizeSchoolLevel(initial.school_level))
    setSchoolGrade(initial.school_grade)
    setStudentLevel(initial.student_level)
    setActive(initial.active)
  }, [isEdit, initial])

  const gradesForLevel = useMemo(() => {
    return school_level === 'médio' ? MIDDLE_GRADES : FUNDAMENTAL_GRADES
  }, [school_level])

  useEffect(() => {
    // Se o usuário trocar o nível escolar, ajusta a série/ano para uma opção válida.
    if (!school_grade) {
      return
    }
    if (!gradesForLevel.includes(school_grade)) {
      setSchoolGrade(gradesForLevel[0] ?? '')
    }
  }, [gradesForLevel, school_grade])

  /** Valida e grava. Lança erro com a mensagem se algo estiver errado (o pop-up de sair mostra o texto). */
  async function persist(): Promise<void> {
    if (isEdit && !formDirty) {
      await extraSave?.()
      return
    }
    const instId = institution_id.trim()
    const trimmedName = name.trim()
    const trimmedPhone = sanitizePhoneNumber(phone_number).trim()
    const normalizedLevel = normalizeSchoolLevel(String(school_level))
    const normalizedStudentLevel = student_level

    if (!instId && !isEdit) throw new Error('Informe a instituição (vínculo obrigatório).')
    const nameErr = assertStudentName(trimmedName)
    if (nameErr) throw new Error(nameErr)
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedPhone && !trimmedEmail) throw new Error('Informe o nome e o e-mail ou o telefone.')
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) throw new Error('E-mail inválido.')
    const phoneErr = trimmedPhone ? assertCanonicalBrPhone(trimmedPhone) : null
    if (phoneErr) throw new Error(phoneErr)
    if (normalizedLevel !== 'fundamental' && normalizedLevel !== 'médio') {
      throw new Error('school_level deve ser "fundamental" ou "médio".')
    }
    const gradeErr = assertSchoolGrade(school_grade)
    if (gradeErr) throw new Error(gradeErr)
    if (![1, 2, 3].includes(normalizedStudentLevel)) throw new Error('student_level deve ser 1, 2 ou 3.')
    const trimmedPassword = password.trim()
    if (!isEdit && trimmedPassword.length < 6) {
      throw new Error('Defina uma senha de acesso (mín. 6 caracteres) para o aluno.')
    }
    if (isEdit && trimmedPassword && trimmedPassword.length < 6) {
      throw new Error('Nova senha deve ter pelo menos 6 caracteres.')
    }

    const formData = {
      institution_id: instId,
      name: trimmedName,
      phone_number: trimmedPhone,
      email: trimmedEmail,
      // Regra de login 1.2 (lib/loginRule.ts): com telefone e e-mail, a pessoa escolhe qual vale para a senha.
      login_identifier: trimmedPhone && trimmedEmail ? loginIdentifier : undefined,
      school_level: normalizedLevel,
      school_grade,
      student_level: normalizedStudentLevel,
      active,
    }
    if (docId) {
      await updateStudent(docId, formData)
      if (trimmedPassword) {
        await updateStudentPassword(docId, trimmedPassword)
        setPassword('')
      }
      await extraSave?.()
    } else {
      const newId = await createStudentSequential(formData)
      if (newId) {
        await updateStudentPassword(newId, trimmedPassword)
        navigate(studentPath(newId))
      }
    }
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      await persist()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  /** Há alteração a confirmar: campos diferentes do cadastro salvo (ou preenchidos, no aluno novo). */
  const formDirty = isEdit
    ? Boolean(initial) &&
      (name.trim() !== initial!.name ||
        phone_number !== sanitizePhoneNumber(initial!.phone_number) ||
        email.trim().toLowerCase() !== (initial!.email ?? '').toLowerCase() ||
        (Boolean(phone_number) && Boolean(email.trim()) && loginIdentifier !== (initial!.login_identifier ?? 'phone')) ||
        normalizeSchoolLevel(String(school_level)) !== normalizeSchoolLevel(initial!.school_level) ||
        school_grade !== initial!.school_grade ||
        student_level !== initial!.student_level ||
        active !== initial!.active ||
        password.trim() !== '')
    : Boolean(name.trim() || phone_number || email.trim() || institution_id || password)
  const dirty = formDirty || Boolean(extraDirty)

  function cancelEdit() {
    extraCancel?.()
    setFormError(null)
    if (isEdit && initial) {
      setInstitutionId(initial.institution_id)
      setName(initial.name)
      setPhoneNumber(sanitizePhoneNumber(initial.phone_number))
      setEmail(initial.email ?? '')
      setLoginIdentifier(initial.login_identifier ?? 'phone')
      setSchoolLevel(normalizeSchoolLevel(initial.school_level))
      setSchoolGrade(initial.school_grade)
      setStudentLevel(initial.student_level)
      setActive(initial.active)
    } else {
      setName('')
      setPhoneNumber('')
      setEmail('')
      setInstitutionId('')
      setSchoolLevel('fundamental')
      setSchoolGrade(FUNDAMENTAL_GRADES[0])
      setStudentLevel(2)
      setActive(true)
    }
    setPassword('')
  }

  useUnsavedChanges(dirty && !saving, persist)

  async function handleDelete() {
    if (!docId || !initial) return
    setSaving(true)
    try {
      await deleteStudent(docId)
      navigate('/alunos')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao excluir.')
      setDelOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const peds = ['', 'Básico', 'Intermediário', 'Avançado']
  const instName = institutions.find((i) => i.id === institution_id)?.name || institution_id
  return (
    <>
      <HeadActions>
        <EditBar dirty={dirty} busy={saving} onSave={() => handleSubmit()} onCancel={cancelEdit} />
      </HeadActions>
      <section className="gx-card" aria-label="Cadastro">
        <div className="gx-card__head">
          <h2>{isEdit ? 'Cadastro' : 'Dados do aluno'}</h2>
          {isEdit ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              <Switch checked={active} label="Aluno ativo" onChange={setActive} />
              <button type="button" className="gx-btn gx-btn--danger-line" onClick={() => setDelOpen(true)} disabled={saving}>
                Excluir
              </button>
            </span>
          ) : null}
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="gx-grid">
            <label className="gx-field">
              <span>Nome (obrigatório)</span>
              <input className="gx-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: João da Silva" autoComplete="name" />
            </label>
            <label className="gx-field">
              <span>Telefone (obrigatório, ou e-mail)</span>
              <input className="gx-input" type="text" value={phone_number} onChange={(e) => setPhoneNumber(sanitizePhoneNumber(e.target.value))} placeholder="DDD + número" autoComplete="tel" />
            </label>
            <label className="gx-field">
              <span>E-mail (obrigatório, ou telefone)</span>
              <input className="gx-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@exemplo.com" autoComplete="email" />
            </label>
            {phone_number && email.trim() ? (
              <fieldset className="gx-field" style={{ border: 0, padding: 0, margin: 0 }}>
                <span>Entrar com (vale para a senha)</span>
                <span style={{ display: 'flex', gap: 16, alignItems: 'center', height: 40 }}>
                  <label className="gx-check">
                    <input type="radio" name="login_identifier" checked={loginIdentifier === 'phone'} onChange={() => setLoginIdentifier('phone')} />
                    Telefone
                  </label>
                  <label className="gx-check">
                    <input type="radio" name="login_identifier" checked={loginIdentifier === 'email'} onChange={() => setLoginIdentifier('email')} />
                    E-mail
                  </label>
                </span>
              </fieldset>
            ) : null}
            <label className="gx-field">
              <span>Senha de acesso{isEdit ? ' (deixe em branco para manter)' : ''}</span>
              <input
                className="gx-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder={isEdit ? 'Nova senha (opcional)' : 'Mínimo 6 caracteres'}
              />
            </label>
          </div>
          <div className="gx-grid">
            <label className="gx-field">
              <span>Instituição</span>
              {isEdit ? (
                <input className="gx-input" value={instName || 'N/A'} readOnly tabIndex={-1} aria-readonly="true" />
              ) : (
                <select className="gx-select" value={institution_id} onChange={(e) => setInstitutionId(e.target.value)}>
                  <option value="">Selecione…</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name || inst.id}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label className="gx-field">
              <span>Escolaridade</span>
              <select className="gx-select" value={school_level} onChange={(e) => setSchoolLevel(normalizeSchoolLevel(e.target.value))}>
                <option value="fundamental">Fundamental</option>
                <option value="médio">Médio</option>
              </select>
            </label>
            <label className="gx-field">
              <span>Série ou ano</span>
              <select className="gx-select" value={school_grade} onChange={(e) => setSchoolGrade(e.target.value)}>
                {gradesForLevel.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="gx-field">
              <span>Nível pedagógico</span>
              <select className="gx-select" value={student_level} onChange={(e) => setStudentLevel(Number(e.target.value) as 1 | 2 | 3)}>
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {peds[n]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {formError ? <Banner>{formError}</Banner> : null}
        </form>
      </section>
      <DeletarDialog
        open={delOpen}
        title="Deseja mesmo excluir o aluno?"
        subtitle="Também saem os vínculos com trilhas, o histórico de conversa e as tentativas de exercício. Essa ação não pode ser desfeita."
        busy={saving}
        onCancel={() => setDelOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  )
}
