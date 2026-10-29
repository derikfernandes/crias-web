import { useEffect, useState } from 'react'
import { DeletarDialog, Dialog, Icon, ScrollX } from '../../design/gx/ui'
import { draftValid, sendPasswordReset, type UserDraft } from '../../lib/adminUsersOps'
import type { AdminUser } from '../../types/adminUser'
import { profileOf } from '../../lib/adminProfiles'

export type UserRowModel = {
  /** Id do documento; vazio em usuário novo. */
  id: string
  isNew: boolean
  draft: UserDraft
}

export function rowFromUser(u: AdminUser): UserRowModel {
  return {
    id: u.id,
    isNew: false,
    draft: {
      email: u.email,
      name: u.name ?? '',
      phone: u.phone_number ?? '',
      loginIdentifier: u.login_identifier,
      profile: profileOf(u),
      institutionIds: u.institution_ids,
      active: u.active,
    },
  }
}

type Option = { value: string; label: string }

/**
 * Tabela de usuários (orientações 15 e 16): nome, e-mail, telefone, perfil, senha e ações.
 * Usuário novo entra no topo e só grava em Salvar (nome e e-mail válidos). Excluir pede DELETAR.
 */
export function UsersTable({
  rows,
  profileOptions,
  institutionOptions,
  showInstitution,
  canEdit,
  edits,
  onChangeDraft,
  onSave,
  onDelete,
  onDiscardNew,
}: {
  rows: UserRowModel[]
  profileOptions: Option[]
  /** Aba Instituições: instituição do usuário. */
  institutionOptions?: Option[]
  showInstitution?: boolean
  /** Modo de edição ligado (botão Editar ao lado do título). Só aí os campos e o Excluir liberam. */
  canEdit: boolean
  /** Alterações pendentes das linhas já salvas (id -> valores). Quem grava é o Salvar do topo. */
  edits: Map<string, UserDraft>
  onChangeDraft: (row: UserRowModel, draft: UserDraft) => void
  /** Só para usuário novo: Salvar da própria linha. */
  onSave: (row: UserRowModel, draft: UserDraft) => Promise<void>
  onDelete: (row: UserRowModel) => Promise<void>
  onDiscardNew: (row: UserRowModel) => void
}) {
  return (
    <ScrollX>
      <table className="gx-table" style={{ minWidth: showInstitution ? 1180 : 1000 }}>
        <thead>
          <tr>
            {showInstitution ? <th>Instituição</th> : null}
            <th style={{ minWidth: 240 }}>Nome</th>
            <th style={{ minWidth: 300 }}>E-mail</th>
            <th>Telefone</th>
            <th>Perfil</th>
            <th>Senha</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Row
              key={r.isNew ? `new-${r.draft.email || 'x'}-${r.id}` : r.id}
              row={r}
              profileOptions={profileOptions}
              institutionOptions={institutionOptions}
              showInstitution={showInstitution}
              canEdit={canEdit}
              edit={edits.get(r.id)}
              onChangeDraft={onChangeDraft}
              onSave={onSave}
              onDelete={onDelete}
              onDiscardNew={onDiscardNew}
            />
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={showInstitution ? 7 : 6} className="gx-table__empty">
                Nenhum usuário.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </ScrollX>
  )
}

