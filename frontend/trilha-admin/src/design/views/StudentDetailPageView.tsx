import { Link } from 'react-router-dom'
import type { StudentDetailPageViewProps } from '../types/studentDetailPageView'
import { StatusTag } from '../components/ui/StatusTag'
import { PageEmpty, PageError, PageLoading } from '../components/feedback/PageState'

export type {
  StudentDetailTrailRow,
  StudentDetailLinkableTrail,
  StudentDetailPageViewProps,
} from '../types/studentDetailPageView'

export function StudentDetailPageView(props: StudentDetailPageViewProps) {
  if (props.status === 'missing-id') {
    return (
      <PageError title="ID ausente" body="ID ausente na URL." />
    )
  }

  const {
    error,
    loading,
    notFound,
    formSlot,
    hasStudent,
    studentName,
    schoolGrade,
    schoolLevel,
    studentLevelLabel,
    lastInteractionLabel,
    activeLabel,
    backHref = '/alunos',
    onDeactivate,
    deactivateBusy = false,
    learningStats,
    loadingTrails,
    trailsError,
    editError,
    trailRows,
    editStage,
    editQuestion,
    editStatus,
    editBusy,
    onEditStageChange,
    onEditQuestionChange,
    onEditStatusChange,
    onStartEditTrail,
    onCancelEditTrail,
    onSaveTrailPosition,
    onUnlinkTrail,
    missingInstitutionId,
    institutionTrailsError,
    linkError,
    linkTrailId,
    onLinkTrailIdChange,
    linkStatus,
    onLinkStatusChange,
    linkBusy,
    loadingInstitutionTrails,
    linkableTrails,
    onLinkTrailSubmit,
    loadingLogs,
    logsError,
    logsEmpty,
    chatSlot,
    agentHistoryFilterLabel,
    onClearAgentHistoryFilter,
  } = props

  const metaParts = [
    schoolGrade,
    schoolLevel,
    studentLevelLabel ? `nível ${studentLevelLabel}` : null,
    activeLabel,
  ].filter(Boolean)

  return (
    <>
      <header className="admin__header">
        <p className="admin__actions" style={{ marginBottom: 8 }}>
          <Link className="btn btn--ghost" to={backHref}>
            ← Alunos
          </Link>
        </p>
        <div className="crias-label">Perfil do aluno</div>
        <h1>{studentName?.trim() || 'Aluno'}</h1>
        {metaParts.length > 0 ? (
          <p className="admin__lede muted">
            {metaParts.join(' · ')}
            {lastInteractionLabel
              ? ` · última interação ${lastInteractionLabel}`
              : ''}
          </p>
        ) : (
          <p className="admin__lede muted">
            Percurso por trilha, cadastro e histórico do WhatsApp.
          </p>
        )}
        {onDeactivate && hasStudent && !notFound ? (
          <p className="admin__actions">
            <button
              type="button"
              className="btn btn--ghost"
              disabled={deactivateBusy}
              onClick={onDeactivate}
            >
              {deactivateBusy ? 'Desativando…' : 'Desativar aluno'}
            </button>
          </p>
        ) : null}
      </header>

      {error ? (
        <p className="banner banner--error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <PageLoading label="Carregando aluno…" />
      ) : notFound ? (
        <PageError title="Registro não encontrado" />
      ) : (
        <section className="panel">
          <div className="panel__head">
            <h2>Cadastro</h2>
          </div>
          {formSlot}
        </section>
      )}

      {learningStats && learningStats.length > 0 ? (
        <section className="panel">
          <div className="panel__head">
            <h2>Aprendizagem</h2>
          </div>
          <div className="crias-kpi-grid">
            {learningStats.map((stat) => (
              <div key={`${stat.subject}-${stat.label}`} className="crias-kpi">
                <span className="crias-kpi__label">
                  {stat.subject} · {stat.label}
                </span>
                <span className="crias-kpi__value" style={{ fontSize: 22 }}>
                  {stat.valueLabel}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel__head">
          <h2>Percurso por trilha</h2>
          {loadingTrails ? (
            <span className="muted">Carregando progresso…</span>
          ) : null}
        </div>

        <p className="muted" style={{ marginTop: 0 }}>
          Trilhas com registro de progresso. Use “Mover de atividade” para
          ajustar stage e questão, ou vincule outra trilha da mesma instituição.
        </p>

        {trailsError ? (
          <p className="banner banner--error" role="alert">
            {trailsError}
          </p>
        ) : null}
        {editError ? (
          <p className="banner banner--error" role="alert">
            {editError}
          </p>
        ) : null}

        {!loadingTrails && trailRows.length === 0 ? (
          <PageEmpty
            title="Nenhuma trilha vinculada"
            body="Use o formulário abaixo para vincular uma trilha da instituição."
          />
        ) : null}

        {trailRows.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Trilha</th>
                  <th>Situação</th>
                  <th>Bloco</th>
                  <th>Atividade</th>
                  <th>Status</th>
                  <th>Última interação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {trailRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link className="table__name-link" to={row.trailHref}>
                        {row.trailLabel}
                      </Link>
                      {row.trailIdSecondary ? (
                        <div className="muted" style={{ fontSize: '0.85em' }}>
                          <code>{row.trailIdSecondary}</code>
                          {row.inactiveHint ? ' · inativa' : null}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {row.situationLabel && row.situationTone ? (
                        <StatusTag
                          label={row.situationLabel}
                          tone={row.situationTone}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {row.isEditing ? (
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={editStage}
                          onChange={(e) => onEditStageChange(e.target.value)}
                          disabled={editBusy}
                          style={{ width: '6.5rem' }}
                          aria-label="Bloco (stage)"
                        />
                      ) : (
                        row.stageDisplay
                      )}
                    </td>
                    <td>
                      {row.isEditing ? (
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={editQuestion}
                          onChange={(e) => onEditQuestionChange(e.target.value)}
                          disabled={editBusy}
                          style={{ width: '6.5rem' }}
                          aria-label="Atividade (questão)"
                        />
                      ) : (
                        row.questionDisplay
                      )}
                    </td>
                    <td>
                      {row.isEditing ? (
                        <select
                          value={editStatus}
                          onChange={(e) => onEditStatusChange(e.target.value)}
                          disabled={editBusy}
                        >
                          <option value="not_started">not_started</option>
                          <option value="in_progress">in_progress</option>
                          <option value="completed">completed</option>
                          <option value="blocked">blocked</option>
                        </select>
                      ) : (
                        <code>{row.status}</code>
                      )}
                    </td>
                    <td>{row.lastInteractionAtLabel}</td>
                    <td>
                      <div className="table__actions">
                        {row.isEditing ? (
                          <>
                            <button
                              type="button"
                              className="btn btn--small btn--primary"
                              onClick={() => onSaveTrailPosition(row.id)}
                              disabled={editBusy}
                            >
                              {editBusy ? 'Salvando…' : 'Salvar'}
                            </button>
                            <button
                              type="button"
                              className="btn btn--small btn--ghost"
                              onClick={onCancelEditTrail}
                              disabled={editBusy}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--small btn--ghost"
                            onClick={() => onStartEditTrail(row.id)}
                            disabled={editBusy}
                          >
                            Mover de atividade
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn--small btn--danger"
                          onClick={() => onUnlinkTrail(row.id)}
                          disabled={editBusy}
                        >
                          Desvincular
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {hasStudent ? (
          <>
            <h3
              className="crias-section-title"
              style={{
                fontSize: 18,
                margin: '1.5rem 0 0.75rem',
                borderBottom: 0,
                paddingBottom: 0,
              }}
            >
              Outras trilhas · vincular
            </h3>
            {missingInstitutionId ? (
              <p className="banner banner--error" role="alert">
                Este aluno não tem instituição. Defina no cadastro acima antes
                de vincular trilhas.
              </p>
            ) : (
              <form className="form" onSubmit={onLinkTrailSubmit}>
                {institutionTrailsError ? (
                  <p className="banner banner--error" role="alert">
                    {institutionTrailsError}
                  </p>
                ) : null}
                {linkError ? (
                  <p className="banner banner--error" role="alert">
                    {linkError}
                  </p>
                ) : null}

                <label className="field">
                  <span>Trilha</span>
                  <select
                    value={linkTrailId}
                    onChange={(e) => onLinkTrailIdChange(e.target.value)}
                    disabled={
                      linkBusy ||
                      loadingInstitutionTrails ||
                      linkableTrails.length === 0
                    }
                  >
                    <option value="">
                      {loadingInstitutionTrails
                        ? 'Carregando trilhas…'
                        : linkableTrails.length === 0
                          ? 'Nenhuma trilha disponível'
                          : 'Selecione…'}
                    </option>
                    {linkableTrails.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Status inicial</span>
                  <select
                    value={linkStatus}
                    onChange={(e) => onLinkStatusChange(e.target.value)}
                    disabled={linkBusy}
                  >
                    <option value="not_started">not_started</option>
                    <option value="in_progress">in_progress</option>
                  </select>
                </label>

                <div className="form__actions">
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={
                      linkBusy ||
                      !linkTrailId ||
                      loadingInstitutionTrails ||
                      linkableTrails.length === 0
                    }
                  >
                    {linkBusy ? 'Vinculando…' : 'Vincular trilha'}
                  </button>
                </div>
              </form>
            )}
          </>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel__head">
          <div>
            <div className="crias-label">Conversa no WhatsApp</div>
            <h2 style={{ margin: '4px 0 0' }}>Histórico</h2>
          </div>
          {loadingLogs ? (
            <span className="muted">Carregando histórico…</span>
          ) : null}
        </div>

        {agentHistoryFilterLabel ? (
          <div
            className="banner banner--info student-detail-agent-filter"
            role="status"
          >
            <p>
              Filtrado pelo agente <strong>{agentHistoryFilterLabel}</strong>{' '}
              (vindo do dashboard).
            </p>
            {onClearAgentHistoryFilter ? (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onClearAgentHistoryFilter}
              >
                Mostrar todo o histórico
              </button>
            ) : null}
          </div>
        ) : null}

        {logsError ? (
          <p className="banner banner--error" role="alert">
            {logsError}
          </p>
        ) : null}

        {!loadingLogs && logsEmpty ? (
          <PageEmpty
            title="Nenhum log de conversa"
            body={
              agentHistoryFilterLabel
                ? 'Nenhum log deste agente para este aluno.'
                : 'Cada mensagem trocada pelo chatbot gera um registro em conversation_logs.'
            }
          />
        ) : null}

        {chatSlot}
      </section>
    </>
  )
}
