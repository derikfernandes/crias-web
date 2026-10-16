import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { snapshotToStudent } from '../lib/studentFirestore'
import { useCollection } from '../hooks/useCollection'
import { useGestao } from '../hooks/useGestao'
import { usePermissions } from '../hooks/usePermissions'
import { studentCode } from '../lib/gestaoFormat'
import { updateStudentPassword } from '../lib/studentApi'
import {
  bulkGenerateStudentPasswords,
  countMissingStudentPasswords,
  exportStudentPasswordsCsv,
  fetchStudentPasswords,
  importStudentsCsv,
  regenerateStudentPassword,
  type StudentPasswordRow,
} from '../lib/studentPasswordsApi'
import { downloadBlob, pick, readTable, toCsv } from '../lib/tableFiles'
import { phoneKey } from '../lib/studentBulk'
import {
  Banner,
  BootSymbol,
  ConfirmDialog,
  FilterPopover,
  na,
  PageHead,
  PasswordCell,
  Pager,
  ScrollX,
  usePager,
} from '../design/gx/ui'

const BULK_BATCH_LIMIT = 100

type MassPlan = {
  fileName: string
  csv: string
  rows: number
  errors: Array<{ line: number; nome?: string; celular?: string; error: string }>
}

/** Senhas dos alunos (1.1.14 e orientações 17 e 19): só Master, instituição do filtro global. */
export function StudentPasswordsPage() {
  const g = useGestao()
  const { isMaster } = usePermissions()
  const students = useCollection('students', snapshotToStudent)
  const single = g.scopedInstitutions.length === 1 ? g.scopedInstitutions[0] : null
  const [rows, setRows] = useState<StudentPasswordRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [byName, setByName] = useState<Set<string> | null>(null)
  const [byCode, setByCode] = useState<Set<string> | null>(null)
  const [onlyNone, setOnlyNone] = useState(false)
  const [confirm, setConfirm] = useState<
    | { kind: 'bulk'; count: number }
    | { kind: 'one'; id: string; name: string }
    | { kind: 'mass' }
    | null
  >(null)
  const [plan, setPlan] = useState<MassPlan | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (institutionId: string) => {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchStudentPasswords(institutionId))
    } catch (e) {
      setRows([])
      setError(e instanceof Error ? e.message : 'Erro ao listar senhas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setRows([])
    setPlan(null)
    setByName(null)
    setByCode(null)
    if (isMaster && single) void load(single.id)
  }, [isMaster, single?.id, load]) // eslint-disable-line react-hooks/exhaustive-deps

  const lines = useMemo(
    () => rows.map((r) => ({ row: r, code: studentCode(r.id) })),
    [rows],
  )
  const nameSel = byName ?? new Set(rows.map((r) => r.id))
  const codeSel = byCode ?? new Set(rows.map((r) => r.id))
  const filtered = useMemo(
    () =>
      lines
        .filter((l) => nameSel.has(l.row.id) && codeSel.has(l.row.id))
        .filter((l) => !onlyNone || !l.row.password)
        .sort((a, b) => (a.row.name || '').localeCompare(b.row.name || '', 'pt-BR')),
    [lines, nameSel, codeSel, onlyNone],
  )
  const pager = usePager(filtered, 50)
  const missing = rows.filter((r) => !r.password).length

  function patchRow(id: string, patch: Partial<StudentPasswordRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  async function exportCsv() {
    if (!single) return
    setError(null)
    try {
      downloadBlob(`senhas-${single.id}.csv`, await exportStudentPasswordsCsv(single.id, single.name))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao exportar.')
    }
  }

  async function askBulk() {
    if (!single) return
    setError(null)
    setNotice(null)
    try {
      const preview = await countMissingStudentPasswords(single.id)
      if (preview.would_update <= 0) {
        setNotice('Nenhum aluno sem senha nesta escola. Nada foi alterado.')
        return
      }
      setConfirm({ kind: 'bulk', count: preview.would_update })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao contar alunos sem senha.')
    }
  }

  async function runBulk() {
    if (!single) return
    setConfirm(null)
    setBulkBusy(true)
    try {
      let cursor: string | null = null
      let total = 0
      let done = false
      let guard = 0
      while (!done && guard < 50) {
        guard += 1
        const batch = await bulkGenerateStudentPasswords({
          institutionId: single.id,
          dryRun: false,
          limit: BULK_BATCH_LIMIT,
          cursor,
        })
        total += batch.updated
        done = batch.done
        cursor = batch.next_cursor
        if (batch.updated === 0 && !batch.done) break
      }
      setNotice(`${total} ${total === 1 ? 'senha gerada' : 'senhas geradas'}. Você pode exportar o CSV da escola inteira.`)
      await load(single.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha na geração em lote.')
    } finally {
      setBulkBusy(false)
    }
  }

  async function runRegenerate(id: string) {
    setConfirm(null)
    setBusyId(id)
    setError(null)
    try {
      const r = await regenerateStudentPassword(id)
      patchRow(id, { password: r.password, has_password_hash: true, has_password_encrypted: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao gerar a senha.')
    } finally {
      setBusyId(null)
    }
  }

  async function saveTyped(id: string, next: string) {
    setBusyId(id)
    setError(null)
    try {
      await updateStudentPassword(id, next)
      patchRow(id, { password: next, has_password_hash: true, has_password_encrypted: true })
      setNotice('Senha salva.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar a senha.')
    } finally {
      setBusyId(null)
    }
  }

  /* Alterar senhas em massa: exporta, edita a coluna senha e carrega o arquivo. */
  async function loadMass(file: File | null) {
    setPlan(null)
    if (!file || !single) return
    setError(null)
    try {
      const table = await readTable(file)
      const byPhone = new Map(
        students.rows.filter((s) => s.institution_id === single.id).map((s) => [phoneKey(s.phone_number), s]),
      )
      const errors: MassPlan['errors'] = []
      const out: string[][] = []
      table.forEach((row, i) => {
        const line = i + 2
        const phone = pick(row, 'celular', 'telefone')
        const name = pick(row, 'nome')
        const pw = pick(row, 'senha', 'password')
        if (!phone && !name && !pw) return
        if (!pw) return
        if (pw.length < 6) {
          errors.push({ line, nome: name, celular: phone, error: 'A senha precisa de pelo menos 6 caracteres.' })
          return
        }
        if (!byPhone.has(phoneKey(phone))) {
          errors.push({ line, nome: name, celular: phone, error: 'Aluno não encontrado nesta instituição.' })
          return
        }
        out.push([single.name || single.id, name, phone, pw])
      })
      setPlan({
        fileName: file.name,
        csv: toCsv(['escola', 'nome', 'celular', 'senha'], out, { sep: ',', bom: false }),
        rows: out.length,
        errors,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao ler o arquivo.')
    }
  }

  async function runMass() {
    if (!plan || !single) return
    setConfirm(null)
    setBulkBusy(true)
    setError(null)
    try {
      const r = await importStudentsCsv(plan.csv)
      setNotice(`Senhas alteradas: ${r.updated} atualizada(s), ${r.errors.length} erro(s).`)
      setPlan({ ...plan, rows: 0, errors: [...plan.errors, ...r.errors] })
      if (fileRef.current) fileRef.current.value = ''
      await load(single.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao alterar as senhas em massa.')
    } finally {
      setBulkBusy(false)
    }
  }

  if (g.institutionsLoading || students.ready === false) return <BootSymbol />

  if (!isMaster) {
    return (
      <div className="gx-page">
        <PageHead title="Senhas dos alunos" />
        <Banner>
          Acesso restrito a Master. Peça a um administrador para marcar &quot;Master (senhas dos alunos)&quot; no seu
          login em Configurações, Permissões.
        </Banner>
      </div>
    )
  }

  return (
    <div className="gx-page">
      <PageHead
        title="Senhas dos alunos"
        subtitle="Nome, celular e senha dos alunos de cada escola. Toda visualização, exportação e nova senha fica registrada."
      />
      {!single ? <Banner>Selecione uma instituição no filtro do topo.</Banner> : null}
      {error ? <Banner>{error}</Banner> : null}
      {notice ? <Banner tone="ok">{notice}</Banner> : null}

      <section className="gx-card" aria-label="Alterar senhas em massa">
        <div>
          <h2>Alterar senhas em massa</h2>
          <p className="gx-muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
            Exporte o CSV, edite a coluna senha e carregue o arquivo. Colunas: escola, nome, celular, senha.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <button type="button" className="gx-btn" disabled={!single} onClick={() => void exportCsv()}>
            Exportar CSV
          </button>
          <label className="gx-btn" style={{ position: 'relative', opacity: single ? 1 : 0.4 }}>
            Carregar arquivo CSV
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              disabled={!single}
              aria-label="Carregar arquivo CSV de senhas"
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
              onChange={(e) => void loadMass(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            className="gx-btn gx-btn--primary"
            disabled={!plan || plan.rows === 0 || bulkBusy}
            onClick={() => setConfirm({ kind: 'mass' })}
          >
            Alterar senhas
          </button>
          <span data-fade="1" className="gx-muted" style={{ flex: '1 1 160px' }}>
            {plan ? `${plan.fileName}: ${plan.rows} senha(s) prontas` : 'Nenhum arquivo escolhido'}
          </span>
        </div>
        {plan && plan.errors.length > 0 ? (
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
                {plan.errors.slice(0, 50).map((e) => (
                  <tr key={`${e.line}-${e.error}`}>
                    <td>{e.line}</td>
                    <td>{na(e.nome)}</td>
                    <td>{na(e.celular)}</td>
                    <td style={{ color: 'var(--v-err)' }}>{e.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="gx-card" aria-label="Alunos da escola" style={{ padding: 0, gap: 0, overflow: 'visible' }}>
        <div className="gx-card__head" style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, minWidth: 0 }}>
            <h2>Alunos da escola</h2>
            {single ? (
              <span className="gx-muted">
                {rows.length} alunos · {missing} sem senha
              </span>
            ) : null}
            {loading ? <span className="gx-muted">Carregando…</span> : null}
          </div>
          <button
            type="button"
            className="gx-btn gx-btn--primary"
            disabled={!single || bulkBusy || loading}
            onClick={() => void askBulk()}
          >
            {bulkBusy ? 'Gerando…' : 'Gerar senhas para alunos sem senha'}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '16px 20px' }}>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <FilterPopover
              variant="field"
              align="left"
              label="Filtrar por nome"
              options={rows.map((r) => ({ id: r.id, name: r.name || r.id }))}
              selected={nameSel}
              onChange={(n) => {
                setByName(n)
                pager.reset()
              }}
            />
          </div>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <FilterPopover
              variant="field"
              align="left"
              label="Filtrar por código"
              options={lines.filter((l) => l.code !== null).map((l) => ({ id: l.row.id, name: String(l.code) }))}
              selected={codeSel}
              onChange={(n) => {
                setByCode(n)
                pager.reset()
              }}
            />
          </div>
          <label className="gx-check gx-btn" style={{ height: 40, borderRadius: 12 }}>
            <input type="checkbox" checked={onlyNone} onChange={(e) => setOnlyNone(e.target.checked)} />
            Sem senha
          </label>
        </div>
        <ScrollX>
          <table className="gx-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Código</th>
                <th>Celular</th>
                <th>Senha</th>
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((l) => (
                <tr key={l.row.id}>
                  <td>
                    <Link to={`/alunos/${l.row.id}`} style={{ color: 'var(--v-ink)', fontWeight: 700 }}>
                      {l.row.name || l.row.id}
                    </Link>
                  </td>
                  <td className="num">{na(l.code)}</td>
                  <td>{na(l.row.phone_number)}</td>
                  <td>
                    <PasswordCell
                      password={l.row.password}
                      generating={busyId === l.row.id}
                      saving={busyId === l.row.id}
                      legacyHint={l.row.has_password_hash ? 'Senha anterior sem revelação. Gere uma nova senha.' : undefined}
                      onGenerate={() => setConfirm({ kind: 'one', id: l.row.id, name: l.row.name })}
                      onSave={(next) => void saveTyped(l.row.id, next)}
                    />
                  </td>
                </tr>
              ))}
              {!single ? (
                <tr>
                  <td colSpan={4} className="gx-table__empty">
                    Selecione uma instituição no filtro do topo.
                  </td>
                </tr>
              ) : filtered.length === 0 && !loading ? (
                <tr>
                  <td colSpan={4} className="gx-table__empty">
                    Nenhum aluno com os filtros atuais.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </ScrollX>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--v-soft2)' }}>
          <Pager pager={pager} noun="aluno" nounPlural="alunos" sizes={[50, 100]} />
        </div>
      </section>

      <ConfirmDialog
        open={confirm?.kind === 'bulk'}
        title="Gerar senhas para alunos sem senha?"
        text={
          confirm?.kind === 'bulk'
            ? `Serão geradas senhas para ${confirm.count} ${confirm.count === 1 ? 'aluno' : 'alunos'} sem senha nesta escola. Quem já tem senha não muda.`
            : undefined
        }
        confirmLabel="Gerar senhas"
        onCancel={() => setConfirm(null)}
        onConfirm={() => void runBulk()}
      />
      <ConfirmDialog
        open={confirm?.kind === 'one'}
        title="Gerar nova senha?"
        text={confirm?.kind === 'one' ? `Gerar nova senha para ${confirm.name || 'este aluno'}? A senha anterior deixará de funcionar.` : undefined}
        confirmLabel="Gerar nova senha"
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.kind === 'one' && void runRegenerate(confirm.id)}
      />
      <ConfirmDialog
        open={confirm?.kind === 'mass'}
        title="Tem certeza que deseja alterar senhas em massa?"
        text={plan ? `${plan.rows} ${plan.rows === 1 ? 'senha será alterada' : 'senhas serão alteradas'}. As senhas antigas deixam de funcionar.` : undefined}
        confirmLabel="Alterar senhas"
        busy={bulkBusy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void runMass()}
      />
    </div>
  )
}
