import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { CONVERSATION_LOGS_COLLECTION } from './conversationLogFirestore'
import type { TrailStage } from '../types/trailStage'

export type TopicPosition = { stage: number; question: number }

export type ForcedCompletionTarget = {
  studentId: string
  trailId: string
  stageNumber: number
  questionNumber: number
  /** Chave `trailId|stage|question` usada nas métricas. */
  key: string
  institutionId: string | null
}

export const FORCED_COMPLETION_METADATA_FLAG = 'forced_completion'
export const FORCED_COMPLETION_MESSAGE =
  'Tópico marcado como concluído automaticamente: todos os tópicos anteriores da aula foram feitos e o último não é exercício.'
export const FORCED_COMPLETION_EXPORT_TOPIC_LABEL = 'Conclusão forçada'
export const FORCED_COMPLETION_EXPORT_LESSON_LABEL = 'Sim (forçada)'

/** Chave `studentId|trailId|stage|question` para lookup no export. */
export function forcedCompletionStudentKey(
  studentId: string,
  trailId: string,
  stageNumber: number,
  questionNumber: number,
): string {
  return `${studentId}|${trailId}|${stageNumber}|${questionNumber}`
}

export function buildForcedCompletionLookup(
  forced: ForcedCompletionTarget[],
): Set<string> {
  const set = new Set<string>()
  for (const item of forced) {
    set.add(
      forcedCompletionStudentKey(
        item.studentId,
        item.trailId,
        item.stageNumber,
        item.questionNumber,
      ),
    )
  }
  return set
}

/** ID estável para não duplicar o marcador no histórico. */
export function forcedCompletionLogId(
  studentId: string,
  trailId: string,
  stageNumber: number,
  questionNumber: number,
): string {
  return `forced__${studentId}__${trailId}__${stageNumber}__${questionNumber}`
}

function filterTopics(
  trailId: string,
  positions: TopicPosition[],
  deselectedStages: Set<string>,
  deselectedQuestions: Set<number>,
): TopicPosition[] {
  return positions.filter(
    (p) =>
      !deselectedStages.has(`${trailId}|${p.stage}`) &&
      !deselectedQuestions.has(p.question),
  )
}

function groupTopicsByLesson(
  positions: TopicPosition[],
): Map<number, TopicPosition[]> {
  const byQuestion = new Map<number, TopicPosition[]>()
  for (const p of positions) {
    const arr = byQuestion.get(p.question)
    if (arr) arr.push(p)
    else byQuestion.set(p.question, [p])
  }
  return byQuestion
}

/**
 * Se a aula tem 2+ tópicos, todos menos o último feitos, e o último
 * não é exercício → o último tópico (e a aula) contam como feitos.
 */
export function getForcedTopicForLesson(
  trailId: string,
  topics: TopicPosition[],
  studentDone: Set<string>,
  stageByKey: Map<string, Pick<TrailStage, 'stage_type'>>,
): TopicPosition | null {
  if (topics.length < 2) return null

  const sorted = [...topics].sort((a, b) => a.stage - b.stage)
  const last = sorted[sorted.length - 1]
  const previous = sorted.slice(0, -1)

  const lastKey = `${trailId}|${last.stage}|${last.question}`
  if (studentDone.has(lastKey)) return null

  const allPreviousDone = previous.every((p) =>
    studentDone.has(`${trailId}|${p.stage}|${p.question}`),
  )
  if (!allPreviousDone) return null

  const stage = stageByKey.get(`${trailId}|${last.stage}`)
  if (!stage || stage.stage_type === 'exercise') return null

  return last
}

export function collectForcedCompletions(input: {
  doneByStudent: Map<string, Set<string>>
  trailsByStudent: Map<string, Iterable<string>>
  questionsByTrail: Map<string, TopicPosition[]>
  stageByKey: Map<string, Pick<TrailStage, 'stage_type'>>
  deselectedStages: Set<string>
  deselectedQuestions: Set<number>
  institutionId: string | null
}): {
  enrichedDoneByStudent: Map<string, Set<string>>
  forced: ForcedCompletionTarget[]
} {
  const forced: ForcedCompletionTarget[] = []
  const enrichedDoneByStudent = new Map<string, Set<string>>()

  for (const [studentId, baseDone] of input.doneByStudent) {
    enrichedDoneByStudent.set(studentId, new Set(baseDone))
  }

  for (const [studentId, trailIds] of input.trailsByStudent) {
    let doneSet = enrichedDoneByStudent.get(studentId)
    if (!doneSet) {
      doneSet = new Set()
      enrichedDoneByStudent.set(studentId, doneSet)
    }

    for (const trailId of trailIds) {
      const selected = filterTopics(
        trailId,
        input.questionsByTrail.get(trailId) ?? [],
        input.deselectedStages,
        input.deselectedQuestions,
      )

      for (const [, topics] of groupTopicsByLesson(selected)) {
        const forcedTopic = getForcedTopicForLesson(
          trailId,
          topics,
          doneSet,
          input.stageByKey,
        )
        if (!forcedTopic) continue

        const key = `${trailId}|${forcedTopic.stage}|${forcedTopic.question}`
        if (doneSet.has(key)) continue
        doneSet.add(key)
        forced.push({
          studentId,
          trailId,
          stageNumber: forcedTopic.stage,
          questionNumber: forcedTopic.question,
          key,
          institutionId: input.institutionId,
        })
      }
    }
  }

  return { enrichedDoneByStudent, forced }
}

export async function upsertForcedCompletionMarker(
  target: ForcedCompletionTarget,
): Promise<void> {
  if (!db) return

  const id = forcedCompletionLogId(
    target.studentId,
    target.trailId,
    target.stageNumber,
    target.questionNumber,
  )
  const ref = doc(db, CONVERSATION_LOGS_COLLECTION, id)
  const existing = await getDoc(ref)
  if (existing.exists()) return

  await setDoc(ref, {
    student_id: target.studentId,
    trail_id: target.trailId,
    stage_number: target.stageNumber,
    question_number: target.questionNumber,
    sender: 'system',
    message_text: FORCED_COMPLETION_MESSAGE,
    institution_id: target.institutionId,
    message_type: 'instruction',
    metadata: {
      [FORCED_COMPLETION_METADATA_FLAG]: true,
      reason: 'last_non_exercise_topic_missing',
    },
    created_at: serverTimestamp(),
  })
}
