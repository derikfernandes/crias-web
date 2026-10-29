import { useMemo, useState } from 'react'
import { BulkPanel } from '../../components/BulkPanel'
import { planUsersAdd, planUsersRemove, plural } from '../../lib/bulkActions'
import { deleteAdminUser, saveAdminUser } from '../../lib/adminUsersOps'
import { downloadText, toCsv } from '../../lib/tableFiles'
import type { AdminUser } from '../../types/adminUser'

const ADD_COLUMNS = [
  'ID Instituição (obrigatório)',
  'Nome (obrigatório)',
  'Telefone (obrigatório, ou e-mail)',
  'E-mail (obrigatório, ou telefone)',
  'Perfil (Admin / Básico)',
  'Senha (opcional)',
]
const REMOVE_COLUMNS = ['ID Instituição', 'Nome (visualização)', 'Telefone (visualização)', 'E-mail', 'Remover (sim / não)']
const ADD_CROSS_COLUMNS = ADD_COLUMNS.slice(1)

/**
 * Adicionar e remover usuários em massa (INTERFACE.md 1.1.1.b, D). Na aba Crias não há instituição; na aba
 * Instituições (Super admin) a pessoa escolhe a instituição da importação; a escola usa a própria.
 * A senha do login é do Firebase Auth: a coluna é aceita no modelo, mas o usuário define a senha pelo e-mail
 * de redefinição (não é gravada aqui).
 */
