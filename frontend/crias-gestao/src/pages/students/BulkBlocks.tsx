import { BulkPanel } from '../../components/BulkPanel'
import {
  PED_LABELS,
  plural,
  planStudentsAdd,
  planStudentsEdit,
  planStudentsRemove,
} from '../../lib/bulkActions'
import { addStudentsBulk, editStudentsBulk, inactivateStudents } from '../../lib/studentBulk'
import { downloadText, toCsv } from '../../lib/tableFiles'
import type { Institution } from '../../types/institution'
import type { Student } from '../../types/student'

// 1.3.13: Turma depois do Nome em todas as planilhas de aluno.
const ADD_COLUMNS = [
  'ID Instituição (obrigatório)',
  'Nome (obrigatório)',
  'Turma (opcional)',
  'Telefone (obrigatório, ou e-mail)',
  'E-mail (obrigatório, ou telefone)',
  'Senha (opcional)',
]
const EDIT_COLUMNS = [
  'ID Instituição',
  'ID Aluno',
  'Nome',
  'Turma',
  'Telefone',
  'E-mail',
  'Escolaridade',
  'Nível pedagógico',
]
const REMOVE_COLUMNS = ['ID Instituição', 'ID Aluno', 'Nome (visualização)', 'Turma (visualização)', 'Telefone (visualização)', 'Remover (sim / não)']

function schooling(s: Student): string {
  const level = s.school_level === 'fundamental' ? 'Fundamental' : s.school_level === 'médio' ? 'Médio' : s.school_level
  return [level, s.school_grade].filter(Boolean).join(' · ')
}

/**
 * Cadastrar, editar e remover alunos em massa (INTERFACE.md 1.1.1.b, D). Painéis recolhidos, mesma
 * sequência: baixar planilha, carregar, ação, confirmação em linha e resultado com os erros.
 */
export function BulkBlocks({
  institution,
  students,
  onViewStudents,
}: {
  institution: Institution | null
  students: Student[]
  /** Botão "Ver em alunos" ao lado da mensagem final (página da Instituição). */
  onViewStudents?: () => void
}) {
  const viewAction = onViewStudents ? { label: 'Ver em alunos', onClick: onViewStudents } : undefined
  const instStudents = institution ? students.filter((s) => s.institution_id === institution.id) : []
  const disabled = !institution
  const hint = 'Selecione uma instituição no filtro do topo para usar as ações em massa de alunos.'
  const instId = institution?.id ?? ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <BulkPanel
        title="Cadastrar alunos em massa"
        subtitle="Cadastre vários alunos de uma vez com uma planilha"
        columns={ADD_COLUMNS}
        note="Código gerado automaticamente. Telefones ou e-mails já cadastrados ficam de fora."
        baseLabel="Baixar planilha modelo"
        disabled={disabled}
        disabledHint={hint}
        onDownload={() =>
          downloadText('modelo-cadastrar-alunos.csv', toCsv(ADD_COLUMNS, [[instId, '', '', '', '', '']]))
        }
        plan={(rows) => {
          const p = planStudentsAdd(rows, { institutionId: instId, existing: instStudents })
          return {
            data: p,
            preview: {
              confirmTitle: 'Cadastrar alunos em massa?',
              confirmText: `${plural(p.items.length, 'aluno será cadastrado', 'alunos serão cadastrados')}${
                p.alreadyRegistered > 0 ? `, ${p.alreadyRegistered} já cadastrado${p.alreadyRegistered === 1 ? '' : 's'} fica${p.alreadyRegistered === 1 ? '' : 'm'} de fora` : ''
              }.`,
              actionable: p.items.length,
              issues: p.issues,
            },
          }
        }}
        apply={async (p) => {
          const r = await addStudentsBulk({ institutionId: instId, rows: p.items })
          return {
            summary: `${plural(r.added, 'aluno cadastrado', 'alunos cadastrados')}${
              r.withPassword > 0 ? `, ${plural(r.withPassword, 'com senha', 'com senha')}` : ''
            }${p.alreadyRegistered > 0 ? `, ${p.alreadyRegistered} já cadastrado${p.alreadyRegistered === 1 ? '' : 's'} (de fora)` : ''}.`,
            issues: r.issues,
          }
        }}
        actionLabel="Cadastrar"
        confirmLabel="Cadastrar"
        resultAction={viewAction}
      />

      <BulkPanel
        title="Editar alunos em massa"
        subtitle="Altere dados de vários alunos de uma vez com uma planilha"
        columns={EDIT_COLUMNS}
        note="A planilha base vem com os dados atuais. Campos em branco não são editados. O aluno é achado pelo ID Aluno."
        baseLabel="Baixar planilha base"
        disabled={disabled}
        disabledHint={hint}
        onDownload={() =>
          downloadText(
            'base-editar-alunos.csv',
            toCsv(
              EDIT_COLUMNS,
              [...instStudents]
                .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'pt-BR'))
                .map((s) => [instId, s.id, s.name, (s.turma ?? '').trim(), s.phone_number, s.email ?? '', schooling(s), PED_LABELS[s.student_level] ?? '']),
            ),
          )
        }
        plan={(rows) => {
          const p = planStudentsEdit(rows, { institutionId: instId, students: instStudents })
          return {
            data: p,
            preview: {
              confirmTitle: 'Editar alunos em massa?',
              confirmText: `${plural(p.items.length, 'aluno será alterado', 'alunos serão alterados')}, ${p.unchanged} ${
                p.unchanged === 1 ? 'fica' : 'ficam'
              } como ${p.unchanged === 1 ? 'está' : 'estão'}.`,
              actionable: p.items.length,
              issues: p.issues,
            },
          }
        }}
        apply={async (p) => {
          const n = await editStudentsBulk(p.items)
          return {
            summary: `${plural(n, 'aluno alterado', 'alunos alterados')}, ${p.unchanged} sem mudança.`,
          }
        }}
        actionLabel="Alterar"
        confirmLabel="Alterar"
        resultAction={viewAction}
      />

      <BulkPanel
        title="Remover alunos em massa"
        subtitle="Remova vários alunos da instituição com uma planilha"
        columns={REMOVE_COLUMNS}
        note="Remoção a partir do ID do aluno. O aluno perde o acesso e o histórico fica guardado."
        baseLabel="Baixar planilha base"
        disabled={disabled}
        disabledHint={hint}
        tone="red"
        onDownload={() =>
          downloadText(
            'base-remover-alunos.csv',
            toCsv(
              REMOVE_COLUMNS,
              instStudents
                .filter((s) => s.active)
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                .map((s) => [instId, s.id, s.name, (s.turma ?? '').trim(), s.phone_number, 'não']),
            ),
          )
        }
        plan={(rows) => {
          const p = planStudentsRemove(rows, { institutionId: instId, students: instStudents })
          return {
            data: p,
            preview: {
              confirmTitle: 'Remover alunos em massa?',
              confirmText: `${plural(p.items.length, 'aluno será removido', 'alunos serão removidos')}, ${p.unchanged} ${
                p.unchanged === 1 ? 'fica' : 'ficam'
              } como ${p.unchanged === 1 ? 'está' : 'estão'}.`,
              actionable: p.items.length,
              issues: p.issues,
            },
          }
        }}
        apply={async (p) => {
          const n = await inactivateStudents(p.items.map((i) => i.student.id))
          return { summary: `${plural(n, 'aluno removido', 'alunos removidos')}, ${p.unchanged} sem mudança.` }
        }}
        actionLabel="Remover"
        confirmLabel="Remover"
        resultAction={viewAction}
      />
    </div>
  )
}
