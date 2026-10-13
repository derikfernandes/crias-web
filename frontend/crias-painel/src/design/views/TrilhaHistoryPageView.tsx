import { useEffect, useMemo, useState } from 'react'
import { ListPager } from '../components/trilha/ListPager'
import { SafeMarkdown } from '../components/trilha/SafeMarkdown'
import { TrilhaEmptyState } from '../components/trilha/TrilhaEmptyState'
import { TrilhaErrorBanner } from '../components/trilha/TrilhaErrorBanner'
import { WaSyncBadge } from '../components/trilha/WaSyncBadge'
import { paginateList } from '../../lib/trilha/listPagination'

export type HistoryListItem = {
  stageNumber: number
  questionNumber: number
  stageType: 'fixed' | 'exercise' | 'ai' | null
  title: string | null
  body: string
  studentAnswer: string | null
  isCorrect: boolean | null
}

export type TrilhaHistoryPageViewProps = {
  items: HistoryListItem[]
  loadState: 'loading' | 'ready' | 'empty' | 'error'
  errorMessage?: string
  onBack: () => void
  onRetry?: () => void
  /** Deep-link para o passo atual (cursor Firebase) — não reabre questão antiga. */
  onContinueCurrent?: () => void
}

const TYPE_LABEL: Record<'fixed' | 'exercise' | 'ai', string> = {
  fixed: 'leitura',
  exercise: 'exercício',
  ai: 'IA',
}

type StageGroup = {
  stageNumber: number
  items: HistoryListItem[]
}

function groupByStage(items: HistoryListItem[]): StageGroup[] {
  const map = new Map<number, HistoryListItem[]>()
  for (const item of items) {
    const list = map.get(item.stageNumber) ?? []
    list.push(item)
    map.set(item.stageNumber, list)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([stageNumber, groupItems]) => ({
      stageNumber,
      items: groupItems,
    }))
}

function itemKey(item: HistoryListItem): string {
  return `${item.stageNumber}-${item.questionNumber}`
}

