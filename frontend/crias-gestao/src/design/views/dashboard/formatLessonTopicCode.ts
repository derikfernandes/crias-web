/** Código legível na UI do dashboard, ex.: T3 A1. */
export function formatLessonTopicCode(
  topicNumber: number,
  lessonNumber: number,
): string {
  return `T${topicNumber} A${lessonNumber}`
}
