import { TrilhaEmptyState } from '../components/trilha/TrilhaEmptyState'
import { TrilhaErrorBanner } from '../components/trilha/TrilhaErrorBanner'
import { WaSyncBadge } from '../components/trilha/WaSyncBadge'
import {
  homeCanContinue,
  homePrimaryCtaLabel,
  homeStatusLabel,
  type HomeNextAction,
} from '../../lib/trilha/homeCta'

export type TrilhaHomeTrailCard = {
  trailId: string
  title: string
  institutionName?: string | null
  subject?: string | null
  status: 'in_progress' | 'completed' | 'blocked' | 'not_started'
  nextAction: HomeNextAction | null
  stageNumber: number
  questionNumber: number
  progressRatio: number | null
  totalStages: number | null
  totalQuestions: number | null
  stagesCompleted: number
  lastActivityAt?: string | null
}

export type TrilhaHomeTotals = {
  trails: number
  inProgress: number
  completed: number
  stagesCompleted: number
}

export type TrilhaHomePageViewProps = {
  studentName: string
  trails: TrilhaHomeTrailCard[]
  totals: TrilhaHomeTotals
  whatsappHelpHref?: string
  loadState: 'loading' | 'ready' | 'empty' | 'error'
  errorMessage?: string
  /** Continuar → /trilha/play (sem ensure-ai no open). */
  onContinue: (trailId: string) => void
  onOpenHistory?: (trailId?: string) => void
  onRetry?: () => void
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="dashboard-stat-card">
      <span className="dashboard-stat-card__label">{label}</span>
      <span className="dashboard-stat-card__value">{value}</span>
    </div>
  )
}

function progressPctLabel(ratio: number | null): string {
  if (typeof ratio !== 'number' || !Number.isFinite(ratio)) return '—'
  return `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`
}

function formatLastActivity(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return null
  }
}

