import type { ReactNode } from 'react'

export type TrailStageQuestionsRow = {
  id: string
  questionNumber: number
  title: string
  releasedLabel: string
  activeLabel: string
  updatedAtLabel: string
}

export type TrailStageQuestionsPageViewProps =
  | { status: 'missing-trail-id' }
  | { status: 'invalid-stage' }
  | {
      status: 'ok'
      trailBackHref: string
      trailBackLabel: string
      trailError: string | null
      loadingTrail: boolean
      trailNotFound: boolean
      trailLede: ReactNode | null
      stageError: string | null
      loadingStage: boolean
      stageNotFound: boolean
      showForm: boolean
      formSlot?: ReactNode
      formLoading: boolean
      loadingQuestions: boolean
      questionsError: string | null
      questionRows: TrailStageQuestionsRow[]
      emptyListPath: string
      onNewQuestion: () => void
      onEditQuestion: (questionId: string) => void
    }
