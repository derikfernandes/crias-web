/**
 * API simulada no navegador (só com VITE_MOCK_FIREBASE=1): responde às rotas /api/* que a Gestão
 * usa, lendo e gravando o mesmo Firestore em memória.
 */
import { deleteDocData, listCollection, notify, readDoc, updateDocData } from './store'

type Data = Record<string, unknown>
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const PW_CH = 'abcdefghjkmnpqrstuvwxyz23456789'
const gen = () => Array.from({ length: 8 }, () => PW_CH[Math.floor(Math.random() * PW_CH.length)]).join('')

function studentsOf(inst: string) {
  return listCollection('students').filter(([, s]) => s.institution_id === inst)
}
function rowOf(id: string, s: Data) {
  const pw = typeof s.password_plain === 'string' ? s.password_plain : null
  return {
    id,
    name: s.name,
    phone_number: s.phone_number,
    institution_id: s.institution_id,
    active: s.active,
    password: pw,
    has_password_hash: Boolean(s.password_hash) || Boolean(pw),
    has_password_encrypted: Boolean(pw),
  }
}
function setPassword(id: string, pw: string) {
  updateDocData(`students/${id}`, { password_plain: pw, password_hash: 'scrypt$mock$mock' })
}
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    rows.push(line.split(',').map((c) => c.replace(/^"|"$/g, '').trim()))
  }
  return rows
}

const PROMPTS: Record<string, { title: string; description: string; body: string; version: number; source: string; versions: Array<{ version: number; body: string; note: string; by: string; at: string }> }> = {
  parceiro_estudo: { title: 'Monitor', description: 'System prompt da conversa livre com o monitor (app do aluno).', body: 'Você é o monitor do Crias. Responda em português do Brasil, com frases curtas e claras.', version: 4, source: 'firestore', versions: [{ version: 3, body: 'Você é o monitor do Crias.', note: 'Versão inicial', by: 'sistema', at: '12/08/2026' }] },
  gerador_trilha: { title: 'Gerador de etapas da trilha', description: 'Gera o texto de cada etapa de uma atividade.', body: 'Gere as etapas de uma atividade a partir do material.', version: 2, source: 'firestore', versions: [] },
  spacing_rules: { title: 'Regras de espaçamento', description: 'Ritmo das mensagens.', body: 'Parágrafos de até três frases. Uma ideia por mensagem.', version: 1, source: 'firestore', versions: [] },
  criar_trilha_ia: { title: 'Criar trilha com IA (fixo do sistema)', description: 'Não editável e invisível para a escola.', body: 'Crie atividades a partir da Configuração de geração: [nome], [materia], [descricao], [objetivo], [conteudos], [exercicios], [ordem], [atividades], [alternativas], [habilidades], [orientacoes], [arquivos].', version: 3, source: 'firestore', versions: [] },
  criar_trilha_ia_system: { title: 'Criar trilha com IA (instruções do sistema)', description: 'Instrução de sistema da geração.', body: 'Responda só com JSON válido.', version: 1, source: 'firestore', versions: [] },
}

