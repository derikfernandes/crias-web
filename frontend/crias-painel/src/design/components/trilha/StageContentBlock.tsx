import { SafeMarkdown } from './SafeMarkdown'

export type StageContentBlockProps = {
  title?: string | null
  body: string
  stageType: 'fixed' | 'exercise' | 'ai'
  aiHint?: boolean
}

export function StageContentBlock({
  title,
  body,
  stageType,
  aiHint = false,
}: StageContentBlockProps) {
  return (
    <article className="trilha-content" data-stage-type={stageType}>
      {title ? <h2 className="trilha-content__title">{title}</h2> : null}
      {aiHint || stageType === 'ai' ? (
        <p className="trilha-content__ai-hint">Atividade com IA</p>
      ) : null}
      <div className="trilha-content__body">
        <SafeMarkdown text={body} />
      </div>
    </article>
  )
}
