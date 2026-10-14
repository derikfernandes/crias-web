import { formatLessonTopicCode } from './formatLessonTopicCode'

export function LessonTopicCode({
  topicNumber,
  lessonNumber,
  content,
  title,
}: {
  topicNumber: number
  lessonNumber: number
  content: string
  title?: string
}) {
  const label = formatLessonTopicCode(topicNumber, lessonNumber)
  const enunciado = content.trim() || title?.trim() || ''
  if (!enunciado) {
    return <code>{label}</code>
  }
  return (
    <span className="dashboard-lesson-topic-tip">
      <code className="dashboard-lesson-topic-tip__code">{label}</code>
      <span className="dashboard-lesson-topic-tip__popup" role="tooltip">
        {enunciado}
      </span>
    </span>
  )
}
