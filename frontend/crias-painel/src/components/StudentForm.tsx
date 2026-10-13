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
    const ok = window.confirm(
      `Excluir o aluno "${initial.name || docId}"?\n\n` +
        'Também serão removidos os vínculos em trilhas (student_trails), ' +
        'o histórico de conversa e as tentativas de exercício. ' +
        'Esta ação não pode ser desfeita.',
    )
    if (!ok) return

    try {
      await deleteStudent(docId)
      navigate('/')
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Erro ao excluir.')
    }
  }

  return (
    <section className="panel">
      <h2>{isEdit ? 'Editar aluno' : 'Novo aluno'}</h2>

      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Instituição</span>
          <select
            value={institution_id}
            onChange={(e) => setInstitutionId(e.target.value)}
          >
            <option value="">
              {isEdit ? 'Sem instituição' : 'Selecione…'}
            </option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name ? `${inst.name} (${inst.id})` : inst.id}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Nome</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: João da Silva"
            autoComplete="name"
          />
        </label>

        <label className="field">
          <span>Telefone</span>
          <input
            type="text"
            value={phone_number}
            onChange={(e) =>
              setPhoneNumber(sanitizePhoneNumber(e.target.value))
            }
            placeholder="+55 11 99999-0000"
            autoComplete="tel"
          />
        </label>

        <label className="field">
          <span>
            Senha de acesso (app aluno)
            {isEdit ? ' — deixe em branco para manter' : ''}
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isEdit ? 'new-password' : 'off'}
            minLength={isEdit ? undefined : 6}
            placeholder={isEdit ? 'Nova senha (opcional)' : 'Mín. 6 caracteres'}
          />
        </label>

        <label className="field">
          <span>Nível escolar (school_level)</span>
          <select
            value={school_level}
            onChange={(e) => setSchoolLevel(normalizeSchoolLevel(e.target.value))}
          >
            <option value="fundamental">fundamental</option>
            <option value="médio">médio</option>
          </select>
        </label>

        <label className="field">
          <span>Série/ano (school_grade)</span>
          <select
            value={school_grade}
            onChange={(e) => setSchoolGrade(e.target.value)}
          >
            {gradesForLevel.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Nível do aluno (student_level)</span>
          <select
            value={student_level}
            onChange={(e) => setStudentLevel(Number(e.target.value) as 1 | 2 | 3)}
          >
            <option value={1}>1</option>
            <option value={2}>2 (intermediário)</option>
            <option value={3}>3</option>
          </select>
        </label>

        <label className="field field--inline">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <span>Aluno ativo</span>
        </label>

        {formError ? (
          <p className="form__error" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="form__actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Incluir'}
          </button>
          {isEdit ? (
            <button
              type="button"
              className="btn btn--danger"
              onClick={handleDelete}
              disabled={saving}
            >
              Excluir
            </button>
          ) : null}
        </div>
      </form>
    </section>
  )
}