function Row({
  row,
  profileOptions,
  institutionOptions,
  showInstitution,
  canEdit,
  edit,
  onChangeDraft,
  onSave,
  onDelete,
  onDiscardNew,
}: {
  row: UserRowModel
  profileOptions: Option[]
  institutionOptions?: Option[]
  showInstitution?: boolean
  canEdit: boolean
  edit?: UserDraft
  onChangeDraft: (row: UserRowModel, draft: UserDraft) => void
  onSave: (row: UserRowModel, draft: UserDraft) => Promise<void>
  onDelete: (row: UserRowModel) => Promise<void>
  onDiscardNew: (row: UserRowModel) => void
}) {
  // Linha nova: rascunho local, com Salvar e Cancelar na linha. Linha salva: o rascunho vem do pai.
  const [localDraft, setLocalDraft] = useState(row.draft)
  const draft = row.isNew ? localDraft : (edit ?? row.draft)
  const setDraft = (fn: (d: UserDraft) => UserDraft) => {
    const next = fn(draft)
    if (row.isNew) setLocalDraft(next)
    else onChangeDraft(row, next)
  }
  const [busy, setBusy] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [resetMsg, setResetMsg] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => setLocalDraft(row.draft), [row.draft])

  const valid = draftValid(draft, Boolean(showInstitution))
  const set = (patch: Partial<UserDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const editable = row.isNew || canEdit
  const field = { className: 'gx-input', style: { height: 36 }, disabled: !editable || busy }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await onSave(row, draft)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <tr>
      {showInstitution ? (
        <td style={{ minWidth: 200 }}>
          {row.isNew || canEdit ? (
            <select
              className="gx-select"
              style={{ height: 36 }}
              aria-label="Instituição"
              value={draft.institutionIds[0] ?? ''}
              disabled={!canEdit || busy}
              onChange={(e) => set({ institutionIds: e.target.value ? [e.target.value] : [] })}
            >
              <option value="">Escolha</option>
              {(institutionOptions ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            (institutionOptions ?? []).find((o) => o.value === draft.institutionIds[0])?.label ?? 'N/A'
          )}
        </td>
      ) : null}
      <td>
        <input
          {...field}
          aria-label="Nome"
          placeholder="Nome"
          style={{ ...field.style, minWidth: 220 }}
          value={draft.name ?? ''}
          onChange={(e) => set({ name: e.target.value })}
        />
      </td>
      <td>
        <input
          {...field}
          style={{ ...field.style, minWidth: 250, color: 'var(--v-ink)', fontWeight: 600, opacity: 1 }}
          className={`${field.className} gx-user-email`}
          type="email"
          aria-label="E-mail"
          placeholder="E-mail"
          value={draft.email}
          disabled={!editable || busy || !row.isNew}
          onChange={(e) => set({ email: e.target.value })}
        />
      </td>
      <td>
        <input
          {...field}
          aria-label="Telefone"
          placeholder="Telefone"
          style={{ ...field.style, minWidth: 160 }}
          value={draft.phone ?? ''}
          onChange={(e) => set({ phone: e.target.value })}
        />
        {draft.email.trim() && (draft.phone ?? '').replace(/\D/g, '') ? (
          <select
            className="gx-select"
            style={{ height: 32, marginTop: 6, fontSize: 12 }}
            aria-label="Entrar com (vale para a senha)"
            title="Entrar com (vale para a senha)"
            value={draft.loginIdentifier ?? 'phone'}
            disabled={!editable || busy}
            onChange={(e) => set({ loginIdentifier: e.target.value as 'phone' | 'email' })}
          >
            <option value="phone">Entra com telefone</option>
            <option value="email">Entra com e-mail</option>
          </select>
        ) : null}
      </td>
      <td>
        <select className="gx-select" style={{ height: 36, minWidth: 140 }} aria-label="Perfil" value={draft.profile} disabled={!editable || busy} onChange={(e) => set({ profile: e.target.value as UserDraft['profile'] })}>
          {profileOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td style={{ whiteSpace: 'nowrap' }}>
        {row.isNew ? (
          <span className="gx-muted">Definida pelo e-mail de acesso</span>
        ) : (
          <>
            <button type="button" className="gx-btn gx-btn--sm" disabled={busy || !draft.email.trim()} onClick={() => setResetOpen(true)}>
              Redefinir senha
            </button>
            {resetMsg ? <span className="gx-muted" role="status" style={{ marginLeft: 8 }}>{resetMsg}</span> : null}
          </>
        )}
      </td>
      <td style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, alignItems: 'center' }}>
          {error ? <span style={{ color: 'var(--v-err)', fontSize: 12 }}>{error}</span> : null}
          {row.isNew ? (
            <button type="button" className="gx-btn gx-btn--primary gx-btn--sm" disabled={!valid || busy} onClick={() => void save()}>
              Salvar
            </button>
          ) : null}
          {row.isNew ? (
            <button type="button" className="gx-btn gx-btn--sm" onClick={() => onDiscardNew(row)}>
              Cancelar
            </button>
          ) : (
            <button type="button" className="gx-btn gx-btn--icon gx-btn--ghost" aria-label={`Excluir ${draft.email || draft.phone}`} title="Excluir" onClick={() => setDelOpen(true)}>
              <Icon name="trash" />
            </button>
          )}
        </div>
        <DeletarDialog
          open={delOpen}
          title="Deseja mesmo excluir o usuário?"
          busy={busy}
          onCancel={() => setDelOpen(false)}
          onConfirm={() => {
            setBusy(true)
            void onDelete(row)
              .then(() => setDelOpen(false))
              .catch((e) => setError(e instanceof Error ? e.message : 'Não foi possível excluir.'))
              .finally(() => setBusy(false))
          }}
        />
        <Dialog
          open={resetOpen}
          title="Redefinir a senha?"
          onClose={() => setResetOpen(false)}
          actions={
            <>
              <button type="button" className="gx-btn" onClick={() => setResetOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="gx-btn gx-btn--primary"
                onClick={() => {
                  setResetOpen(false)
                  void sendPasswordReset(draft.email)
                    .then(() => setResetMsg('E-mail enviado.'))
                    .catch((e) => setError(e instanceof Error ? e.message : 'Não foi possível enviar o e-mail.'))
                }}
              >
                Enviar e-mail
              </button>
            </>
          }
        >
          <p>Enviamos um e-mail para {draft.email} com o link para criar uma nova senha de acesso à Gestão.</p>
        </Dialog>
      </td>
    </tr>
  )
}
