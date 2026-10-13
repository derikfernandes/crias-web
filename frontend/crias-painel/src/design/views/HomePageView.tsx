import { Link } from 'react-router-dom'
import type {
  HomePageInstitutionCard,
  HomePageTotals,
  HomePageUsageStats,
  HomePageViewProps,
} from '../types/homePageView'

export type {
  HomePageInstitutionCard,
  HomePageTotals,
  HomePageUsageStats,
  HomePageViewProps,
} from '../types/homePageView'

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="dashboard-stat-card">
      <span className="dashboard-stat-card__label">{label}</span>
      <span className="dashboard-stat-card__value">{value}</span>
    </div>
  )
}

function UsageRow({ usage }: { usage: HomePageUsageStats }) {
  return (
    <dl className="home-dash__usage">
      <div>
        <dt>Em andamento</dt>
        <dd>{usage.inProgress}</dd>
      </div>
      <div>
        <dt>Concluíram</dt>
        <dd>{usage.completed}</dd>
      </div>
      <div>
        <dt>Não iniciaram</dt>
        <dd>{usage.notStarted}</dd>
      </div>
      <div>
        <dt>Ativos (7 dias)</dt>
        <dd>{usage.activeLast7Days}</dd>
      </div>
    </dl>
  )
}

function TotalsStrip({
  totals,
  showInstitutions,
}: {
  totals: HomePageTotals
  showInstitutions: boolean
}) {
  return (
    <div className="home-dash__stats" aria-label="Resumo">
      {showInstitutions ? (
        <StatCard label="Instituições" value={totals.institutions} />
      ) : null}
      <StatCard label="Alunos ativos" value={totals.activeStudents} />
      <StatCard label="Trilhas ativas" value={totals.activeTrails} />
      <StatCard label="Ativos (7 dias)" value={totals.usage.activeLast7Days} />
      <StatCard label="Em andamento" value={totals.usage.inProgress} />
    </div>
  )
}

function InstitutionCard({
  card,
  onRememberInstitution,
}: {
  card: HomePageInstitutionCard
  onRememberInstitution: (institutionId: string) => void
}) {
  return (
    <article className="home-dash__card">
      <header className="home-dash__card-head">
        <div>
          <h3>
            <Link to={card.detailHref}>{card.name}</Link>
          </h3>
          <p className="muted">
            {card.type}
            {card.active ? '' : ' · inativa'}
          </p>
        </div>
        <div className="home-dash__card-actions">
          <Link className="btn btn--small btn--ghost" to={card.detailHref}>
            Editar
          </Link>
          <Link
            className="btn btn--small btn--ghost"
            to={card.gerenciamentoHref}
            onClick={() => onRememberInstitution(card.id)}
          >
            Gestão
          </Link>
          <Link
            className="btn btn--small btn--primary"
            to={card.dashboardHref}
            onClick={() => onRememberInstitution(card.id)}
          >
            Dashboard
          </Link>
        </div>
      </header>

      <div className="home-dash__card-stats">
        <StatCard label="Alunos ativos" value={card.activeStudents} />
        <StatCard label="Trilhas ativas" value={card.activeTrails} />
      </div>

      <div className="home-dash__card-usage">
        <h4>Uso dos alunos</h4>
        <UsageRow usage={card.usage} />
      </div>
    </article>
  )
}

export function HomePageView({
  canCreate,
  loading,
  error,
  mode,
  totals,
  cards,
  onRememberInstitution,
}: HomePageViewProps) {
  const single = mode === 'single' ? cards[0] : null

  return (
    <>
      <header className="admin__header dashboard-header home-dash__header">
        <div className="dashboard-header__intro">
          <h1>{single ? single.name : 'Instituições'}</h1>
          <p className="admin__lede muted">
            {single
              ? 'Visão geral da instituição: alunos, trilhas e uso recente.'
              : mode === 'empty'
                ? 'Cadastre uma instituição para começar a acompanhar alunos e trilhas.'
                : 'Resumo das instituições às quais você tem acesso.'}
          </p>
        </div>
        {!loading && mode !== 'empty' ? (
          <TotalsStrip
            totals={single ? { ...totals, institutions: 1 } : totals}
            showInstitutions={mode === 'multi'}
          />
        ) : null}
        <p className="admin__actions dashboard-header__toolbar">
          {canCreate ? (
            <Link className="btn btn--primary" to="/instituicoes/novo">
              + Nova instituição
            </Link>
          ) : null}
          {single ? (
            <>
              <Link className="btn btn--ghost" to={single.detailHref}>
                Editar instituição
              </Link>
              <Link
                className="btn btn--ghost"
                to={single.dashboardHref}
                onClick={() => onRememberInstitution(single.id)}
              >
                Dashboard detalhado
              </Link>
              <Link
                className="btn btn--ghost"
                to={single.gerenciamentoHref}
                onClick={() => onRememberInstitution(single.id)}
              >
                Visão por instituição
              </Link>
            </>
          ) : null}
        </p>
      </header>

      {error ? (
        <p className="banner banner--error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="muted" role="status">
          Carregando dados…
        </p>
      ) : null}

      {!loading && mode === 'empty' ? (
        <section className="panel">
          <p className="muted table__empty">
            Nenhuma instituição disponível para o seu usuário.
          </p>
        </section>
      ) : null}

      {!loading && single ? (
        <section className="home-dash__single panel">
          <div className="panel__head">
            <h2>Uso dos alunos</h2>
            <span className="muted">
              {single.active ? 'Instituição ativa' : 'Instituição inativa'}
              {single.type ? ` · ${single.type}` : ''}
            </span>
          </div>
          <UsageRow usage={single.usage} />
          <p className="home-dash__hint muted">
            “Ativos (7 dias)” conta alunos com interação recente na trilha.
            “Não iniciaram” conta vínculos de trilha ainda não começados.
          </p>
        </section>
      ) : null}

      {!loading && mode === 'multi' ? (
        <section className="home-dash__grid" aria-label="Instituições">
          {cards.map((card) => (
            <InstitutionCard
              key={card.id}
              card={card}
              onRememberInstitution={onRememberInstitution}
            />
          ))}
        </section>
      ) : null}
    </>
  )
}