function TrailCard({
  card,
  onContinue,
  onOpenHistory,
}: {
  card: TrilhaHomeTrailCard
  onContinue: (trailId: string) => void
  onOpenHistory?: (trailId?: string) => void
}) {
  const canContinue = homeCanContinue(card.nextAction)
  const statusLabel = homeStatusLabel(card.status, card.nextAction)
  const ctaLabel = homePrimaryCtaLabel(card.status, card.nextAction)
  const pct = progressPctLabel(card.progressRatio)
  const isCompleted =
    card.nextAction === 'completed' || card.status === 'completed'
  const subtitle = [card.institutionName, card.subject]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(' · ')
  const stagesLabel =
    typeof card.totalStages === 'number' && card.totalStages > 0
      ? `${card.stagesCompleted} de ${card.totalStages}`
      : String(card.stagesCompleted)
  const nowLabel = isCompleted
    ? 'Concluída'
    : typeof card.totalStages === 'number' && card.totalStages > 0
      ? `Etapa ${card.stageNumber} de ${card.totalStages}`
      : `Etapa ${card.stageNumber} · Q${card.questionNumber}`
  const lastActivity = formatLastActivity(card.lastActivityAt)

  return (
    <article className="home-dash__card trilha-home-dash__card">
      <header className="home-dash__card-head">
        <div>
          <h3>{card.title || 'Trilha'}</h3>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
        <span
          className={
            isCompleted
              ? 'trilha-home-dash__badge trilha-home-dash__badge--done'
              : card.status === 'not_started'
                ? 'trilha-home-dash__badge trilha-home-dash__badge--idle'
                : 'trilha-home-dash__badge trilha-home-dash__badge--active'
          }
        >
          {statusLabel}
        </span>
      </header>

      <div className="home-dash__card-stats" aria-label="Métricas da trilha">
        <StatCard label="Etapas" value={stagesLabel} />
        <StatCard label="Progresso" value={pct} />
        <StatCard label="Agora" value={nowLabel} />
      </div>

      <div className="home-dash__card-usage trilha-home-dash__meta">
        <h4>Detalhe</h4>
        <dl className="home-dash__usage">
          <div>
            <dt>Etapas concluídas</dt>
            <dd>{card.stagesCompleted}</dd>
          </div>
          <div>
            <dt>Etapas totais</dt>
            <dd>
              {typeof card.totalStages === 'number' ? card.totalStages : '—'}
            </dd>
          </div>
          {typeof card.totalQuestions === 'number' ? (
            <div>
              <dt>Questões na grade</dt>
              <dd>{card.totalQuestions}</dd>
            </div>
          ) : null}
          {lastActivity ? (
            <div>
              <dt>Última atividade</dt>
              <dd>{lastActivity}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="trilha-home-dash__card-actions">
        {canContinue ? (
          <button
            type="button"
            className="btn btn--primary trilha-cta"
            onClick={() => onContinue(card.trailId)}
          >
            {ctaLabel}
          </button>
        ) : isCompleted && onOpenHistory ? (
          <button
            type="button"
            className="btn btn--primary trilha-cta"
            onClick={() => onOpenHistory(card.trailId)}
          >
            Revisar a trilha
          </button>
        ) : null}
        {onOpenHistory && !isCompleted ? (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => onOpenHistory(card.trailId)}
          >
            Abrir revisão
          </button>
        ) : null}
        {!canContinue && !isCompleted && card.nextAction === 'await_release' ? (
          <p className="trilha-home-dash__hint muted">
            Pausa esperada — a próxima etapa ainda não foi liberada.
          </p>
        ) : null}
      </div>
    </article>
  )
}

export function TrilhaHomePageView({
  studentName,
  trails,
  totals,
  whatsappHelpHref,
  loadState,
  errorMessage,
  onContinue,
  onOpenHistory,
  onRetry,
}: TrilhaHomePageViewProps) {
  if (loadState === 'loading') {
    return (
      <div
        className="trilha-home trilha-home--skeleton trilha-home-dash"
        aria-busy="true"
        aria-live="polite"
      >
        <p className="visually-hidden">A carregar as suas trilhas…</p>
        <div className="trilha-skeleton trilha-skeleton--title" aria-hidden="true" />
        <div className="trilha-skeleton trilha-skeleton--block" aria-hidden="true" />
        <div className="trilha-skeleton trilha-skeleton--cta" aria-hidden="true" />
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="trilha-home trilha-home-dash">
        <TrilhaErrorBanner
          message={errorMessage ?? 'Não foi possível carregar as trilhas.'}
          onRetry={onRetry}
        />
      </div>
    )
  }

  if (loadState === 'empty') {
    return (
      <div className="trilha-home trilha-home-dash">
        <header className="admin__header dashboard-header home-dash__header trilha-home-dash__header">
          <div className="dashboard-header__intro">
            <p className="trilha-home__hello">Olá, {studentName}</p>
            <h1>Minhas trilhas</h1>
            <p className="admin__lede muted">
              Ainda não há trilha vinculada à sua conta.
            </p>
          </div>
        </header>
        <TrilhaEmptyState
          title="Nenhuma trilha vinculada"
          message="Fale com a escola para ser matriculado numa trilha ativa."
        />
      </div>
    )
  }

  return (
    <div className="trilha-home trilha-home-dash">
      <WaSyncBadge />

      <header className="admin__header dashboard-header home-dash__header trilha-home-dash__header">
        <div className="dashboard-header__intro">
          <p className="trilha-home__hello">Olá, {studentName}</p>
          <h1>Minhas trilhas</h1>
          <p className="admin__lede muted">
            Trilhas vinculadas à sua conta — continue de onde parou.
          </p>
        </div>
        <section className="home-dash__stats" aria-label="Resumo do aluno">
          <StatCard label="Trilhas" value={totals.trails} />
          <StatCard label="Em andamento" value={totals.inProgress} />
          <StatCard label="Etapas feitas" value={totals.stagesCompleted} />
          <StatCard label="Concluídas" value={totals.completed} />
        </section>
      </header>

      <section className="home-dash__grid" aria-label="Minhas trilhas">
        {trails.map((card) => (
          <TrailCard
            key={card.trailId}
            card={card}
            onContinue={onContinue}
            onOpenHistory={onOpenHistory}
          />
        ))}
      </section>

      {whatsappHelpHref ? (
        <p className="trilha-home__wa">
          <a
            href={whatsappHelpHref}
            target="_blank"
            rel="noreferrer"
            aria-label="Tirar dúvida no WhatsApp (abre numa nova janela)"
          >
            Tirar dúvida no WhatsApp
            <span className="visually-hidden"> (abre numa nova janela)</span>
          </a>
        </p>
      ) : null}
    </div>
  )
}
