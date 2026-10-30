import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { EditBar } from '../components/EditBar'
import { useUnsavedChanges } from '../contexts/UnsavedContext'
import {
  Banner,
  BootSymbol,
  DeletarDialog,
  FilterPopover,
  Icon,
  PageHead,
  ScrollX,
  Switch,
} from '../design/gx/ui'
import { useAuth } from '../hooks/useAuth'
import { useCollection } from '../hooks/useCollection'
import { useGestao } from '../hooks/useGestao'
import { usePermissions } from '../hooks/usePermissions'
import { PROFILE_LABEL, profileOf, type ProfileId } from '../lib/adminProfiles'
import { ADMIN_USERS_COLLECTION, snapshotToAdminUser } from '../lib/adminUserFirestore'
import {
  deleteAdminUser,
  draftValid,
  saveAdminUser,
  sendPasswordReset,
  type UserDraft,
} from '../lib/adminUsersOps'
import { activePillClass } from '../lib/gestaoFormat'
import { snapshotToStudent } from '../lib/studentFirestore'
import { snapshotToStudentTrail } from '../lib/studentTrailFirestore'
import { snapshotToTrail } from '../lib/trailFirestore'
import { joinList, materiasOf, sortTurmas, turmasByTrail, turmasOf } from '../lib/turmas'

const EMPTY: UserDraft = {
  email: '',
  name: '',
  phone: '',
  profile: 'basico',
  institutionIds: [],
  active: true,
  materias: [],
  turmas: [],
  trailIds: [],
}

/**
 * Perfil do usuário de gestão (PA20, INTERFACE.md 1.3.16), no padrão do perfil do aluno:
 * - Cadastro: Nome, Telefone, Senha; E-mail, Perfil, Matérias (no lugar de Escolaridade), Turmas (no lugar de
 *   Nível pedagógico). Lápis para editar; "Usuário ativo" e Excluir (com DELETAR) no modo de edição; Cancelar e
 *   Salvar no topo; sair com alteração pendente pede "Tem certeza que deseja sair?".
 * - Matérias e Turmas no formato dos filtros (lista com pesquisa e marcação). Professor marca; Gestão e Super
 *   admin ficam em "Todas".
 * - Trilhas vinculadas: Matéria, Turma, Trilha, Ativa, Desvincular; "Vincular trilha" lista só trilhas das
 *   matérias do professor.
 * Rotas: /usuarios/:id e /usuarios/novo?escopo=crias|instituicao ("Adicionar usuário" abre em branco).
 */
