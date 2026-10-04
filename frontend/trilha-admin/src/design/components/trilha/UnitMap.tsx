import { useEffect, useMemo, useState } from 'react'
import { paginateList } from '../../../lib/trilha/listPagination'
import {
  UNIT_MAP_STAGE_PAGE_SIZE,
  type UnitSection,
} from '../../../lib/trilha/unitMap'
import { ListPager } from './ListPager'
import { UnitMapSectionSteps } from './UnitMapSectionSteps'

export type UnitMapProps = {
  sections: UnitSection[]
  currentAnchorId?: string
  /** Fases (`stage_number`) visíveis por página. */
  stagePageSize?: number
}

export function UnitMap({
  sections,
  currentAnchorId = 'trilha-unit-current',
  stagePageSize = UNIT_MAP_STAGE_PAGE_SIZE,
}: UnitMapProps) {
  const anchorIndex = useMemo(
    () => sections.findIndex((s) => s.status === 'current'),
    [sections],
  )

  const [page, setPage] = useState(1)
  const slice = useMemo(
    () => paginateList(sections, page, stagePageSize),
    [sections, page, stagePageSize],
  )

  useEffect(() => {
    if (sections.length === 0) return
    const idx = anchorIndex >= 0 ? anchorIndex : 0
    setPage(paginateList(sections, 1, stagePageSize).pageForIndex(idx))
  }, [anchorIndex, sections, stagePageSize])

  const [open, setOpen] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {}
    for (const s of sections) {
      init[s.stageNumber] = !s.collapsed
    }
    return init
  })

  if (sections.length === 0) return null

  return (
    <section className="trilha-unit" aria-labelledby="trilha-unit-heading">
      <h2 id="trilha-unit-heading" className="trilha-unit__heading">
        Percurso por etapa
      </h2>
      <p className="trilha-unit__lead muted">
        Cada <strong>etapa</strong> é uma fase da trilha; cada{' '}
        <strong>questão</strong> é uma aula. Só a etapa atual lista aulas — sem
        spoiler do conteúdo futuro.
      </p>
      {sections.length > stagePageSize ? (
        <ListPager
          page={slice.page}
          totalPages={slice.totalPages}
          totalItems={slice.totalItems}
          onPageChange={setPage}
          label="Fases (etapas)"
        />
      ) : null}
      <div className="trilha-unit__sections">
        {slice.items.map((section) => {
          const isOpen = open[section.stageNumber] ?? !section.collapsed
          const canToggle =
            section.status === 'done' ||
            (section.status === 'ahead' && section.steps.length === 0) ||
            section.steps.length > 0
          const panelId = `trilha-unit-panel-${section.stageNumber}`

          return (
            <div
              key={section.stageNumber}
              className={`trilha-unit__section trilha-unit__section--${section.status}`}
            >
              <button
                type="button"
                className="trilha-unit__toggle"
                aria-expanded={isOpen}
                aria-controls={panelId}
                disabled={section.status === 'ahead' && section.steps.length === 0}
                onClick={() =>
                  setOpen((prev) => ({
                    ...prev,
                    [section.stageNumber]: !isOpen,
                  }))
                }
              >
                <span className="trilha-unit__toggle-label">
                  {section.summary}
                </span>
                {canToggle && section.status !== 'ahead' ? (
                  <span className="trilha-unit__chevron" aria-hidden="true">
                    {isOpen ? '▾' : '▸'}
                  </span>
                ) : null}
              </button>

              {isOpen && section.steps.length > 0 ? (
                <UnitMapSectionSteps
                  section={section}
                  steps={section.steps}
                  panelId={panelId}
                  currentAnchorId={currentAnchorId}
                />
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