async function handle(url: URL, init?: RequestInit): Promise<Response | null> {
  const path = url.pathname
  const method = (init?.method ?? 'GET').toUpperCase()
  const body = init?.body && typeof init.body === 'string' ? (JSON.parse(init.body) as Data) : {}
  const action = url.searchParams.get('action') ?? ''

  if (path === '/api/student_passwords') {
    if (method === 'GET' && action === 'list') {
      return json({ students: studentsOf(url.searchParams.get('institution_id') ?? '').map(([id, s]) => rowOf(id, s)) })
    }
    if (method === 'GET' && action === 'export_csv') {
      const inst = url.searchParams.get('institution_id') ?? ''
      const school = url.searchParams.get('school_name') ?? inst
      const lines = ['escola,nome,celular,senha', ...studentsOf(inst).map(([, s]) => [school, s.name, s.phone_number, s.password_plain ?? ''].join(','))]
      return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/csv' } })
    }
    if (method === 'POST' && action === 'regenerate') {
      const id = String(body.student_id)
      const pw = gen()
      setPassword(id, pw)
      notify()
      const s = readDoc(`students/${id}`) ?? {}
      return json({ id, password: pw, name: s.name, phone_number: s.phone_number })
    }
    if (method === 'POST' && action === 'bulk_generate') {
      const inst = String(body.institution_id)
      const missing = studentsOf(inst).filter(([, s]) => !s.password_plain)
      if (body.dry_run) return json({ dry_run: true, scanned: missing.length, would_update: missing.length, updated: 0, skipped_existing: 0, remaining: 0, next_cursor: null, done: true, rows: [] })
      missing.forEach(([id]) => setPassword(id, gen()))
      notify()
      return json({ dry_run: false, scanned: missing.length, would_update: missing.length, updated: missing.length, skipped_existing: 0, remaining: 0, next_cursor: null, done: true, rows: [] })
    }
    if (method === 'POST' && action === 'import_csv') {
      const rows = parseCsv(String(body.csv ?? ''))
      const [, ...data] = rows
      let updated = 0
      const errors: Array<{ line: number; error: string }> = []
      data.forEach((r, i) => {
        const [, , phone, pw] = r
        const found = listCollection('students').find(([, s]) => String(s.phone_number).endsWith(String(phone).replace(/\D/g, '').slice(-9)))
        if (!found) errors.push({ line: i + 2, error: 'Aluno não encontrado.' })
        else {
          setPassword(found[0], pw || gen())
          updated += 1
        }
      })
      notify()
      return json({ ok: true, created: 0, updated, errors, generated: [], generated_csv: '' })
    }
  }

  if (path === '/api/dashboard_metrics' && method === 'GET') {
    const inst = url.searchParams.get('institution_id') ?? ''
    const stu = studentsOf(inst).filter(([, s]) => s.active !== false)
    const trails = listCollection('trails').filter(([, t]) => t.institution_id === inst)
    const links = listCollection('student_trails').filter(([, l]) => l.institution_id === inst)
    const students = stu.map(([id, s], i) => {
      const mine = links.filter(([, l]) => l.student_id === id)
      const released = mine.length * 4
      const done = Math.min(released, mine.reduce((n, [, l]) => n + Number(l.current_stage_number ?? 1), 0))
      const correct = (i * 3) % 9
      const wrong = (i * 5) % 4
      return {
        id, name: s.name, active: true, done, released,
        lessons_done: Math.floor(done / 4), lessons_released: mine.length,
        correct, wrong, accuracy_pct: correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : null,
      }
    })
    const done = students.reduce((n, s) => n + s.done, 0)
    const released = students.reduce((n, s) => n + s.released, 0)
    const correct = students.reduce((n, s) => n + s.correct, 0)
    const wrong = students.reduce((n, s) => n + s.wrong, 0)
    const pills = trails.flatMap(([tid, t]) =>
      [1, 2, 3].map((q) => ({ key: `${tid}|${q}`, trail_id: tid, trail_name: t.name, stage_number: 4, question_number: q, title: `Exercício ${q}`, gabarito: 'B', total: 20 + q, correct: 10 + q * 3, wrong: 10 - q, accuracy_pct: Math.round(((10 + q * 3) / (20 + q)) * 100) })),
    )
    const agent = (days: number) => ({ period_days: days, total_messages: 75, unique_students: Math.min(students.length, 21), agents: [], series: [] })
    return json({
      institution_id: inst, computed_at: Date.now(), active_students: students.length, active_trails: trails.length,
      avg_completion: released ? Math.round((done / released) * 100) : null, avg_lesson_completion: 40,
      completion_done: done, completion_released: released, lesson_completion_done: 10, lesson_completion_released: 30,
      avg_accuracy: correct + wrong ? Math.round((correct / (correct + wrong)) * 100) : null, accuracy_correct: correct, accuracy_tried: correct + wrong,
      exercise_count: pills.length, worst_pills: pills.slice(0, 3), best_pills: pills.slice(-3), exercise_pills: pills, stage_bars: [],
      students, agent_usage_by_period: { '0': agent(0), '7': agent(7), '30': agent(30) },
    })
  }

  if (path === '/api/dashboard_summary' && method === 'GET') {
    const inst = url.searchParams.get('institution_id') ?? ''
    const trailIds = [...new Set(listCollection('trails').filter(([, t]) => t.institution_id === inst).map(([id]) => id))]
    const students: Record<string, { answers: Record<string, string>; extra_done: string[] }> = {}
    for (const [, a] of listCollection('exercise_attempts')) {
      if (a.institution_id !== inst) continue
      const sid = String(a.student_id)
      const idx = trailIds.indexOf(String(a.trail_id))
      if (idx < 0) continue
      students[sid] ??= { answers: {}, extra_done: [] }
      students[sid].answers[`${idx}|${a.stage_number}|${a.question_number}`] = String(a.student_answer)
      // etapas de conteúdo anteriores contam como feitas
      for (let st = 1; st < Number(a.stage_number); st++) students[sid].extra_done.push(`${idx}|${st}|${a.question_number}`)
    }
    const agents = trailIds.map((t, i) => ({ trail_id: t, label: `Monitor · ${(readDoc(`trails/${t}`) ?? {}).name}`, messages: 12 + i * 5, unique_students: 6 + i, pct_of_total: 30, last_activity: '2026-10-12', student_ids: Object.keys(students).slice(0, 6 + i) }))
    return json({ trail_ids: trailIds, students, agent_usage: { period_days: Number(url.searchParams.get('period_days') ?? 0), total_messages: agents.reduce((n, a) => n + a.messages, 0), agents, series: [] } })
  }

  if (path === '/api/student' && method === 'PUT') {
    setPassword(url.searchParams.get('id') ?? '', String(body.password ?? ''))
    notify()
    return json({ ok: true })
  }
  if (path === '/api/trails' && method === 'DELETE') {
    const id = url.searchParams.get('id') ?? ''
    for (const col of ['trail_stages', 'trail_stage_questions', 'student_trails']) {
      for (const [docId, d] of listCollection(col)) if (d.trail_id === id) deleteDocData(`${col}/${docId}`)
    }
    deleteDocData(`trails/${id}`)
    notify()
    return new Response(null, { status: 204 })
  }

  if (path === '/api/ai_trail_generate' && method === 'POST') {
    const vars = (body.variables ?? {}) as Record<string, string>
    const structure = (body.structure ?? []) as string[]
    const count = Math.max(1, Number.parseInt(vars.atividades ?? '3', 10) || 3)
    const options = Math.max(2, Number.parseInt(vars.alternativas ?? '4', 10) || 4)
    const activities = Array.from({ length: count }, (_, i) => ({
      title: `${vars.habilidades && vars.habilidades !== 'N/A' ? vars.habilidades.slice(0, 40) : vars.nome} ${i + 1}`,
      steps: structure.map((k, s) =>
        k === 'exercise'
          ? { kind: 'exercise', content: `Exercício ${s + 1} da atividade ${i + 1}: qual é a resposta correta?`, options: Array.from({ length: options }, (_, o) => `Alternativa ${String.fromCharCode(65 + o)}`), correct: 'A' }
          : { kind: 'content', title: `Conteúdo ${s + 1}`, content: `Texto gerado para a etapa ${s + 1} da atividade ${i + 1} (objetivo: ${vars.objetivo}).` },
      ),
    }))
    await new Promise((r) => setTimeout(r, 600))
    return json({ ok: true, activities, model: 'mock', received: { vars, files: Array.isArray(body.files) ? body.files.length : 0, mode: body.mode } })
  }

  if (path === '/api/ai_prompts') {
    if (method === 'GET' && action === 'versions') {
      const p = PROMPTS[url.searchParams.get('id') ?? '']
      return json({ versions: p ? p.versions.map((v) => ({ version: v.version, body: v.body, note: v.note, updated_by_email: v.by, updated_by_uid: null, updated_at: v.at })) : [] })
    }
    if (method === 'GET') {
      return json({ prompts: Object.entries(PROMPTS).map(([id, p]) => ({ id, title: p.title, description: p.description, body: p.body, version: p.version, source: p.source, updated_by_email: 'coordenacao@escola.org', updated_by_uid: null, updated_at: '10/10/2026 16:42' })) })
    }
    if (method === 'POST' && action === 'update') {
      const p = PROMPTS[String(body.id)]
      if (p) {
        p.versions.unshift({ version: p.version, body: p.body, note: String(body.note ?? ''), by: 'coordenacao@escola.org', at: new Date().toLocaleString('pt-BR') })
        p.body = String(body.body ?? '')
        p.version += 1
        return json({ prompt: { id: body.id, title: p.title, description: p.description, body: p.body, version: p.version, source: 'firestore', updated_by_email: 'coordenacao@escola.org', updated_by_uid: null, updated_at: new Date().toLocaleString('pt-BR') } })
      }
    }
    if (method === 'POST' && action === 'seed') return json({ seeded: [], skipped: Object.keys(PROMPTS), forced: [] })
  }
  return null
}

const realFetch = globalThis.fetch.bind(globalThis)
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const url = new URL(raw, window.location.origin)
    if (url.pathname.startsWith('/api/')) {
      const res = await handle(url, init)
      if (res) return res
    }
  } catch (e) {
    console.warn('[mock api]', e)
  }
  return realFetch(input as RequestInfo, init)
}) as typeof fetch
