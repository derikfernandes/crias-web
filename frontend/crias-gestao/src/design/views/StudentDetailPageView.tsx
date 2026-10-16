import { Link } from 'react-router-dom'
import type { StudentDetailPageViewProps } from '../types/studentDetailPageView'
import { Banner, BootSymbol, PageHead, ScrollX } from '../gx/ui'
import { STATUS_LABEL, statusPillClass } from '../../lib/gestaoFormat'
import type { StudentTrailStatus } from '../../types/studentTrail'

export type {
  StudentDetailTrailRow,
  StudentDetailLinkableTrail,
  StudentDetailPageViewProps,
} from '../types/studentDetailPageView'

const STATUSES: StudentTrailStatus[] = ['not_started', 'in_progress', 'completed', 'blocked']

/** Aluno (PA07): cadastro, trilhas vinculadas e histórico de conversa com o monitor. */
export function StudentDetailPageView(props: StudentDetailPageViewProps) {
  if (props.status === 'missing-id') {
    return (
      <div className="gx-page">
        <PageHead title="Aluno" />
        <Banner>ID ausente na URL.</Banner>
      </div>
    )
  }
  const p = props

  if (p.loading) return <BootSymbol />

  return (
    <div className="gx-page">
      <PageHead title="Aluno" subtitle="Cadastro, trilhas vinculadas e conversa com o monitor." />
      {p.error ? <Banner>{p.error}</Banner> : null}
      {p.notFound ? <Banner>Registro não encontrado.</Banner> : p.formSlot}

      <section className="gx-card" aria-label="Trilhas vinculadas">
        <div>
          <h2>Trilhas vinculadas</h2>
          <p className="gx-muted">
            Trilhas em que este aluno tem progresso. Você pode vincular trilhas da mesma instituição.
            {p.loadingTrails ? ' Carregando progresso…' : ''}
          </p>
        </div>
        {p.trailsError ? <Banner>{p.trailsError}</Banner> : null}
        {p.editError ? <Banner>{p.editError}</Banner> : null}
        {p.trailRows.length > 0 ? (
          <div style={{ border: '1px solid var(--v-soft2)', borderRadius: 12, overflow: 'hidden' }}>
            <ScrollX>
              <table className="gx-table">
                <thead>
                  <tr>
                    <th>Trilha</th>
                    <th>Atividade atual</th>
                    <th>Etapa atual</th>
                    <th>Status</th>
                    <th>Início</th>
                    <th>Última interação</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {p.trailRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link to={row.trailHref} style={{ color: 'var(--v-ink)', fontWeight: 700 }}>
                          {row.trailLabel}
                        </Link>
                        {row.inactiveHint ? <div className="gx-muted" style={{ fontSize: 12 }}>inativa</div> : null}
                      </td>
                      <td>
                        {row.isEditing ? (
                          <input className="gx-input" type="number" min={1} step={1} value={p.editQuestion} style={{ width: 96 }} disabled={p.editBusy} onChange={(e) => p.onEditQuestionChange(e.target.value)} />
                        ) : (
                          row.questionDisplay
                        )}
                      </td>
                      <td>
                        {row.isEditing ? (
                          <input className="gx-input" type="number" min={1} step={1} value={p.editStage} style={{ width: 96 }} disabled={p.editBusy} onChange={(e) => p.onEditStageChange(e.target.value)} />
                        ) : (
                          row.stageDisplay
                        )}
                      </td>
                      <td>
                        {row.isEditing ? (
                          <select className="gx-select" value={p.editStatus} disabled={p.editBusy} onChange={(e) => p.onEditStatusChange(e.target.value)}>
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABEL[s]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={statusPillClass(row.status as StudentTrailStatus)}>
                            {STATUS_LABEL[row.status as StudentTrailStatus] ?? row.status}
                          </span>
                        )}
                      </td>
                      <td>{row.startedAtLabel}</td>
                      <td>{row.lastInteractionAtLabel}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {row.isEditing ? (
                            <>
                              <button type="button" className="gx-btn gx-btn--primary gx-btn--sm" disabled={p.editBusy} onClick={() => p.onSaveTrailPosition(row.id)}>
                                {p.editBusy ? 'Salvando…' : 'Salvar'}
                              </button>
                              <button type="button" className="gx-btn gx-btn--sm" disabled={p.editBusy} onClick={p.onCancelEditTrail}>
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <button type="button" className="gx-btn gx-btn--sm" disabled={p.editBusy} onClick={() => p.onStartEditTrail(row.id)}>
                              Editar
                            </button>
                          )}
                          <button type="button" className="gx-btn gx-btn--sm" style={{ color: 'var(--v-err)' }} disabled={p.editBusy} onClick={() => p.onUnlinkTrail(row.id)}>
                            Desvincular
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
          </div>
        ) : (
          <p className="gx-muted">Nenhuma trilha vinculada ainda. Use o formulário abaixo para vincular.</p>
        )}

        {p.hasStudent ? (
          p.missingInstitutionId ? (
            <Banner>Este aluno não tem instituição. Defina a instituição no cadastro antes de vincular trilhas.</Banner>
          ) : (
            <form className="gx-callout" onSubmit={p.onLinkTrailSubmit} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <h3 style={{ flexBasis: '100%', fontSize: 16 }}>Vincular nova trilha</h3>
              {p.institutionTrailsError ? <Banner>{p.institutionTrailsError}</Banner> : null}
              {p.linkError ? <Banner>{p.linkError}</Banner> : null}
              <label className="gx-field" style={{ flex: 1, minWidth: 220 }}>
                <span>Trilha</span>
                <select className="gx-select" value={p.linkTrailId} onChange={(e) => p.onLinkTrailIdChange(e.target.value)} disabled={p.linkBusy || p.loadingInstitutionTrails || p.linkableTrails.length === 0}>
                  <option value="">
                    {p.loadingInstitutionTrails ? 'Carregando trilhas…' : p.linkableTrails.length === 0 ? 'Nenhuma trilha disponível' : 'Selecione'}
                  </option>
                  {p.linkableTrails.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="gx-field" style={{ minWidth: 180 }}>
                <span>Status inicial</span>
                <select className="gx-select" value={p.linkStatus} onChange={(e) => p.onLinkStatusChange(e.target.value)} disabled={p.linkBusy}>
                  <option value="not_started">{STATUS_LABEL.not_started}</option>
                  <option value="in_progress">{STATUS_LABEL.in_progress}</option>
                </select>
              </label>
              <button type="submit" className="gx-btn gx-btn--primary" disabled={p.linkBusy || !p.linkTrailId || p.loadingInstitutionTrails || p.linkableTrails.length === 0}>
                {p.linkBusy ? 'Vinculando…' : 'Vincular trilha'}
              </button>
            </form>
          )
        ) : null}
      </section>

      <section className="gx-card" aria-label="Conversa com o monitor">
        <div>
          <h2>Conversa com o monitor</h2>
          <p className="gx-muted">{p.loadingLogs ? 'Carregando histórico…' : 'Mensagens da sessão do aluno.'}</p>
        </div>
        {p.agentHistoryFilterLabel ? (
          <div className="gx-banner gx-banner--ok" role="status">
            <p>
              Filtrado por <strong>{p.agentHistoryFilterLabel}</strong> (vindo de Dados).
            </p>
            {p.onClearAgentHistoryFilter ? (
              <button type="button" className="gx-btn" onClick={p.onClearAgentHistoryFilter}>
                Mostrar todo o histórico
              </button>
            ) : null}
          </div>
        ) : null}
        {p.logsError ? <Banner>{p.logsError}</Banner> : null}
        {!p.loadingLogs && p.logsEmpty ? <p className="gx-muted">Nenhuma conversa registrada para este aluno ainda.</p> : null}
        {p.chatSlot}
      </section>
    </div>
  )
}
