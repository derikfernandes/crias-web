import { useEffect, useMemo, useState } from 'react'
import { paginateList } from '../../../lib/trilha/listPagination'
import {
  stepTypeLabel,
  UNIT_MAP_QUESTION_PAGE_SIZE,
  type UnitSection,
  type UnitStepNode,
} from '../../../lib/trilha/unitMap'
import { ListPager } from './ListPager'

export type UnitMapSectionStepsProps = {
  section: UnitSection
  steps: UnitStepNode[]
  panelId: string
  currentAnchorId: string
  questionPageSize?: number
}

export function UnitMapSectionSteps({
  section,
  steps,
  panelId,
  currentAnchorId,
  questionPageSize = UNIT_MAP_QUESTION_PAGE_SIZE,
}: UnitMapSectionStepsProps) {
  const focusIdx = useMemo(
    () =>
      steps.findIndex(
        (st) => st.state === 'current' || st.state === 'paused',
      ),
    [steps],
  )

  const [qPage, setQPage] = useState(1)
  const qSlice = useMemo(
    () => paginateList(steps, qPage, questionPageSize),
    [steps, qPage, questionPageSize],
  )

  useEffect(() => {
    if (steps.length === 0) return
    const idx = focusIdx >= 0 ? focusIdx : 0
    setQPage(paginateList(steps, 1, questionPageSize).pageForIndex(idx))
  }, [focusIdx, steps, questionPageSize])

  return (
    <>
      {steps.length > questionPageSize ? (
        <ListPager
          page={qSlice.page}
          totalPages={qSlice.totalPages}
          totalItems={qSlice.totalItems}
          onPageChange={setQPage}
          label={`Aulas na etapa ${section.stageNumber}`}
        />
      ) : null}
      <ol id={panelId} className="trilha-unit__steps">
        {qSlice.items.map((step) => {
          const isFocus =
            step.state === 'current' || step.state === 'paused'
          const typeLabel = stepTypeLabel(step.stepType)
          return (
            <li
              key={`${step.stageNumber}-${step.questionNumber}`}
              id={isFocus ? currentAnchorId : undefined}
              className={`trilha-unit__step trilha-unit__step--${step.state}`}
              aria-current={isFocus ? 'step' : undefined}
            >
              <span
                className="trilha-unit__dot"
                aria-hidden="true"
                data-state={step.state}
              />
              <span className="trilha-unit__step-body">
                <span className="trilha-unit__step-title">
                  {step.state === 'done' && step.title
                    ? step.title
                    : step.state === 'current'
                      ? 'Agora'
                      : step.state === 'paused'
                        ? 'Pausado'
                        : step.state === 'upcoming'
                          ? 'Próximo'
                          : `Aula ${step.questionNumber}`}
                </span>
                <span className="trilha-unit__step-meta muted">
                  Questão {step.questionNumber}
                  {typeLabel ? ` · ${typeLabel}` : null}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
      {steps.length > questionPageSize ? (
        <p className="trilha-unit__more muted">
          {steps.length} aulas nesta fase — {questionPageSize} por página.
        </p>
      ) : null}
    </>
  )
}
