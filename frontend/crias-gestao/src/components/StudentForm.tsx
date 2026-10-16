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
import { Banner, DeletarDialog, Switch } from '../design/gx/ui'
import type { Student } from '../types/student'

type Props = {
  /** Se ausente, modo criação. */
  docId?: string
  /** Dados atuais (modo edição); o pai mantém o listener do Firestore. */
  initial?: Student
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

export function StudentForm({ docId, initial }: Props) {
  const navigate = useNavigate()
  const isEdit = Boolean(docId)

  const [institutions, setInstitutions] = useState<
    { id: string; name: string }[]
  >([])

  const [institution_id, setInstitutionId] = useState('')
  const [name, setName] = useState('')
  const [phone_number, setPhoneNumber] = useState('')
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const instId = institution_id.trim()
    const trimmedName = name.trim()
    const trimmedPhone = sanitizePhoneNumber(phone_number).trim()
    const normalizedLevel = normalizeSchoolLevel(String(school_level))
    const normalizedStudentLevel = student_level

    if (!instId && !isEdit) {
      setFormError('Informe a instituição (vínculo obrigatório).')
      return
    }
    if (!trimmedName) {
      setFormError('Informe o nome do aluno.')
      return
    }
    if (!trimmedPhone) {
      setFormError('Informe o telefone do aluno.')
      return
    }
    if (normalizedLevel !== 'fundamental' && normalizedLevel !== 'médio') {
      setFormError('school_level deve ser "fundamental" ou "médio".')
      return
    }
    if (!school_grade) {
      setFormError('Informe a série/ano (school_grade).')
      return
    }
    if (![1, 2, 3].includes(normalizedStudentLevel)) {
      setFormError('student_level deve ser 1, 2 ou 3.')
      return
    }
    const trimmedPassword = password.trim()
    if (!isEdit && trimmedPassword.length < 6) {
      setFormError('Defina uma senha de acesso (mín. 6 caracteres) para o aluno.')
      return
    }
    if (isEdit && trimmedPassword && trimmedPassword.length < 6) {
      setFormError('Nova senha deve ter pelo menos 6 caracteres.')
      return
    }

    setSaving(true)
    setFormError(null)
    try {
      const formData = {
        institution_id: instId,
        name: trimmedName,
        phone_number: trimmedPhone,
        school_level: normalizedLevel,
        school_grade,
        student_level: normalizedStudentLevel,
        active,
      }
      if (docId) {
        await updateStudent(docId, formData)
        if (trimmedPassword) {
          await updateStudentPassword(docId, trimmedPassword)
        }
      } else {
        const newId = await createStudentSequential(formData)
        if (newId) {
          await updateStudentPassword(newId, trimmedPassword)
          navigate(studentPath(newId))
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

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
      <section className="gx-card" aria-label="Cadastro">
        <div className="gx-card__head">
          <h2>{isEdit ? 'Cadastro' : 'Dados do aluno'}</h2>
          {isEdit ? <Switch checked={active} label="Aluno ativo" onChange={setActive} /> : null}
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="gx-grid">
            <label className="gx-field">
              <span>Nome</span>
              <input className="gx-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: João da Silva" autoComplete="name" />
            </label>
            <label className="gx-field">
              <span>Telefone</span>
              <input className="gx-input" type="text" value={phone_number} onChange={(e) => setPhoneNumber(sanitizePhoneNumber(e.target.value))} placeholder="DDD + número" autoComplete="tel" />
            </label>
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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" className="gx-btn gx-btn--primary" disabled={saving}>
              {saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Incluir aluno'}
            </button>
            {isEdit ? (
              <button type="button" className="gx-btn" style={{ color: 'var(--v-err)' }} onClick={() => setDelOpen(true)} disabled={saving}>
                Excluir aluno
              </button>
            ) : null}
          </div>
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
