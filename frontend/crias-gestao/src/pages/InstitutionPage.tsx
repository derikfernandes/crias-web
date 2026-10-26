import { useNavigate, useParams } from 'react-router-dom'
import { BulkBlocks } from './students/BulkBlocks'
import { InstitutionCadastro } from '../components/InstitutionCadastro'
import { BootSymbol, PageHead } from '../design/gx/ui'
import { useCollection } from '../hooks/useCollection'
import { useGestao } from '../hooks/useGestao'
import { snapshotToStudent } from '../lib/studentFirestore'

/**
 * Instituição (1.1.1.b): Cadastro da instituição (lápis) e as ações em massa de alunos desta instituição,
 * com "Ver em alunos" depois de aplicar, que abre Alunos filtrado por ela.
 */
export function InstitutionPage() {
  const { id } = useParams<{ id: string }>()
  const g = useGestao()
  const navigate = useNavigate()
  const students = useCollection('students', snapshotToStudent)
  const institution = g.institutions.find((i) => i.id === id) ?? null
  if (g.institutionsLoading || !students.ready) return <BootSymbol />
  if (!institution) {
    return (
      <div className="gx-page">
        <PageHead title="Instituição não encontrada" subtitle="A instituição não existe ou você não tem acesso a ela." />
      </div>
    )
  }
  return (
    <div className="gx-page">
      <PageHead title={institution.name || institution.id} subtitle="Cadastro da instituição e alunos em massa." />
      <InstitutionCadastro institution={institution} />
      <BulkBlocks
        institution={institution}
        students={students.rows}
        onViewStudents={() => {
          g.setSelectedIds(new Set([institution.id]))
          navigate('/alunos')
        }}
      />
    </div>
  )
}
