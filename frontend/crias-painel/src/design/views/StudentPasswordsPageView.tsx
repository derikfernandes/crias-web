import type { StudentPasswordsPageViewProps } from '../types/studentPasswordsPageView'

export type { StudentPasswordsPageViewProps } from '../types/studentPasswordsPageView'

export function StudentPasswordsPageView({
  isMaster,
  institutionOptions,
  selectedInstitutionId,
  onSelectInstitution,
  rows,
  loading,
  error,
  busy,
  onExportCsv,
  onRegenerate,
  importCsvText,
  onImportCsvTextChange,
  onImportFile,
  onSubmitImport,
  importResultMessage,
  importErrors,
  onDownloadGeneratedCsv,
}: StudentPasswordsPageViewProps) {
  if (!isMaster) {
    return (
      <>
        <header className="admin__header">
          <h1>Senhas dos alunos</h1>
        </header>
        <p className="banner banner--error" role="alert">
          Acesso restrito a Master. Peça a um administrador para liberar
          <code> is_master </code>
          ou incluir seu e-mail em
          <code> MASTER_ADMIN_EMAILS </code>.
        </p>
      </>
    )
  }

  return (
    <>
      <header className="admin__header">
        <h1>Senhas dos alunos</h1>
        <p className="admin__lede muted">
          Visão Master por escola: nome, celular e senha (decifrada só no
          servidor). Toda visualização, exportação e regeneração é auditada.
        </p>
        <div className="list-toolbar">
          <label className="list-toolbar__field">
            <span className="muted">Escola</span>
            <select
              value={selectedInstitutionId}
              onChange={(e) => onSelectInstitution(e.target.value)}
              disabled={busy}
            >
              <option value="">Selecione a escola</option>
              {institutionOptions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.label}
                </option>
              ))}
            </select>
          </label>
          <p className="admin__actions" style={{ margin: 0 }}>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!selectedInstitutionId || busy || loading}
              onClick={onExportCsv}
            >
              Exportar CSV
            </button>
          </p>
        </div>
      </header>

      {error ? (
        <p className="banner banner--error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="panel" aria-labelledby="senhas-lista-titulo">
        <div className="panel__head">
          <h2 id="senhas-lista-titulo">Alunos da escola</h2>
          {loading ? <span className="muted">Carregando…</span> : null}
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Celular</th>
                <th>Senha</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {!selectedInstitutionId ? (
                <tr>
                  <td colSpan={4} className="table__empty">
                    Selecione uma escola para listar as senhas.
                  </td>
                </tr>
              ) : rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={4} className="table__empty">
                    Nenhum aluno nesta escola.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name || row.id}</td>
                    <td>{row.phone_number || '—'}</td>
                    <td>
                      {row.password ? (
                        <code>{row.password}</code>
                      ) : row.has_password_hash ? (
                        <span className="muted">
                          Legado (sem revelação) — gere nova senha
                        </span>
                      ) : (
                        <span className="muted">Sem senha</span>
                      )}
                    </td>
                    <td className="table__actions">
                      <button
                        type="button"
                        className="btn btn--small"
                        disabled={busy || row.regenerating}
                        onClick={() => onRegenerate(row.id)}
                      >
                        {row.regenerating ? 'Gerando…' : 'Gerar nova senha'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" aria-labelledby="senhas-import-titulo">
        <div className="panel__head">
          <h2 id="senhas-import-titulo">Importar CSV</h2>
        </div>
        <p className="muted">
          Colunas: <code>nome</code>, <code>celular</code>, <code>escola</code>,{' '}
          <code>trilha</code> (opcional), <code>senha</code> (opcional). Senha
          vazia gera automaticamente.
        </p>
        <label className="list-toolbar__field">
          <span className="muted">Arquivo CSV</span>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            disabled={busy}
            onChange={(e) => onImportFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="list-toolbar__field list-toolbar__field--grow">
          <span className="muted">Ou cole o CSV</span>
          <textarea
            rows={8}
            value={importCsvText}
            onChange={(e) => onImportCsvTextChange(e.target.value)}
            disabled={busy}
            placeholder="nome,celular,escola,trilha,senha"
            style={{ width: '100%', fontFamily: 'inherit' }}
          />
        </label>
        <p className="admin__actions">
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy || !importCsvText.trim()}
            onClick={onSubmitImport}
          >
            {busy ? 'Importando…' : 'Importar alunos'}
          </button>
          {onDownloadGeneratedCsv ? (
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={onDownloadGeneratedCsv}
            >
              Baixar senhas geradas (CSV)
            </button>
          ) : null}
        </p>
        {importResultMessage ? (
          <p className="banner banner--success" role="status">
            {importResultMessage}
          </p>
        ) : null}
        {importErrors.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Linha</th>
                  <th>Nome</th>
                  <th>Celular</th>
                  <th>Erro</th>
                </tr>
              </thead>
              <tbody>
                {importErrors.map((err) => (
                  <tr key={`${err.line}-${err.error}`}>
                    <td>{err.line}</td>
                    <td>{err.nome ?? '—'}</td>
                    <td>{err.celular ?? '—'}</td>
                    <td>{err.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </>
  )
}
