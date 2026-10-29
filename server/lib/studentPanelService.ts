import type { Firestore } from 'firebase-admin/firestore'

import { resolveExerciseOptions } from './exerciseOptions.js'

/**
 * Painel individual do aluno (INTERFACE.md 1.1.8): só os dados do próprio aluno.
 * Lê as coleções que já existem: students, student_trails, trails, trail_stages,
 * trail_stage_questions, exercise_attempts e conversation_logs. Não grava nada.
 */

type Doc = Record<string, unknown>

export type PanelActivityState = 'done' | 'current' | 'released' | 'blocked'

export type PanelTrail = {
  trail_id: string
  name: string
  released: number
  done: number
  total: number
  pct: number | null
  activities: Array<{ number: number; title: string; state: PanelActivityState }>
}

export type PanelPerformance = {
  correct: number
  wrong: number
  pct: number | null
  by_trail: Array<{ trail_id: string; name: string; correct: number; wrong: number }>
  by_activity: Array<{ trail_id: string; number: number; correct: number; wrong: number }>
}

export type PanelError = {
  trail_id: string
  trail: string
  activity: number
  step: number
  statement: string
  answer: string
  correct: string
}

export type PanelMonitor = {
  questions: number
  days: number
  last: string | null
  by_trail: Array<{ trail_id: string; name: string; questions: number }>
  outside: number
}

export type PanelDoubt = {
  trail_id: string
  name: string
  activity: number | null
  count: number
  last_question: string
}

