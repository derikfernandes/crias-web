import {
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import {
  TRAIL_STAGE_QUESTIONS_COLLECTION,
  trailStageQuestionDocId,
} from './trailStageQuestionFirestore'
import { TRAIL_STAGES_COLLECTION, trailStageDocId } from './trailStageFirestore'
import { saveTrailWithStructure, TRAILS_COLLECTION } from './trailFirestore'
import { cellFieldsFromStep, type ActivityDraft } from './trailActivities'
import type { StructurePhase } from './trailEditor'
import { STUDENT_TRAILS_COLLECTION, studentTrailDocId } from './studentTrailFirestore'
import type { StudentTrail, StudentTrailStatus } from '../types/studentTrail'
import type { TrailStageQuestion } from '../types/trailStageQuestion'

/** Escritas da Gestão v1.1 na trilha (mesmas coleções e campos do banco atual). */

const BATCH_LIMIT = 400

type CellWrite =
  | { type: 'set'; id: string; data: Record<string, unknown> }
  | { type: 'delete'; id: string }

async function commitCells(ops: CellWrite[]): Promise<void> {
  if (!db) throw new Error('Firebase não inicializado.')
  const dbOk = db
  for (let start = 0; start < ops.length; start += BATCH_LIMIT) {
    const batch = writeBatch(dbOk)
    for (const op of ops.slice(start, start + BATCH_LIMIT)) {
      const ref = doc(dbOk, TRAIL_STAGE_QUESTIONS_COLLECTION, op.id)
      if (op.type === 'set') batch.set(ref, op.data, { merge: true })
      else batch.delete(ref)
    }
    await batch.commit()
  }
}

/** Células (uma por etapa) de uma atividade, prontas para gravar. */
export function activityCellWrites(trailId: string, activity: ActivityDraft): CellWrite[] {
  return activity.steps.map((step) => ({
    type: 'set' as const,
    id: trailStageQuestionDocId(trailId, step.stage, activity.number),
    data: {
      ...cellFieldsFromStep(activity, step),
      trail_id: trailId,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    },
  }))
}

/** Cadastro, ativa/inativa e demais campos simples da trilha. */
export async function patchTrail(
  trailId: string,
  patch: Partial<{
    name: string
    subject: string
    description: string
    active: boolean
    objective: string
    guidelines: string
  }>,
): Promise<void> {
  if (!db) throw new Error('Firebase não inicializado.')
  await updateDoc(doc(db, TRAILS_COLLECTION, trailId), {
    ...patch,
    updated_at: serverTimestamp(),
  })
}

/**
 * Grava a Configuração: objetivo, orientações, alternativas e estrutura de etapas.
 * Etapas além da nova quantidade saem de `trail_stages` e do conteúdo das atividades.
 */
export async function saveTrailConfig(input: {
  trailId: string
  objective: string
  guidelines: string
  optionsCount: number
  phases: StructurePhase[]
  existingCells: TrailStageQuestion[]
}): Promise<void> {
  if (!db) throw new Error('Firebase não inicializado.')
  const dbOk = db
  const { trailId, phases } = input
  if (phases.length < 1) throw new Error('A estrutura precisa de pelo menos uma etapa.')

  await runTransaction(dbOk, async (tx) => {
    const trailRef = doc(dbOk, TRAILS_COLLECTION, trailId)
    const trailSnap = await tx.get(trailRef)
    if (!trailSnap.exists()) throw new Error('A trilha não existe mais ou foi excluída.')
    const previous = trailSnap.data() as { default_total_steps_per_stage?: unknown }
    const prevSteps =
      typeof previous.default_total_steps_per_stage === 'number'
        ? Math.floor(previous.default_total_steps_per_stage)
        : 0

    const stageSnaps = new Map<number, Record<string, unknown> | null>()
    for (let i = 0; i < phases.length; i++) {
      const s = await tx.get(doc(dbOk, TRAIL_STAGES_COLLECTION, trailStageDocId(trailId, i + 1)))
      stageSnaps.set(i + 1, s.exists() ? (s.data() as Record<string, unknown>) : null)
    }

    tx.update(trailRef, {
      objective: input.objective,
      guidelines: input.guidelines,
      options_count: input.optionsCount,
      default_total_steps_per_stage: phases.length,
      phase_blueprint: phases.map((p) => ({
        title: p.title.trim(),
        stage_type: p.stage_type,
        prompt: p.stage_type === 'ai' ? p.prompt.trim() : null,
      })),
      updated_at: serverTimestamp(),
    })

    phases.forEach((p, i) => {
      const n = i + 1
      const old = stageSnaps.get(n) ?? null
      tx.set(
        doc(dbOk, TRAIL_STAGES_COLLECTION, trailStageDocId(trailId, n)),
        {
          trail_id: trailId,
          stage_number: n,
          title: p.title.trim(),
          stage_type: p.stage_type,
          prompt: p.stage_type === 'ai' ? p.prompt.trim() : null,
          is_released: typeof old?.is_released === 'boolean' ? old.is_released : false,
          active: typeof old?.active === 'boolean' ? old.active : true,
          created_at: old?.created_at ?? serverTimestamp(),
          updated_at: serverTimestamp(),
        },
        { merge: true },
      )
    })

    const stageMax = Math.max(prevSteps, ...input.existingCells.map((c) => c.stage_number), phases.length)
    for (let n = phases.length + 1; n <= stageMax; n++) {
      tx.delete(doc(dbOk, TRAIL_STAGES_COLLECTION, trailStageDocId(trailId, n)))
    }
  })

  const extra = input.existingCells.filter((c) => c.stage_number > phases.length)
  if (extra.length > 0) {
    await commitCells(extra.map((c) => ({ type: 'delete' as const, id: c.id })))
  }
}

/** Salva (cria ou substitui) as etapas de uma atividade. */
export async function saveActivity(trailId: string, activity: ActivityDraft): Promise<void> {
  await commitCells(activityCellWrites(trailId, activity))
}

/** Adiciona atividades novas. Nunca substitui nem apaga as que existem (1.1.6). */
export async function addActivities(
  trailId: string,
  activities: ActivityDraft[],
  existingNumbers: number[],
): Promise<void> {
  const taken = new Set(existingNumbers)
  const clash = activities.find((a) => taken.has(a.number))
  if (clash) {
    throw new Error(
      `A atividade ${clash.number} já existe. Importar e gerar só adicionam atividades novas.`,
    )
  }
  const ops = activities.flatMap((a) => activityCellWrites(trailId, a))
  await commitCells(ops)
}

/** Libera ou bloqueia uma atividade (todas as etapas dela). */
export async function setActivityReleased(
  cells: TrailStageQuestion[],
  released: boolean,
): Promise<void> {
  if (!db) throw new Error('Firebase não inicializado.')
  const dbOk = db
  for (let start = 0; start < cells.length; start += BATCH_LIMIT) {
    const batch = writeBatch(dbOk)
    for (const c of cells.slice(start, start + BATCH_LIMIT)) {
      batch.update(doc(dbOk, TRAIL_STAGE_QUESTIONS_COLLECTION, c.id), {
        is_released: released,
        updated_at: serverTimestamp(),
      })
    }
    await batch.commit()
  }
}

/**
 * Exclui uma atividade e renumera as seguintes, para a numeração continuar sem buracos
 * (a posição dos alunos é guardada pelo número da atividade).
 */
export async function removeActivity(
  trailId: string,
  number: number,
  allCells: TrailStageQuestion[],
): Promise<void> {
  const ops: CellWrite[] = []
  for (const c of allCells) {
    if (c.question_number === number) {
      ops.push({ type: 'delete', id: c.id })
    }
  }
  const later = allCells.filter((c) => c.question_number > number)
  for (const c of later) {
    const nextNumber = c.question_number - 1
    ops.push({ type: 'delete', id: c.id })
    ops.push({
      type: 'set',
      id: trailStageQuestionDocId(trailId, c.stage_number, nextNumber),
      data: {
        trail_id: trailId,
        stage_number: c.stage_number,
        question_number: nextNumber,
        title: c.title.replace(/Atividade\s+\d+/i, `Atividade ${nextNumber}`),
        step_title: c.step_title ?? '',
        content: c.content,
        correct_option: c.correct_option,
        options: c.options,
        explanation: c.explanation,
        annulled: c.annulled,
        annulled_at: c.annulled_at,
        annulled_reason: c.annulled_reason,
        is_released: c.is_released,
        active: c.active,
        created_at: c.created_at ?? serverTimestamp(),
        updated_at: serverTimestamp(),
      },
    })
  }
  // Excluir antes de regravar: o mesmo id pode ser apagado e recriado na mesma lista.
  const deletes = ops.filter((o) => o.type === 'delete')
  const sets = ops.filter((o) => o.type === 'set')
  await commitCells(deletes)
  await commitCells(sets)
}

/**
 * Cria a trilha (id sequencial t1, t2...), as etapas e as atividades da prévia.
 * Só é chamado em "Salvar trilha": antes disso nada é gravado (1.1.8 e orientação 2).
 */
export async function createTrailFromPreview(input: {
  institutionId: string
  name: string
  subject: string
  description: string
  objective: string
  guidelines: string
  optionsCount: number
  phases: StructurePhase[]
  activities: ActivityDraft[]
}): Promise<string> {
  if (!db) throw new Error('Firebase não inicializado.')
  const id = await saveTrailWithStructure({
    targetTrailId: null,
    institution_id: input.institutionId,
    name: input.name.trim(),
    description: input.description.trim(),
    subject: input.subject.trim(),
    default_total_steps_per_stage: input.phases.length,
    active: false,
    structurePhases: input.phases,
  })
  if (!id) throw new Error('Não foi possível criar a trilha.')
  await updateDoc(doc(db, TRAILS_COLLECTION, id), {
    objective: input.objective,
    guidelines: input.guidelines,
    options_count: input.optionsCount,
  })
  // Atividades da prévia: a primeira já nasce liberada; as outras bloqueadas até revisão.
  const released = input.activities.map((a, i) => ({ ...a, released: i === 0 }))
  await commitCells(released.flatMap((a) => activityCellWrites(id, a)))
  return id
}

/* ===== Alunos da trilha: vínculo ativo ou inativo ===== */

/**
 * Vínculo ativo = existe `student_trails` e o status não é "blocked".
 * Inativar bloqueia o acesso à trilha e mantém o histórico; o aluno continua na base.
 */
export function isLinkActive(link: StudentTrail | undefined): boolean {
  return Boolean(link) && link!.status !== 'blocked'
}

/** Status que o vínculo volta a ter ao reativar, segundo o progresso já feito. */
export function restoredStatus(link: StudentTrail): StudentTrailStatus {
  if (link.completed_at) return 'completed'
  if (link.started_at) return 'in_progress'
  return 'not_started'
}

/** Aplica de uma vez as trocas de Ativo/Inativo (aluno -> ativo?). */
export async function applyTrailStudentChanges(input: {
  trailId: string
  institutionId: string
  changes: Map<string, boolean>
  links: StudentTrail[]
}): Promise<{ created: number; activated: number; deactivated: number }> {
  if (!db) throw new Error('Firebase não inicializado.')
  const dbOk = db
  const byStudent = new Map(input.links.map((l) => [l.student_id, l]))
  const result = { created: 0, activated: 0, deactivated: 0 }
  const writes: Array<(batch: ReturnType<typeof writeBatch>) => void> = []

  for (const [studentId, wantActive] of input.changes) {
    const link = byStudent.get(studentId)
    const ref = doc(dbOk, STUDENT_TRAILS_COLLECTION, studentTrailDocId(studentId, input.trailId))
    if (wantActive) {
      if (!link) {
        result.created += 1
        writes.push((b) =>
          b.set(ref, {
            student_id: studentId,
            institution_id: input.institutionId,
            trail_id: input.trailId,
            current_stage_number: 1,
            current_question_number: 1,
            status: 'not_started',
            started_at: null,
            completed_at: null,
            last_interaction_at: null,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          }),
        )
      } else if (link.status === 'blocked') {
        result.activated += 1
        writes.push((b) => b.update(ref, { status: restoredStatus(link), updated_at: serverTimestamp() }))
      }
    } else if (link && link.status !== 'blocked') {
      result.deactivated += 1
      writes.push((b) => b.update(ref, { status: 'blocked', updated_at: serverTimestamp() }))
    }
  }

  for (let start = 0; start < writes.length; start += BATCH_LIMIT) {
    const batch = writeBatch(dbOk)
    writes.slice(start, start + BATCH_LIMIT).forEach((w) => w(batch))
    await batch.commit()
  }
  return result
}

/** Move os alunos marcados para uma atividade e etapa (alteração de posição em lote). */
export async function moveStudentsPosition(input: {
  linkIds: string[]
  stage: number
  question: number
}): Promise<void> {
  if (!db) throw new Error('Firebase não inicializado.')
  const dbOk = db
  for (let start = 0; start < input.linkIds.length; start += BATCH_LIMIT) {
    const batch = writeBatch(dbOk)
    for (const id of input.linkIds.slice(start, start + BATCH_LIMIT)) {
      batch.update(doc(dbOk, STUDENT_TRAILS_COLLECTION, id), {
        current_stage_number: input.stage,
        current_question_number: input.question,
        updated_at: serverTimestamp(),
        last_interaction_at: serverTimestamp(),
      })
    }
    await batch.commit()
  }
}

/* ===== Gabarito ===== */

/** Grava o gabarito (letra) de vários exercícios de uma vez. */
export async function saveCorrectOptions(changes: Map<string, string>): Promise<void> {
  if (!db) throw new Error('Firebase não inicializado.')
  const dbOk = db
  const entries = [...changes.entries()]
  for (let start = 0; start < entries.length; start += BATCH_LIMIT) {
    const batch = writeBatch(dbOk)
    for (const [id, letter] of entries.slice(start, start + BATCH_LIMIT)) {
      batch.update(doc(dbOk, TRAIL_STAGE_QUESTIONS_COLLECTION, id), {
        correct_option: letter.trim() || null,
        updated_at: serverTimestamp(),
      })
    }
    await batch.commit()
  }
}

/** Anula um exercício (fica fora do cálculo de acerto) ou volta atrás. */
export async function setAnnulled(
  cellId: string,
  annulled: boolean,
  reason = '',
): Promise<void> {
  if (!db) throw new Error('Firebase não inicializado.')
  await updateDoc(doc(db, TRAIL_STAGE_QUESTIONS_COLLECTION, cellId), {
    annulled,
    annulled_at: annulled ? serverTimestamp() : null,
    annulled_reason: annulled ? reason.trim() || 'Sem motivo informado' : null,
    updated_at: serverTimestamp(),
  })
}