export function UsersBulk({
  scope,
  users,
  institutions,
  fixedInstitutionId,
  ownEmail,
}: {
  scope: 'crias' | 'institution'
  /** Usuários já cadastrados que valem para esta aba (para evitar repetidos e achar quem remover). */
  users: AdminUser[]
  /** Instituições para escolher (Super admin, aba Instituições). */
  institutions?: Array<{ id: string; name: string }>
  /** Escola logada: instituição fixa. */
  fixedInstitutionId?: string | null
  ownEmail: string | null
}) {
  const [picked, setPicked] = useState('')
  const institutionId = scope === 'crias' ? null : fixedInstitutionId || picked || null
  const needsPick = scope === 'institution' && !fixedInstitutionId
  const blocked = scope === 'institution' && !institutionId
  const hint = 'Escolha a instituição da planilha.'

  const scoped = useMemo(
    () => (institutionId ? users.filter((u) => u.institution_ids.includes(institutionId)) : users),
    [users, institutionId],
  )
  const existingEmails = useMemo(
    () => new Set(users.map((u) => (u.email ? u.email.toLowerCase() : `tel:${(u.phone_number ?? '').replace(/\D/g, '')}`))),
    [users],
  )

  const picker = needsPick ? (
    <label className="gx-field" style={{ maxWidth: 360 }}>
      <span>Instituição da planilha</span>
      <select className="gx-select" value={picked} onChange={(e) => setPicked(e.target.value)} aria-label="Instituição da planilha">
        <option value="">Selecione</option>
        {(institutions ?? []).map((i) => (
          <option key={i.id} value={i.id}>
            {i.name || i.id}
          </option>
        ))}
      </select>
    </label>
  ) : null

  const instCell = institutionId ?? ''
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <BulkPanel
        title="Adicionar usuários em massa"
        subtitle="Cadastre vários usuários de uma vez com uma planilha"
        columns={scope === 'crias' ? ADD_CROSS_COLUMNS : ADD_COLUMNS}
        note="Nome obrigatório e telefone ou e-mail (o acesso ao painel é por um dos dois). Perfil: Admin ou Básico. Usuários cujo e-mail já está cadastrado ficam de fora. A senha é definida pelo próprio usuário, pelo e-mail de redefinição."
        baseLabel="Baixar planilha modelo"
        disabled={blocked}
        disabledHint={hint}
        extra={picker}
        onDownload={() =>
          downloadText('modelo-adicionar-usuarios.csv', toCsv(scope === 'crias' ? ADD_CROSS_COLUMNS : ADD_COLUMNS, [scope === 'crias' ? ['', '', '', '', ''] : [instCell, '', '', '', '', '']]))
        }
        plan={(rows) => {
          const p = planUsersAdd(rows, { institutionId, existingEmails })
          return {
            data: p,
            preview: {
              confirmTitle: 'Adicionar usuários em massa?',
              confirmText: `${plural(p.items.length, 'usuário será adicionado', 'usuários serão adicionados')}${
                p.alreadyRegistered > 0 ? `, ${p.alreadyRegistered} já cadastrado${p.alreadyRegistered === 1 ? '' : 's'} fica${p.alreadyRegistered === 1 ? '' : 'm'} de fora` : ''
              }.`,
              actionable: p.items.length,
              issues: p.issues,
            },
          }
        }}
        apply={async (p) => {
          let done = 0
          const issues: Array<{ line: number; ref: string; error: string }> = []
          for (const u of p.items) {
            try {
              await saveAdminUser(
                { email: u.email, name: u.name, phone: u.phone, profile: u.profile, institutionIds: institutionId ? [institutionId] : [], active: true },
                scope,
                true,
              )
              done += 1
            } catch (e) {
              issues.push({ line: u.line, ref: u.email, error: e instanceof Error ? e.message : 'Não foi possível salvar o usuário.' })
            }
          }
          return {
            summary: `${plural(done, 'usuário adicionado', 'usuários adicionados')}${
              p.alreadyRegistered > 0 ? `, ${p.alreadyRegistered} já cadastrado${p.alreadyRegistered === 1 ? '' : 's'} (de fora)` : ''
            }.`,
            issues,
          }
        }}
        actionLabel="Adicionar"
        confirmLabel="Adicionar"
      />

      <BulkPanel
        title="Remover usuários em massa"
        subtitle="Remova vários usuários de uma vez com uma planilha"
        columns={scope === 'crias' ? REMOVE_COLUMNS.slice(1) : REMOVE_COLUMNS}
        note="Remoção a partir do e-mail do usuário."
        baseLabel="Baixar planilha base"
        tone="red"
        disabled={blocked}
        disabledHint={hint}
        extra={picker}
        onDownload={() =>
          downloadText(
            'base-remover-usuarios.csv',
            toCsv(
              scope === 'crias' ? REMOVE_COLUMNS.slice(1) : REMOVE_COLUMNS,
              [...scoped]
                .sort((a, b) => a.email.localeCompare(b.email, 'pt-BR'))
                .map((u) =>
                  scope === 'crias'
                    ? [u.name ?? '', u.phone_number ?? '', u.email, 'não']
                    : [instCell, u.name ?? '', u.phone_number ?? '', u.email, 'não'],
                ),
            ),
          )
        }
        plan={(rows) => {
          const p = planUsersRemove(rows, {
            users: scoped.map((u) => ({ id: u.id, email: u.email, phone: u.phone_number, isSuperAdmin: u.is_super_admin })),
            protectedEmails: new Set([...(ownEmail ? [ownEmail] : []), ...(scope === 'institution' ? scoped.filter((u) => u.is_super_admin).map((u) => u.email) : [])]),
          })
          return {
            data: p,
            preview: {
              confirmTitle: 'Remover usuários em massa?',
              confirmText: `${plural(p.items.length, 'usuário será removido', 'usuários serão removidos')}, ${p.unchanged} ${
                p.unchanged === 1 ? 'fica' : 'ficam'
              } como ${p.unchanged === 1 ? 'está' : 'estão'}.`,
              actionable: p.items.length,
              issues: p.issues,
            },
          }
        }}
        apply={async (p) => {
          let done = 0
          const issues: Array<{ line: number; ref: string; error: string }> = []
          for (const { line, user } of p.items) {
            try {
              await deleteAdminUser(user.id)
              done += 1
            } catch (e) {
              issues.push({ line, ref: user.email, error: e instanceof Error ? e.message : 'Não foi possível remover o usuário.' })
            }
          }
          return { summary: `${plural(done, 'usuário removido', 'usuários removidos')}, ${p.unchanged} sem mudança.`, issues }
        }}
        actionLabel="Remover"
        confirmLabel="Remover"
      />
    </div>
  )
}