export function UserProfilePage() {
  const { id = '' } = useParams<{ id: string }>()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const g = useGestao()
  const { user } = useAuth()
  const { hasFullAccess, adminProfile } = usePermissions()
  const isSuper = hasFullAccess || Boolean(adminProfile?.is_super_admin)
  const isNew = id === 'novo'
  const users = useCollection(ADMIN_USERS_COLLECTION, snapshotToAdminUser)
  const trails = useCollection('trails', snapshotToTrail)
  const students = useCollection('students', snapshotToStudent)
  const links = useCollection('student_trails', snapshotToStudentTrail)

  const current = users.rows.find((u) => u.id === decodeURIComponent(id)) ?? null
  const scope: 'crias' | 'institution' = isNew
    ? search.get('escopo') === 'crias'
      ? 'crias'
      : 'institution'
    : current && (current.is_super_admin || current.all_institutions)
      ? 'crias'
      : 'institution'

  const saved: UserDraft = useMemo(() => {
    if (!current) {
      return { ...EMPTY, institutionIds: g.myInstitutionId && !isSuper ? [g.myInstitutionId] : [] }
    }
    return {
      email: current.email,
      name: current.name ?? '',
      phone: current.phone_number ?? '',
      profile: profileOf(current),
      institutionIds: current.institution_ids,
      active: current.active,
      materias: current.materias ?? [],
      turmas: current.turmas ?? [],
      trailIds: current.trail_ids ?? [],
    }
  }, [current, g.myInstitutionId, isSuper])

  const [editing, setEditing] = useState(isNew)
  const [draft, setDraft] = useState<UserDraft>(saved)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [delOpen, setDelOpen] = useState(false)
  const [linkPick, setLinkPick] = useState('')
  useEffect(() => {
    if (!editing) setDraft(saved)
  }, [saved, editing])

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const professor = draft.profile === 'basico'

  const instIds = useMemo(
    () => new Set(draft.institutionIds.length ? draft.institutionIds : [...g.scopedIds]),
    [draft.institutionIds, g.scopedIds],
  )
  const instTrails = useMemo(() => trails.rows.filter((t) => instIds.has(t.institution_id)), [trails.rows, instIds])
  const materiaOptions = materiasOf(instTrails)
  const turmaOptions = turmasOf(students.rows, instIds)
  const turmasTrail = useMemo(() => turmasByTrail(links.rows, students.rows), [links.rows, students.rows])
  const linked = instTrails.filter((t) => (draft.trailIds ?? []).includes(t.id))
  const linkable = instTrails.filter(
    (t) => !(draft.trailIds ?? []).includes(t.id) && (draft.materias ?? []).includes((t.subject ?? '').trim()),
  )

  async function persist() {
    const needsInstitution = scope === 'institution'
    if (!draftValid(draft, needsInstitution)) {
      throw new Error(
        needsInstitution && draft.institutionIds.length === 0
          ? 'Escolha a instituição do usuário.'
          : 'Informe o nome e o e-mail ou o telefone.',
      )
    }
    const newId = await saveAdminUser(draft, scope, isNew)
    setEditing(false)
    setNotice('Usuário salvo.')
    if (isNew) navigate(`/usuarios/${encodeURIComponent(newId)}`, { replace: true })
  }
  async function save() {
    setBusy(true)
    setError(null)
    try {
      await persist()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }
  useUnsavedChanges(dirty && !busy, persist)

  if (!users.ready || !trails.ready || g.institutionsLoading) return <BootSymbol />
  if (!isNew && !current) {
    return (
      <div className="gx-page">
        <PageHead title="Usuário não encontrado" subtitle="O usuário não existe ou foi excluído." />
      </div>
    )
  }

  const own = Boolean(current && user?.email && current.email === user.email.toLowerCase())
  const title = isNew ? draft.name?.trim() || 'Novo usuário' : saved.name?.trim() || saved.email || 'Usuário'
  const profileOptions: ProfileId[] = scope === 'crias' && isSuper ? ['super', 'admin', 'basico'] : ['admin', 'basico']
  const set = (patch: Partial<UserDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const ro = !editing

  return (
    <div className="gx-page">
      <PageHead
        title={title}
        titleAction={
          <EditBar
            dirty={dirty || (isNew && editing)}
            busy={busy}
            onSave={save}
            onCancel={() => {
              setDraft(saved)
              setError(null)
              if (isNew) navigate(-1)
              else setEditing(false)
            }}
          />
        }
      />
      {error ? <Banner>{error}</Banner> : null}
      {notice ? <Banner tone="ok">{notice}</Banner> : null}

      <section className="gx-card" aria-label="Cadastro">
        <div className="gx-card__head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2>Cadastro</h2>
            {ro ? (
              <button type="button" className="gx-btn gx-btn--icon gx-btn--ghost" aria-label="Editar cadastro do usuário" title="Editar" onClick={() => setEditing(true)}>
                <Icon name="pencil" size={14} />
              </button>
            ) : null}
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <Switch checked={draft.active} label="Usuário ativo" disabled={ro} onChange={(v) => set({ active: v })} />
            {editing && !isNew && !own ? (
              <button type="button" className="gx-btn gx-btn--danger-line" disabled={busy} onClick={() => setDelOpen(true)}>
                Excluir
              </button>
            ) : null}
          </span>
        </div>
        <div className="gx-grid">
          <label className="gx-field">
            <span>Nome</span>
            <input className="gx-input" value={draft.name ?? ''} readOnly={ro} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <label className="gx-field">
            <span>Telefone</span>
            <input className="gx-input" type="tel" value={draft.phone ?? ''} readOnly={ro} onChange={(e) => set({ phone: e.target.value })} />
          </label>
          <div className="gx-field">
            <span>Senha</span>
            {/* CONFLITO 1.3.16: a senha do login da Educação é do Firebase Auth; aqui só o pedido de redefinição. */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="gx-input" value="••••••••" readOnly tabIndex={-1} aria-label="Senha" style={{ flex: 1 }} />
              {editing && !isNew && draft.email ? (
                <button
                  type="button"
                  className="gx-btn"
                  disabled={busy}
                  onClick={() =>
                    void sendPasswordReset(draft.email)
                      .then(() => setNotice('E-mail de redefinição de senha enviado.'))
                      .catch((e) => setError(e instanceof Error ? e.message : 'Não foi possível enviar.'))
                  }
                >
                  Redefinir
                </button>
              ) : null}
            </div>
          </div>
          <label className="gx-field">
            <span>
              E-mail <span className="gx-muted">(opcional)</span>
            </span>
            <input className="gx-input" type="email" value={draft.email} readOnly={ro || !isNew} onChange={(e) => set({ email: e.target.value })} />
          </label>
          <label className="gx-field">
            <span>Perfil</span>
            {ro ? (
              <input className="gx-input" value={PROFILE_LABEL[draft.profile]} readOnly tabIndex={-1} />
            ) : (
              <select className="gx-select" value={draft.profile} onChange={(e) => set({ profile: e.target.value as ProfileId })}>
                {profileOptions.map((p) => (
                  <option key={p} value={p}>
                    {PROFILE_LABEL[p]}
                  </option>
                ))}
              </select>
            )}
          </label>
          <div className="gx-field">
            <span>Matérias</span>
            {ro || !professor ? (
              <input className="gx-input" value={professor ? joinList(draft.materias) : 'Todas'} readOnly tabIndex={-1} />
            ) : (
              <FilterPopover
                variant="field"
                align="left"
                label={joinList(draft.materias, 'Escolha as matérias')}
                options={materiaOptions.map((m) => ({ id: m, name: m }))}
                selected={new Set(draft.materias ?? [])}
                onChange={(n) => set({ materias: sortTurmas(n) })}
                emptyText="Nenhuma matéria encontrada."
              />
            )}
          </div>
          <div className="gx-field">
            <span>Turmas</span>
            {ro || !professor ? (
              <input className="gx-input" value={professor ? joinList(draft.turmas) : 'Todas'} readOnly tabIndex={-1} />
            ) : (
              <FilterPopover
                variant="field"
                align="left"
                label={joinList(draft.turmas, 'Escolha as turmas')}
                options={turmaOptions.map((t) => ({ id: t, name: t }))}
                selected={new Set(draft.turmas ?? [])}
                onChange={(n) => set({ turmas: sortTurmas(n) })}
                emptyText="Nenhuma turma encontrada."
              />
            )}
          </div>
          {scope === 'institution' && isSuper ? (
            <label className="gx-field">
              <span>Instituição</span>
              {ro ? (
                <input className="gx-input" value={draft.institutionIds.map(g.institutionName).join(', ') || 'N/A'} readOnly tabIndex={-1} />
              ) : (
                <select className="gx-select" value={draft.institutionIds[0] ?? ''} onChange={(e) => set({ institutionIds: e.target.value ? [e.target.value] : [] })}>
                  <option value="">Selecione…</option>
                  {g.institutions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name || i.id}
                    </option>
                  ))}
                </select>
              )}
            </label>
          ) : null}
        </div>
        {!professor ? <p className="gx-muted">Gestão e Super admin veem todas as matérias e turmas da instituição.</p> : null}
      </section>

      <section className="gx-card" aria-label="Trilhas vinculadas">
        <div>
          <h2>Trilhas vinculadas</h2>
          <p className="gx-muted">
            {professor
              ? 'Trilhas que este professor acompanha. Só aparecem trilhas das matérias dele.'
              : 'Gestão e Super admin acessam todas as trilhas da instituição.'}
          </p>
        </div>
        <ScrollX>
          <table className="gx-table">
            <thead>
              <tr>
                <th>Matéria</th>
                <th>Turma</th>
                <th>Trilha</th>
                <th>Ativa</th>
                <th aria-label="Desvincular" />
              </tr>
            </thead>
            <tbody>
              {professor
                ? linked.map((t) => (
                    <tr key={t.id}>
                      <td>{t.subject || 'N/A'}</td>
                      <td>{joinList(turmasTrail.get(t.id))}</td>
                      <td>
                        <strong>{t.name || t.id}</strong>
                      </td>
                      <td>
                        <span className={activePillClass(t.active)}>{t.active ? 'Sim' : 'Não'}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {editing ? (
                          <button
                            type="button"
                            className="gx-btn gx-btn--soft-red"
                            onClick={() => set({ trailIds: (draft.trailIds ?? []).filter((x) => x !== t.id) })}
                          >
                            Desvincular
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                : null}
              {!professor || linked.length === 0 ? (
                <tr>
                  <td colSpan={5} className="gx-table__empty">
                    Nenhuma trilha vinculada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </ScrollX>
        {professor && editing ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
            <label className="gx-field" style={{ flex: '1 1 260px' }}>
              <span>Vincular trilha</span>
              <select className="gx-select" value={linkPick} onChange={(e) => setLinkPick(e.target.value)}>
                <option value="">{linkable.length ? 'Selecione' : 'Nenhuma trilha disponível'}</option>
                {linkable.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.id}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="gx-btn gx-btn--soft-green"
              disabled={!linkPick}
              onClick={() => {
                set({ trailIds: [...(draft.trailIds ?? []), linkPick] })
                setLinkPick('')
              }}
            >
              Vincular trilha
            </button>
          </div>
        ) : null}
      </section>

      <DeletarDialog
        open={delOpen}
        title="Deseja mesmo excluir o usuário?"
        busy={busy}
        onCancel={() => setDelOpen(false)}
        onConfirm={() => {
          if (!current) return
          setBusy(true)
          void deleteAdminUser(current.id)
            .then(() => navigate('/usuarios', { replace: true }))
            .catch((e) => {
              setError(e instanceof Error ? e.message : 'Não foi possível excluir.')
              setBusy(false)
              setDelOpen(false)
            })
        }}
      />
    </div>
  )
}
