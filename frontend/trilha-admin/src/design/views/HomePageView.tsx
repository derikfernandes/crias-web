import { Link } from 'react-router-dom'
import type { HomePageViewProps } from '../types/homePageView'
import { CriasTabs } from '../components/navigation/CriasTabs'
import { StatusTag } from '../components/ui/StatusTag'
import { KpiGrid, KpiStat } from '../components/cards/KpiStat'
import { PageEmpty, PageLoading } from '../components/feedback/PageState'
import { useState } from 'react'

export type {
  HomePageInstitutionCard,
  HomePageTotals,
  HomePageUsageStats,
  HomePageViewProps,
} from '../types/homePageView'

export function HomePageView({
  canCreate,
  loading,
  error,
  mode,
  totals,
  cards,
  onRememberInstitution,
}: HomePageViewProps) {
  const [configTab, setConfigTab] = useState<'instituicoes' | 'atalhos'>(
    'instituicoes',
  )
  const single = mode === 'single' ? cards[0] : null

  return (
    <>
      <header className="admin__header">
        <div className="crias-label">Configurações</div>
        <h1>
          {single ? single.name : 'Instituições, usuários e acesso'}
        </h1>
        <p className="admin__lede muted">
          {single
            ? 'Visão da instituição e atalhos para gestão, usuários e visão geral.'
            : mode === 'empty'
              ? 'Cadastre uma instituição para começar.'
              : 'Gerencie instituições permitidas. Usuários e papéis ficam em Usuários e acesso.'}
        </p>
        <p className="admin__actions">
          {canCreate ? (
            <Link className="btn btn--primary" to="/instituicoes/novo">
              + Nova instituição
            </Link>
          ) : null}
          <Link className="btn btn--ghost" to="/admin">
            Usuários e acesso
          </Link>
        </p>
      </header>

      <CriasTabs
        ariaLabel="Configurações"
        activeId={configTab}
        onChange={(id) =>
          setConfigTab(id === 'atalhos' ? 'atalhos' : 'instituicoes')
        }
        items={[
          { id: 'instituicoes', label: 'Instituições' },
          { id: 'atalhos', label: 'Atalhos' },
        ]}
      />

      {error ? (
        <p className="banner banner--error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <PageLoading label="Carregando configurações…" /> : null}

      {!loading && configTab === 'atalhos' ? (
        <section className="panel">
          <div className="panel__head">
            <h2>Atalhos de configuração</h2>
          </div>
          <div className="admin__actions" style={{ flexWrap: 'wrap' }}>
            <Link className="btn btn--ghost" to="/admin">
              Usuários e permissões
            </Link>
            <Link className="btn btn--ghost" to="/gerenciamento">
              Visão por instituição
            </Link>
            <Link className="btn btn--ghost" to="/gabarito">
              Gabaritos
            </Link>
            <Link className="btn btn--ghost" to="/doc">
              API e documentação
            </Link>
          </div>
          <p className="muted" style={{ marginTop: 16 }}>
            Papéis Coordenação/Leitura seguem o conjunto de{' '}
            <code>nav_permissions</code> definido em Usuários e acesso. Convite
            por e-mail fica para fase posterior.
          </p>
        </section>
      ) : null}

      {!loading && configTab === 'instituicoes' ? (
        <>
          {mode !== 'empty' ? (
            <KpiGrid>
              {mode === 'multi' ? (
                <KpiStat
                  label="Instituições"
                  value={String(totals.institutions)}
                />
              ) : null}
              <KpiStat
                label="Alunos ativos"
                value={String(totals.activeStudents)}
              />
              <KpiStat
                label="Trilhas ativas"
                value={String(totals.activeTrails)}
              />
              <KpiStat
                label="Ativos (7 dias)"
                value={String(totals.usage.activeLast7Days)}
              />
            </KpiGrid>
          ) : null}

          {mode === 'empty' ? (
            <PageEmpty
              title="Nenhuma instituição disponível"
              body="Nenhuma instituição disponível para o seu usuário."
            />
          ) : null}

          {single ? (
            <section className="panel">
              <div className="panel__head">
                <h2>Instituição</h2>
                <StatusTag
                  label={single.active ? 'Ativa' : 'Inativa'}
                  tone={single.active ? 'ativa' : 'inativa'}
                />
              </div>
              <dl className="trail-cadastro-details">
                <div className="trail-cadastro-details__row">
                  <dt>Tipo</dt>
                  <dd>{single.type || '—'}</dd>
                </div>
                <div className="trail-cadastro-details__row">
                  <dt>Em andamento</dt>
                  <dd>{single.usage.inProgress}</dd>
                </div>
                <div className="trail-cadastro-details__row">
                  <dt>Concluíram</dt>
                  <dd>{single.usage.completed}</dd>
                </div>
                <div className="trail-cadastro-details__row">
                  <dt>Não iniciaram</dt>
                  <dd>{single.usage.notStarted}</dd>
                </div>
              </dl>
              <p className="admin__actions" style={{ marginTop: 16 }}>
                <Link className="btn btn--ghost" to={single.detailHref}>
                  Editar
                </Link>
                <Link
                  className="btn btn--primary"
                  to={single.dashboardHref}
                  onClick={() => onRememberInstitution(single.id)}
                >
                  Visão geral
                </Link>
                <Link
                  className="btn btn--ghost"
                  to={single.gerenciamentoHref}
                  onClick={() => onRememberInstitution(single.id)}
                >
                  Gestão
                </Link>
              </p>
            </section>
          ) : null}

          {mode === 'multi' ? (
            <section className="panel">
              <div className="panel__head">
                <h2>Instituições</h2>
                <span className="muted">{cards.length}</span>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Tipo</th>
                      <th>Status</th>
                      <th>Alunos</th>
                      <th>Trilhas</th>
                      <th>Ativos 7d</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map((card) => (
                      <tr key={card.id}>
                        <td>
                          <Link
                            className="table__name-link"
                            to={card.detailHref}
                          >
                            {card.name}
                          </Link>
                        </td>
                        <td>{card.type || '—'}</td>
                        <td>
                          <StatusTag
                            label={card.active ? 'Ativa' : 'Inativa'}
                            tone={card.active ? 'ativa' : 'inativa'}
                          />
                        </td>
                        <td>{card.activeStudents}</td>
                        <td>{card.activeTrails}</td>
                        <td>{card.usage.activeLast7Days}</td>
                        <td className="table__actions">
                          <Link
                            className="btn btn--small btn--ghost"
                            to={card.dashboardHref}
                            onClick={() => onRememberInstitution(card.id)}
                          >
                            Visão geral
                          </Link>
                          <Link
                            className="btn btn--small btn--ghost"
                            to={card.gerenciamentoHref}
                            onClick={() => onRememberInstitution(card.id)}
                          >
                            Gestão
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </>
  )
}
