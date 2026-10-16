import { useRef, useState } from 'react'
import { Banner, Icon } from '../../design/gx/ui'
import { DeletarDialog } from '../../design/gx/ui'
import {
  ADD_COLUMNS,
  REMOVE_COLUMNS,
  addStudentsBulk,
  inactivateStudents,
  parseAddRows,
  parseRemoveRows,
  type AddParse,
  type BulkError,
  type RemoveParse,
} from '../../lib/studentBulk'
import { downloadText, readTable, toCsv } from '../../lib/tableFiles'
import type { Institution } from '../../types/institution'
import type { Student } from '../../types/student'
import type { Trail } from '../../types/trail'

function Columns({ names, optional }: { names: string[]; optional?: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <span className="gx-label" style={{ marginRight: 4 }}>
        Colunas
      </span>
      {names.map((n) => (
        <span key={n} className="gx-tag" style={{ fontSize: 12, padding: '4px 12px', color: 'var(--v-ink)', background: 'var(--v-soft)' }}>
          {n}
          {optional?.includes(n) ? <span style={{ color: 'var(--v-t3)', fontWeight: 600 }}>&nbsp;(opcional)</span> : null}
        </span>
      ))}
    </div>
  )
}

function ErrorTable({ errors }: { errors: BulkError[] }) {
  if (errors.length === 0) return null
  return (
    <div className="gx-tablewrap" data-sfade="x">
      <table className="gx-table" aria-label="Linhas com erro">
        <thead>
          <tr>
            <th>Linha</th>
            <th>Nome</th>
            <th>Celular</th>
            <th>Erro</th>
          </tr>
        </thead>
        <tbody>
          {errors.slice(0, 50).map((e) => (
            <tr key={`${e.line}-${e.error}`}>
              <td>{e.line}</td>
              <td>{e.name || 'N/A'}</td>
              <td>{e.phone || 'N/A'}</td>
              <td style={{ color: 'var(--v-err)' }}>{e.error}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * "Cadastrar alunos" e "Remover alunos" em massa, no topo da página Alunos (1.1.9).
 * Cadastrar sempre grava na base. Remover pede DELETAR e mantém o histórico.
 */
export function BulkBlocks({
  institution,
  students,
  trails,
}: {
  institution: Institution | null
  students: Student[]
  trails: Trail[]
}) {
  const instStudents = institution ? students.filter((s) => s.institution_id === institution.id) : []
  const instTrails = institution ? trails.filter((t) => t.institution_id === institution.id) : []
  const disabled = !institution

  /* Cadastrar */
  const addInput = useRef<HTMLInputElement>(null)
  const [addName, setAddName] = useState('')
  const [addParse, setAddParse] = useState<AddParse | null>(null)
  const [addBusy, setAddBusy] = useState(false)
  const [addMsg, setAddMsg] = useState<string | null>(null)
  const [addErrors, setAddErrors] = useState<BulkError[]>([])
  const [error, setError] = useState<string | null>(null)

  /* Remover */
  const rmInput = useRef<HTMLInputElement>(null)
  const [rmName, setRmName] = useState('')
  const [rmParse, setRmParse] = useState<RemoveParse | null>(null)
  const [rmConfirm, setRmConfirm] = useState(false)
  const [rmBusy, setRmBusy] = useState(false)
  const [rmMsg, setRmMsg] = useState<string | null>(null)

  function addTemplate() {
    downloadText(
      'modelo-cadastrar-alunos.csv',
      toCsv(ADD_COLUMNS, [
        ['Maria Souza', '11 90000-0001', '', instTrails[0]?.name ?? ''],
        ['João Lima', '11 90000-0002', 'senha123', ''],
      ]),
    )
  }

  async function loadAdd(file: File | null) {
    setAddParse(null)
    setAddMsg(null)
    setAddErrors([])
    setAddName(file?.name ?? '')
    if (!file) return
    setError(null)
    try {
      setAddParse(parseAddRows(await readTable(file), instStudents, instTrails))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao ler a planilha.')
    }
  }

  async function addAll() {
    if (!institution || !addParse) return
    setAddBusy(true)
    setError(null)
    try {
      const r = await addStudentsBulk({ institutionId: institution.id, rows: addParse.rows, trails: instTrails })
      setAddMsg(`${r.added} ${r.added === 1 ? 'aluno adicionado' : 'alunos adicionados'} para esta instituição.`)
      setAddErrors([...addParse.errors, ...r.errors])
      setAddParse(null)
      setAddName('')
      if (addInput.current) addInput.current.value = ''
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível adicionar os alunos.')
    } finally {
      setAddBusy(false)
    }
  }

  function removeBase() {
    downloadText(
      'base-alunos-remover.csv',
      toCsv(
        REMOVE_COLUMNS,
        instStudents
          .filter((s) => s.active)
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
          .map((s) => [s.name, s.phone_number, 'não']),
      ),
    )
  }

  async function loadRemove(file: File | null) {
    setRmParse(null)
    setRmMsg(null)
    setRmName(file?.name ?? '')
    if (!file) return
    setError(null)
    try {
      setRmParse(parseRemoveRows(await readTable(file), instStudents))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao ler a planilha.')
    }
  }

  async function removeAll() {
    if (!rmParse) return
    setRmBusy(true)
    setError(null)
    try {
      const n = await inactivateStudents(rmParse.ids)
      setRmMsg(`${n} ${n === 1 ? 'aluno removido' : 'alunos removidos'} para esta instituição.`)
      setRmParse(null)
      setRmName('')
      setRmConfirm(false)
      if (rmInput.current) rmInput.current.value = ''
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível remover os alunos.')
    } finally {
      setRmBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {disabled ? <Banner>Selecione uma instituição no filtro do topo para cadastrar ou remover alunos em massa.</Banner> : null}
      {error ? <Banner>{error}</Banner> : null}
      <section className="gx-card" aria-label="Cadastrar alunos" style={{ padding: 24 }}>
        <div>
          <h2>Cadastrar alunos</h2>
          <p className="gx-muted">Adicione alunos em massa com planilha</p>
        </div>
        <Columns names={ADD_COLUMNS} optional={['senha', 'trilha']} />
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <button type="button" className="gx-btn" onClick={addTemplate}>
            Baixar planilha modelo
          </button>
          <label className="gx-btn" style={{ position: 'relative', opacity: disabled ? 0.4 : 1 }}>
            <Icon name="download" />
            Escolher planilha
            <input
              ref={addInput}
              type="file"
              accept=".csv,.xlsx,.xls"
              disabled={disabled}
              aria-label="Escolher planilha de alunos para cadastrar"
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
              onChange={(e) => void loadAdd(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            className="gx-btn gx-btn--primary"
            disabled={disabled || addBusy || !addParse || addParse.rows.length === 0}
            onClick={() => void addAll()}
          >
            {addBusy ? 'Adicionando…' : 'Adicionar em massa'}
          </button>
          <span data-fade="1" className="gx-muted" style={{ flex: '1 1 160px' }}>
            {addName || 'Nenhum arquivo escolhido'}
          </span>
        </div>
        {addParse ? (
          <p className="gx-muted">
            {addParse.rows.length} aluno(s) prontos para adicionar
            {addParse.errors.length > 0 ? `, ${addParse.errors.length} linha(s) com erro` : ''}.
          </p>
        ) : null}
        {addParse ? <ErrorTable errors={addParse.errors} /> : <ErrorTable errors={addErrors} />}
        {addMsg ? <Banner tone="ok">{addMsg}</Banner> : null}
      </section>

      <section className="gx-card" aria-label="Remover alunos" style={{ padding: 24 }}>
        <div>
          <h2>Remover alunos</h2>
          <p className="gx-muted">Remova alunos da base com planilha</p>
        </div>
        <Columns names={REMOVE_COLUMNS} />
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <button type="button" className="gx-btn" disabled={disabled} onClick={removeBase}>
            Baixar planilha base com alunos
          </button>
          <label className="gx-btn" style={{ position: 'relative', opacity: disabled ? 0.4 : 1 }}>
            <Icon name="download" />
            Escolher planilha
            <input
              ref={rmInput}
              type="file"
              accept=".csv,.xlsx,.xls"
              disabled={disabled}
              aria-label="Escolher planilha de alunos para remover"
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
              onChange={(e) => void loadRemove(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            className="gx-btn gx-btn--danger"
            disabled={disabled || rmBusy || !rmParse || rmParse.ids.length === 0}
            onClick={() => setRmConfirm(true)}
          >
            Remover em massa
          </button>
          <span data-fade="1" className="gx-muted" style={{ flex: '1 1 160px' }}>
            {rmName || 'Nenhum arquivo escolhido'}
          </span>
        </div>
        {rmParse ? (
          <p className="gx-muted">
            {rmParse.ids.length} aluno(s) marcados para remover
            {rmParse.errors.length > 0 ? `, ${rmParse.errors.length} linha(s) com erro` : ''}.
          </p>
        ) : null}
        {rmParse ? <ErrorTable errors={rmParse.errors} /> : null}
        {rmMsg ? (
          <p role="status" className="gx-banner gx-banner--err" style={{ fontWeight: 600 }}>
            {rmMsg}
          </p>
        ) : null}
      </section>

      <DeletarDialog
        open={rmConfirm}
        title="Tem certeza que deseja remover os alunos selecionados?"
        subtitle="Eles perdem o acesso, mas o histórico fica guardado."
        confirmLabel="Remover"
        hint="Escreva DELETAR para remover."
        busy={rmBusy}
        onCancel={() => setRmConfirm(false)}
        onConfirm={() => void removeAll()}
      />
    </div>
  )
}
