import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { snapshotToStudent } from '../lib/studentFirestore'
import { useCollection } from '../hooks/useCollection'
import { useGestao } from '../hooks/useGestao'
import { usePermissions } from '../hooks/usePermissions'
import { studentCode } from '../lib/gestaoFormat'
import {
  bulkGenerateStudentPasswords,
  countMissingStudentPasswords,
  fetchStudentPasswords,
  type StudentPasswordRow,
} from '../lib/studentPasswordsApi'
import { EditBar } from '../components/EditBar'
import { useUnsavedChanges } from '../contexts/UnsavedContext'
import { BulkPanel } from '../components/BulkPanel'
import { planPasswords, plural } from '../lib/bulkActions'
import { setPasswordsBulk } from '../lib/studentBulk'
import { downloadText, toCsv } from '../lib/tableFiles'
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
const PW_LETTERS = 'abcdefghjkmnpqrstuvwxyz'
const PW_DIGITS = '23456789'

/** Senha de 6 caracteres como a do servidor: minúsculas e dígitos, com pelo menos um de cada, sem 0 o 1 l i. */
function generatePassword(): string {
  const pick = (alphabet: string) => {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return alphabet[buf[0] % alphabet.length]
  }
  const chars = [pick(PW_LETTERS), pick(PW_DIGITS)]
  while (chars.length < 6) chars.push(pick(PW_LETTERS + PW_DIGITS))
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    const j = buf[0] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
// 1.3.13: Turma depois do Nome (visualização).
const MASS_COLUMNS = ['ID Instituição', 'ID Aluno', 'Nome (visualização)', 'Turma (visualização)', 'Telefone (visualização)', 'Senha']

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
  /** Senhas novas ainda não salvas (aluno -> senha). O Salvar do topo grava tudo. */
  const [pendingPw, setPendingPw] = useState<Map<string, string>>(new Map())
  const [savingPw, setSavingPw] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [byName, setByName] = useState<Set<string> | null>(null)
  const [byCode, setByCode] = useState<Set<string> | null>(null)
  const [onlyNone, setOnlyNone] = useState(false)
  const [confirm, setConfirm] = useState<
    | { kind: 'bulk'; count: number }
    | { kind: 'one'; id: string; name: string }
    | null
  >(null)

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
    setByName(null)
    setByCode(null)
    if (isMaster && single) void load(single.id)
  }, [isMaster, single?.id, load]) // eslint-disable-line react-hooks/exhaustive-deps

  const lines = useMemo(
    () => rows.map((r) => ({ row: r, code: studentCode(r.id) })),
    [rows],
  )
  const emailById = useMemo(() => new Map(students.rows.map((s) => [s.id, s.email ?? ''])), [students.rows])
  const turmaById = useMemo(() => new Map(students.rows.map((s) => [s.id, (s.turma ?? '').trim()])), [students.rows])
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
      setError(e instanceof Error ? e.message : 'Falha na geração em massa.')
    } finally {
      setBulkBusy(false)
    }
  }

  /** Gera a senha nova na tela. Só vai para o banco no Salvar do topo. */
  function runRegenerate(id: string) {
    setConfirm(null)
    setPendingPw((prev) => new Map(prev).set(id, generatePassword()))
  }

  function saveTyped(id: string, next: string) {
    setPendingPw((prev) => new Map(prev).set(id, next))
  }

  /** Grava as senhas pendentes. Lança erro se alguma falhar (o pop-up de sair mostra a mensagem). */
  async function persistPasswords() {
    const items = [...pendingPw.entries()]
      .map(([id, password]) => ({ line: 0, student: students.rows.find((s) => s.id === id), password }))
      .filter((i): i is { line: number; student: NonNullable<typeof i.student>; password: string } => Boolean(i.student))
    const r = await setPasswordsBulk(items)
    const failed = new Set(r.issues.map((i) => i.ref))
    setPendingPw((prev) => {
      const next = new Map(prev)
      for (const [id] of prev) if (!failed.has(id)) next.delete(id)
      return next
    })
    if (single) await load(single.id)
    if (r.issues.length > 0) throw new Error(`${r.issues.length} senha(s) não foram salvas: ${r.issues[0].error}`)
    setNotice(`${plural(r.done, 'senha salva', 'senhas salvas')}.`)
  }

  async function savePasswords() {
    setSavingPw(true)
    setError(null)
    try {
      await persistPasswords()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar as senhas.')
    } finally {
      setSavingPw(false)
    }
  }

  useUnsavedChanges(pendingPw.size > 0 && !savingPw, persistPasswords)

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
        titleAction={<EditBar dirty={pendingPw.size > 0} busy={savingPw} onSave={savePasswords} onCancel={() => setPendingPw(new Map())} />}
      />
      {!single ? <Banner>Selecione uma instituição no filtro do topo.</Banner> : null}
      {error ? <Banner>{error}</Banner> : null}
      {notice ? <Banner tone="ok">{notice}</Banner> : null}

      <BulkPanel
        title="Alterar senhas em massa"
        subtitle="Altere as senhas de vários alunos de uma vez com uma planilha"
        columns={MASS_COLUMNS}
        note="Somente senhas preenchidas serão alteradas. A planilha base vem com a senha em branco. O aluno é achado pelo ID Aluno."
        baseLabel="Baixar planilha base"
        disabled={!single}
        disabledHint="Selecione uma instituição no filtro do topo."
        onDownload={() => {
          if (!single) return
          const list = students.rows
            .filter((s) => s.institution_id === single.id && s.active)
            .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'))
          downloadText(
            `base-senhas-${single.id}.csv`,
            toCsv(MASS_COLUMNS, list.map((s) => [single.id, s.id, s.name, turmaById.get(s.id) ?? '', s.phone_number, ''])),
          )
        }}
        plan={(table) => {
          const p = planPasswords(table, { institutionId: single?.id ?? '', students: students.rows })
          return {
            data: p,
            preview: {
              confirmTitle: 'Alterar senhas em massa?',
              confirmText: `${plural(p.items.length, 'senha será alterada', 'senhas serão alteradas')}, ${p.unchanged} ${
                p.unchanged === 1 ? 'fica' : 'ficam'
              } como ${p.unchanged === 1 ? 'está' : 'estão'}. As senhas antigas deixam de funcionar.`,
              warning: 'Essa ação não pode ser desfeita.',
              actionable: p.items.length,
              issues: p.issues,
            },
          }
        }}
        apply={async (p) => {
          const r = await setPasswordsBulk(p.items)
          if (single) await load(single.id)
          return {
            summary: `${plural(r.done, 'senha alterada', 'senhas alteradas')}, ${p.unchanged} sem mudança.`,
            issues: r.issues,
          }
        }}
        actionLabel="Alterar senhas"
        confirmLabel="Alterar senhas"
      />

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
                <th>Turma</th>
                <th>ID Aluno</th>
                <th>Telefone</th>
                <th>E-mail</th>
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
                  <td>{na(turmaById.get(l.row.id) || null)}</td>
                  <td className="num">{na(l.code)}</td>
                  <td>{na(l.row.phone_number)}</td>
                  <td>{na(emailById.get(l.row.id))}</td>
                  <td>
                    <PasswordCell
                      password={pendingPw.get(l.row.id) ?? l.row.password}
                      pending={pendingPw.has(l.row.id)}
                      generating={false}
                      saving={savingPw}
                      legacyHint={l.row.has_password_hash ? 'Senha anterior sem revelação. Gere uma nova senha.' : undefined}
                      onGenerate={() => setConfirm({ kind: 'one', id: l.row.id, name: l.row.name })}
                      onSave={(next) => saveTyped(l.row.id, next)}
                    />
                  </td>
                </tr>
              ))}
              {!single ? (
                <tr>
                  <td colSpan={6} className="gx-table__empty">
                    Selecione uma instituição no filtro do topo.
                  </td>
                </tr>
              ) : filtered.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="gx-table__empty">
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
        onConfirm={() => confirm?.kind === 'one' && runRegenerate(confirm.id)}
      />
    </div>
  )
}