export function TrilhaHistoryPageView({
  items,
  loadState,
  errorMessage,
  onBack,
  onRetry,
  onContinueCurrent,
}: TrilhaHistoryPageViewProps) {
  const groups = groupByStage(items)
  const lastKey = items.length > 0 ? itemKey(items[items.length - 1]) : null
  const HISTORY_PAGE_SIZE = 4
  const [page, setPage] = useState(1)
  const groupSlice = useMemo(
    () => paginateList(groups, page, HISTORY_PAGE_SIZE),
    [groups, page],
  )

  useEffect(() => {
    if (groups.length === 0) return
    setPage(groupSlice.pageForIndex(groups.length - 1))
  }, [groups.length, groupSlice.pageForIndex])

  const [openStages, setOpenStages] = useState<Record<number, boolean>>({})
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})

  // default: etapas abertas; último item expandido
  const isStageOpen = (n: number) => openStages[n] ?? true
  const isItemOpen = (key: string) =>
    key in openItems ? openItems[key] : key === lastKey

  if (loadState === 'loading') {
    return (
      <div
        className="trilha-history trilha-history--skeleton"
        aria-busy="true"
        aria-live="polite"
      >
        <p className="visually-hidden">A carregar a revisão…</p>
        <div className="trilha-skeleton trilha-skeleton--title" aria-hidden="true" />
        <div className="trilha-skeleton trilha-skeleton--block" aria-hidden="true" />
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="trilha-history">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          <span aria-hidden="true">← </span>
          Voltar ao mapa
        </button>
        <TrilhaErrorBanner
          message={errorMessage ?? 'Falha ao carregar a revisão.'}
          onRetry={onRetry}
        />
      </div>
    )
  }

  const exerciseCount = items.filter((i) => i.stageType === 'exercise').length
  const correctCount = items.filter((i) => i.isCorrect === true).length
  const reviewCount = items.filter((i) => i.isCorrect === false).length

  return (
    <div className="trilha-history trilha-history--v2">
      <WaSyncBadge />
      <header className="trilha-history__chrome">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          <span aria-hidden="true">← </span>
          Voltar ao mapa
        </button>
      </header>
      <h1 className="trilha-history__heading">Revisão</h1>
      <p className="trilha-history__lead muted">
        O que você já aprendeu nesta trilha. Só leitura — respostas antigas não
        mudam o progresso.
      </p>

      {loadState === 'empty' || items.length === 0 ? (
        <TrilhaEmptyState
          title="Ainda sem revisão"
          message="Quando avançar, a revisão aparece aqui para reler o que aprendeu."
          actionLabel="Voltar ao mapa"
          onAction={onBack}
        />
      ) : (
        <>
          <p className="trilha-history__summary" role="status">
            {items.length} passo{items.length === 1 ? '' : 's'} concluído
            {items.length === 1 ? '' : 's'}
            {exerciseCount > 0
              ? ` · ${correctCount} corretos`
              : null}
            {reviewCount > 0 ? ` · ${reviewCount} a rever` : null}
          </p>

          {onContinueCurrent ? (
            <p className="trilha-history__resume">
              <button
                type="button"
                className="btn btn--primary trilha-cta"
                onClick={onContinueCurrent}
              >
                Continuar no passo atual
              </button>
            </p>
          ) : null}

          {groups.length > HISTORY_PAGE_SIZE ? (
            <ListPager
              page={groupSlice.page}
              totalPages={groupSlice.totalPages}
              totalItems={groupSlice.totalItems}
              onPageChange={setPage}
              label="Etapas na revisão"
            />
          ) : null}

          <h2 className="trilha-history__timeline-title">Linha do tempo</h2>

          <div className="trilha-history__groups">
            {groupSlice.items.map((group) => {
              const stageOpen = isStageOpen(group.stageNumber)
              const panelId = `rev-stage-${group.stageNumber}`
              return (
                <section
                  key={group.stageNumber}
                  className="trilha-history__stage"
                  aria-labelledby={`hist-stage-${group.stageNumber}`}
                >
                  <button
                    type="button"
                    className="trilha-history__stage-toggle"
                    id={`hist-stage-${group.stageNumber}`}
                    aria-expanded={stageOpen}
                    aria-controls={panelId}
                    onClick={() =>
                      setOpenStages((prev) => ({
                        ...prev,
                        [group.stageNumber]: !stageOpen,
                      }))
                    }
                  >
                    <span>
                      Etapa {group.stageNumber}
                      <span className="trilha-history__stage-count muted">
                        {' '}
                        · {group.items.length} passo
                        {group.items.length === 1 ? '' : 's'}
                      </span>
                    </span>
                    <span aria-hidden="true">{stageOpen ? '▾' : '▸'}</span>
                  </button>

                  {stageOpen ? (
                    <ol id={panelId} className="trilha-history__list trilha-history__timeline">
                      {group.items.map((item) => {
                        const key = itemKey(item)
                        const expanded = isItemOpen(key)
                        const typeLabel =
                          item.stageType && item.stageType in TYPE_LABEL
                            ? TYPE_LABEL[item.stageType]
                            : null
                        const isLast = key === lastKey
                        const bodyId = `rev-body-${key}`
                        return (
                          <li
                            key={key}
                            className={
                              isLast
                                ? 'trilha-history__item trilha-history__item--latest'
                                : 'trilha-history__item'
                            }
                          >
                            <button
                              type="button"
                              className="trilha-history__item-toggle"
                              aria-expanded={expanded}
                              aria-controls={bodyId}
                              onClick={() =>
                                setOpenItems((prev) => ({
                                  ...prev,
                                  [key]: !expanded,
                                }))
                              }
                            >
                              <span className="trilha-history__item-toggle-main">
                                <span className="trilha-history__pos">
                                  {isLast ? (
                                    <span className="trilha-history__latest-badge">
                                      Última conquista
                                    </span>
                                  ) : null}
                                  Questão {item.questionNumber}
                                  {typeLabel ? (
                                    <span className="trilha-player__type">
                                      {typeLabel}
                                    </span>
                                  ) : null}
                                  {item.isCorrect === true ? (
                                    <span className="trilha-history__badge trilha-history__badge--ok">
                                      {' '}
                                      correta
                                    </span>
                                  ) : item.isCorrect === false ? (
                                    <span className="trilha-history__badge trilha-history__badge--review">
                                      {' '}
                                      a rever
                                    </span>
                                  ) : null}
                                </span>
                                {item.title ? (
                                  <span className="trilha-history__item-title">
                                    <SafeMarkdown text={item.title} inline />
                                  </span>
                                ) : null}
                              </span>
                              <span aria-hidden="true">
                                {expanded ? '▾' : '▸'}
                              </span>
                            </button>

                            {expanded ? (
                              <div id={bodyId} className="trilha-history__expand">
                                <div className="trilha-content__body trilha-history__body">
                                  <SafeMarkdown text={item.body || '—'} />
                                </div>
                                {item.studentAnswer != null &&
                                item.studentAnswer !== '' ? (
                                  <p
                                    className="trilha-history__answer"
                                    aria-label="Sua resposta"
                                  >
                                    <span className="trilha-history__answer-label">
                                      Sua resposta:
                                    </span>{' '}
                                    <SafeMarkdown
                                      text={item.studentAnswer}
                                      inline
                                    />
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                          </li>
                        )
                      })}
                    </ol>
                  ) : null}
                </section>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