export type StudentPanel = {
  student: {
    id: string
    name: string
    phone: string
    email: string
    login_identifier: 'phone' | 'email' | null
  }
  trails: PanelTrail[]
  performance: PanelPerformance
  errors: PanelError[]
  monitor: PanelMonitor
  doubts: PanelDoubt[]
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const num = (v: unknown, d = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : d

function millis(v: unknown): number {
  if (v && typeof v === 'object' && 'toMillis' in v && typeof (v as { toMillis: unknown }).toMillis === 'function') {
    return (v as { toMillis: () => number }).toMillis()
  }
  return 0
}

export function letterOf(raw: unknown): string {
  const t = str(raw).trim()
  if (!t) return ''
  const m = /^\(?([A-Za-z])\)?(?:\s*[).:]|$)/.exec(t)
  if (m) return m[1].toUpperCase()
  const n = /^(\d{1,2})/.exec(t)
  if (n) {
    const i = Number.parseInt(n[1], 10) - 1
    if (i >= 0 && i < 26) return String.fromCharCode(65 + i)
  }
  return ''
}

function pct(a: number, b: number): number | null {
  return b > 0 ? Math.round((a / b) * 1000) / 10 : null
}

function activityTitle(raw: string, n: number): string {
  const parts = raw.split(' — ')
  const t = (parts.length >= 2 ? parts.slice(1).join(' — ') : raw).trim()
  return !t || /^(quest[aã]o|atividade|etapa)\s*\d+$/i.test(t) ? `Atividade ${n}` : t
}

export type PanelInput = {
  student: Doc & { id: string }
  links: Doc[]
  trails: Array<Doc & { id: string }>
  stages: Doc[]
  questions: Array<Doc & { id: string }>
  attempts: Doc[]
  logs: Doc[]
}

/** Monta o painel a partir dos documentos já lidos (função pura, testável). */
export function composeStudentPanel(input: PanelInput): StudentPanel {
  const trailName = new Map(input.trails.map((t) => [t.id, str(t.name) || t.id]))
  const exerciseStages = new Set(
    input.stages.filter((s) => s.stage_type === 'exercise').map((s) => `${str(s.trail_id)}|${num(s.stage_number)}`),
  )

  // Trilhas e atividades
  const byTrail = new Map<string, Array<Doc & { id: string }>>()
  for (const q of input.questions) {
    if (q.active === false) continue
    const id = str(q.trail_id)
    const list = byTrail.get(id) ?? []
    list.push(q)
    byTrail.set(id, list)
  }
  const trails: PanelTrail[] = input.links.map((link) => {
    const tid = str(link.trail_id)
    const cells = byTrail.get(tid) ?? []
    const numbers = [...new Set(cells.map((c) => num(c.question_number)))].sort((a, b) => a - b)
    const status = str(link.status)
    const current = num(link.current_question_number, 1)
    const activities = numbers.map((n) => {
      const group = cells.filter((c) => num(c.question_number) === n)
      const released = group.some((c) => c.is_released === true)
      let state: PanelActivityState = released ? 'released' : 'blocked'
      if (status === 'completed' || n < current) state = 'done'
      else if (n === current && status !== 'not_started') state = 'current'
      return { number: n, title: activityTitle(str(group[0]?.title), n), state }
    })
    const released = activities.filter((a) => a.state !== 'blocked').length
    const done = activities.filter((a) => a.state === 'done').length
    return {
      trail_id: tid,
      name: trailName.get(tid) ?? tid,
      released,
      done,
      total: activities.length,
      pct: pct(done, released),
      activities,
    }
  })

  // Desempenho: acertos e erros por exercício (anuladas ficam de fora)
  const qByKey = new Map(
    input.questions.map((q) => [`${str(q.trail_id)}|${num(q.stage_number)}|${num(q.question_number)}`, q]),
  )
  const latest = new Map<string, Doc>()
  for (const a of input.attempts) {
    const key = `${str(a.trail_id)}|${num(a.stage_number)}|${num(a.question_number)}`
    const prev = latest.get(key)
    if (!prev || millis(a.attempted_at) >= millis(prev.attempted_at)) latest.set(key, a)
  }
  let correct = 0
  let wrong = 0
  const trailAgg = new Map<string, { correct: number; wrong: number }>()
  const actAgg = new Map<string, { trail_id: string; number: number; correct: number; wrong: number }>()
  const wrongList: Array<{ at: number; error: PanelError }> = []
  for (const [key, a] of latest) {
    const q = qByKey.get(key)
    if (q?.annulled === true) continue
    const tid = str(a.trail_id)
    const ok = a.is_correct === true
    if (ok) correct += 1
    else wrong += 1
    const t = trailAgg.get(tid) ?? { correct: 0, wrong: 0 }
    ok ? (t.correct += 1) : (t.wrong += 1)
    trailAgg.set(tid, t)
    const n = num(a.question_number)
    const ak = `${tid}|${n}`
    const x = actAgg.get(ak) ?? { trail_id: tid, number: n, correct: 0, wrong: 0 }
    ok ? (x.correct += 1) : (x.wrong += 1)
    actAgg.set(ak, x)
    if (!ok) {
      const resolved = q ? resolveExerciseOptions(q.options, str(q.content)) : null
      const stageNumber = num(a.stage_number)
      wrongList.push({
        at: millis(a.attempted_at),
        error: {
          trail_id: tid,
          trail: trailName.get(tid) ?? tid,
          activity: n,
          step: stageNumber,
          statement: q ? str(q.content).split('\n')[0] : '',
          answer: letterOf(a.student_answer) || str(a.student_answer),
          correct: letterOf(a.correct_option) || letterOf(q?.correct_option),
        },
      })
      void resolved
      void exerciseStages
    }
  }
  wrongList.sort((a, b) => b.at - a.at)

  // Monitor: perguntas do aluno (metadata.source = maria-tutor)
  const asks = input.logs.filter(
    (l) => l.sender === 'student' && (l.metadata as Doc | null)?.source === 'maria-tutor',
  )
  const days = new Set(asks.map((l) => new Date(millis(l.created_at)).toISOString().slice(0, 10)))
  const lastMs = asks.reduce((m, l) => Math.max(m, millis(l.created_at)), 0)
  const real = (tid: string) => trailName.has(tid)
  const monTrail = new Map<string, number>()
  let outside = 0
  for (const l of asks) {
    const tid = str(l.trail_id)
    if (real(tid)) monTrail.set(tid, (monTrail.get(tid) ?? 0) + 1)
    else outside += 1
  }
  const doubtMap = new Map<string, PanelDoubt & { at: number }>()
  for (const l of asks) {
    const tid = str(l.trail_id)
    if (!real(tid)) continue
    const n = num(l.question_number, 0) || null
    const key = `${tid}|${n ?? 0}`
    const d = doubtMap.get(key) ?? {
      trail_id: tid,
      name: trailName.get(tid) ?? tid,
      activity: n,
      count: 0,
      last_question: '',
      at: 0,
    }
    d.count += 1
    const at = millis(l.created_at)
    if (at >= d.at) {
      d.at = at
      d.last_question = str(l.message_text)
    }
    doubtMap.set(key, d)
  }

  const loginIdentifierRaw = input.student.login_identifier
  const login_identifier =
    loginIdentifierRaw === 'phone' || loginIdentifierRaw === 'email'
      ? loginIdentifierRaw
      : null
  return {
    student: {
      id: input.student.id,
      name: str(input.student.name),
      phone: str(input.student.phone_number),
      email: str(input.student.email).trim().toLowerCase(),
      login_identifier,
    },
    trails,
    performance: {
      correct,
      wrong,
      pct: pct(correct, correct + wrong),
      by_trail: [...trailAgg].map(([tid, v]) => ({ trail_id: tid, name: trailName.get(tid) ?? tid, ...v })),
      by_activity: [...actAgg.values()].sort((a, b) => a.number - b.number),
    },
    errors: wrongList.slice(0, 5).map((w) => w.error),
    monitor: {
      questions: asks.length,
      days: days.size,
      last: lastMs ? new Date(lastMs).toISOString() : null,
      by_trail: [...monTrail].map(([tid, questions]) => ({ trail_id: tid, name: trailName.get(tid) ?? tid, questions })),
      outside,
    },
    doubts: [...doubtMap.values()]
      .sort((a, b) => b.count - a.count)
      .map(({ at: _at, ...d }) => d),
  }
}

/** Lê o que o painel precisa do Firestore e monta a resposta. */
export async function buildStudentPanel(db: Firestore, studentId: string): Promise<StudentPanel | null> {
  const studentSnap = await db.collection('students').doc(studentId).get()
  if (!studentSnap.exists) return null
  const student = { id: studentSnap.id, ...(studentSnap.data() as Doc) }
  const linksSnap = await db.collection('student_trails').where('student_id', '==', studentId).get()
  const links = linksSnap.docs.map((d) => d.data() as Doc)
  const trailIds = [...new Set(links.map((l) => str(l.trail_id)).filter(Boolean))]
  const read = async (col: string, ids: string[]) => {
    const out: Array<Doc & { id: string }> = []
    for (let i = 0; i < ids.length; i += 10) {
      const snap = await db.collection(col).where('trail_id', 'in', ids.slice(i, i + 10)).get()
      snap.docs.forEach((d) => out.push({ id: d.id, ...(d.data() as Doc) }))
    }
    return out
  }
  const trails: Array<Doc & { id: string }> = []
  for (const id of trailIds) {
    const t = await db.collection('trails').doc(id).get()
    if (t.exists) trails.push({ id: t.id, ...(t.data() as Doc) })
  }
  const [stages, questions] = trailIds.length
    ? await Promise.all([read('trail_stages', trailIds), read('trail_stage_questions', trailIds)])
    : [[], []]
  const attempts = (await db.collection('exercise_attempts').where('student_id', '==', studentId).get()).docs.map(
    (d) => d.data() as Doc,
  )
  const logs = (await db.collection('conversation_logs').where('student_id', '==', studentId).get()).docs.map(
    (d) => d.data() as Doc,
  )
  return composeStudentPanel({ student, links, trails, stages, questions, attempts, logs })
}
