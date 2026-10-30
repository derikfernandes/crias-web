import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScrollX, SortHead, sortRows, type SortState } from '../../design/gx/ui'
import { PROFILE_LABEL, profileOf } from '../../lib/adminProfiles'
import { activePillClass } from '../../lib/gestaoFormat'
import { joinList } from '../../lib/turmas'
import type { AdminUser } from '../../types/adminUser'

/**
 * Tabela de usuários (INTERFACE.md 1.3.15), no formato da tabela de Alunos: só leitura, cabeçalho ordenável,
 * pesquisa por nome, telefone ou e-mail, Nome em negrito abre o perfil (PA20) e "Abrir" no fim.
 * Colunas: [Instituição], Nome, Matérias, Turmas, Perfil, E-mail, Telefone, Ativo. Gestão e Super admin: "Todas".
 * Senha e Excluir ficam no perfil do usuário.
 */
export function UsersReadTable({
  users,
  showInstitution,
  institutionName,
  addHref,
  title = 'Cadastros',
  tabs,
}: {
  users: AdminUser[]
  showInstitution?: boolean
  institutionName?: (id: string) => string
  /** "Adicionar usuário" abre o perfil em branco. */
  addHref?: string
  title?: string
  /** Abas (Super admin: Crias e Instituições), logo abaixo do título. */
  tabs?: React.ReactNode
}) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortState | null>({ key: 'name', dir: 'asc' })
  const lines = useMemo(
    () =>
      users.map((u) => {
        const p = profileOf(u)
        const all = p !== 'basico'
        return {
          u,
          name: u.name?.trim() || u.email || u.phone_number || u.id,
          materias: all ? 'Todas' : joinList(u.materias),
          turmas: all ? 'Todas' : joinList(u.turmas),
          perfil: PROFILE_LABEL[p],
          inst: institutionName ? u.institution_ids.map(institutionName).join(', ') : '',
        }
      }),
    [users, institutionName],
  )
  const needle = q.trim().toLowerCase()
  const digits = q.replace(/\D/g, '')
  const rows = sortRows(
    lines.filter(
      (l) =>
        !needle ||
        l.name.toLowerCase().includes(needle) ||
        (l.u.email || '').toLowerCase().includes(needle) ||
        (digits.length > 0 && (l.u.phone_number ?? '').replace(/\D/g, '').includes(digits)),
    ),
    sort,
    (l, k) =>
      k === 'name' ? l.name : k === 'inst' ? l.inst : k === 'materias' ? l.materias : k === 'turmas' ? l.turmas : k === 'perfil' ? l.perfil : k === 'email' ? l.u.email : k === 'phone' ? (l.u.phone_number ?? '') : k === 'active' ? (l.u.active ? 'Sim' : 'Não') : '',
  )
  const head = (label: string, key: string) => <SortHead label={label} sortKey={key} sort={sort} onSort={setSort} />
  return (
    <section className="gx-card" aria-label={title} style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '24px 24px 20px' }}>
        <h2>{title}</h2>
        {tabs}
        <div className="gx-filters" role="group" aria-label="Filtros" style={{ marginTop: 0 }}>
          <span className="gx-filters__label">Filtros</span>
          <label className="gx-filters__item gx-searchfield">
            <span className="visually-hidden">Pesquisar nome, telefone ou e-mail</span>
            <input
              className="gx-input"
              type="search"
              value={q}
              placeholder="Pesquisar nome, telefone ou e-mail"
              onChange={(e) => setQ(e.target.value)}
              autoComplete="off"
            />
          </label>
          {addHref ? (
            <Link to={addHref} className="gx-btn gx-btn--primary">
              Adicionar usuário
            </Link>
          ) : null}
        </div>
      </div>
      <ScrollX>
        <table className="gx-table">
          <thead>
            <tr>
              {showInstitution ? head('Instituição', 'inst') : null}
              {head('Nome', 'name')}
              {head('Matérias', 'materias')}
              {head('Turmas', 'turmas')}
              {head('Perfil', 'perfil')}
              {head('E-mail', 'email')}
              {head('Telefone', 'phone')}
              {head('Ativo', 'active')}
              <th aria-label="Abrir" />
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.u.id}>
                {showInstitution ? <td data-fade="1">{l.inst || 'N/A'}</td> : null}
                <td>
                  <Link to={`/usuarios/${encodeURIComponent(l.u.id)}`} className="gx-tablelink">
                    <strong>{l.name}</strong>
                  </Link>
                </td>
                <td>{l.materias}</td>
                <td>{l.turmas}</td>
                <td>{l.perfil}</td>
                <td>{l.u.email || 'N/A'}</td>
                <td>{l.u.phone_number || 'N/A'}</td>
                <td>
                  <span className={activePillClass(l.u.active)}>{l.u.active ? 'Sim' : 'Não'}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Link to={`/usuarios/${encodeURIComponent(l.u.id)}`} className="gx-btn gx-btn--open">
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={showInstitution ? 9 : 8} className="gx-table__empty">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </ScrollX>
    </section>
  )
}
