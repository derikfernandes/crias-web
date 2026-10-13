// Servidor de exemplo para ver e testar o app do aluno no computador.
// Dados fictícios (aluna "Ana", 3 trilhas). Não fala com nenhum banco nem API real.
// Uso: node frontend/crias-aluno/dev/mock-api.mjs   (e, em outro terminal) npm run dev -w crias-aluno
// Depois abra http://localhost:5174/aluno/ e entre com qualquer login e senha (6+ caracteres).
import http from 'node:http'
import { URL } from 'node:url'

const STUDENT = {
  status: 'ok',
  student_id: 's1',
  institution_id: 'i1',
  name: 'Ana Souza',
  active: true,
  phone_number: '5511999999999',
}

// trilha -> { nome, atividades (question), etapas (stage) }
const TRAILS = {
  t1: { name: 'Matemática básica', questions: 4, stages: 4 },
  t2: { name: 'Português: leitura e texto', questions: 3, stages: 4 },
  t3: { name: 'Ciências da natureza', questions: 2, stages: 4 },
}
const pos = {
  t1: { stage: 2, question: 2, status: 'in_progress', version: 1 },
  t2: { stage: 1, question: 1, status: 'not_started', version: 1 },
  t3: { stage: 1, question: 1, status: 'completed', version: 1 },
}
const logs = []
let logId = 1

// Conversa antiga na trilha t1 (atividade 1 completa, mais perguntas ao monitor), para ver o
// histórico da trilha toda e a carga automática ao subir.
;(function seed() {
  const t0 = Date.now() - 1000 * 60 * 60 * 24
  let i = 0
  const add = (o) => logs.push({ id: `seed${i}`, created_at_ms: t0 + i++ * 1000, student_id: 's1', trail_id: 't1', institution_id: 'i1', ...o })
  for (let st = 1; st <= 4; st++) {
    if (st === 3) {
      add({ stage_number: 3, question_number: 1, sender: 'system', message_type: 'exercise', message_text: 'Qual fração representa um quarto de uma barra de chocolate com 8 pedaços?\n\nA) 1/8\nB) 2/8\nC) 4/8\nD) 8/8', metadata: { source: 'next-content', stage_type: 'exercise' } })
      add({ stage_number: 3, question_number: 1, sender: 'student', message_type: 'exercise', message_text: '2/8', metadata: { source: 'exercise_attempt', is_correct: true } })
      add({ stage_number: 3, question_number: 1, sender: 'system', message_type: 'feedback', message_text: 'Isso mesmo! 2/8 é igual a 1/4.', metadata: { source: 'exercise_feedback', is_correct: true } })
    } else {
      add({ stage_number: st, question_number: 1, sender: 'system', message_type: 'instruction', message_text: `Etapa ${st}\n\nTexto de apoio ${st}: frações representam partes de um todo, e aparecem no dia a dia.`, metadata: { source: 'next-content', stage_type: 'fixed' } })
    }
    for (let k = 1; k <= 12; k++) {
      add({ stage_number: st, question_number: 1, sender: 'student', message_type: 'text', message_text: `Pergunta ${st}.${k} ao monitor`, metadata: { source: 'maria-tutor', channel: 'app' } })
      add({ stage_number: st, question_number: 1, sender: 'system', message_type: 'text', message_text: `Resposta ${st}.${k} do monitor, explicando com calma.`, metadata: { source: 'maria-tutor', channel: 'app' } })
    }
  }
  add({ stage_number: 1, question_number: 2, sender: 'system', message_type: 'instruction', message_text: 'Etapa 1\n\nVamos comparar frações.', metadata: { source: 'next-content', stage_type: 'fixed' } })
})()

function titleFor(trail, q) {
  const names = ['Frações no dia a dia', 'Comparando frações', 'Operações com frações', 'Revisão geral']
  return `${names[(q - 1) % names.length]}`
}

function content(trail, stage, question) {
  const t = TRAILS[trail]
  if (stage === 3) {
    return {
      status: 'ok',
      student_id: 's1',
      trail_id: trail,
      stage_number: stage,
      question_number: question,
      stage_type: 'exercise',
      stage_title: 'Exercício',
      prompt: null,
      content:
        'Qual fração representa metade de uma pizza dividida em 8 fatias iguais?\n\nA) 2/8\nB) 4/8\nC) 6/8\nD) 8/8',
      options: [
        { key: 'A', text: '2/8' },
        { key: 'B', text: '4/8' },
        { key: 'C', text: '6/8' },
        { key: 'D', text: '8/8' },
      ],
      explanation: null,
      is_released: true,
      next_action: 'deliver_exercise',
      progress_version: pos[trail].version,
    }
  }
  const body = {
    1: `*${titleFor(trail, question)}*\n\nVamos começar entendendo onde as frações aparecem na sua rotina: dividir uma pizza, repartir uma conta, medir uma receita.\n\n➡️ _Leia com calma e aperte Continuar._`,
    2: `Uma fração tem duas partes: o *numerador* (quantas partes você pegou) e o *denominador* (em quantas partes o todo foi dividido).\n\nPor exemplo, 3/4 significa 3 partes de um todo dividido em 4.`,
    4: `Muito bem! Você viu como ler, comparar e usar frações.\n\nNa próxima atividade vamos praticar com situações do mercado e da cozinha.`,
  }[stage]
  return {
    status: 'ok',
    student_id: 's1',
    trail_id: trail,
    stage_number: stage,
    question_number: question,
    stage_type: 'fixed',
    stage_title: `Etapa ${stage}`,
    prompt: null,
    content: body,
    options: null,
    explanation: null,
    is_released: true,
    next_action: 'deliver_content',
    progress_version: pos[trail].version,
  }
}

function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve) => {
    let d = ''
    req.on('data', (c) => (d += c))
    req.on('end', () => {
      try {
        resolve(d ? JSON.parse(d) : {})
      } catch {
        resolve({})
      }
    })
  })
}

http
  .createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x')
    const p = u.pathname.replace(/\/$/, '')
    const q = u.searchParams
    await new Promise((r) => setTimeout(r, 250)) // latência perceptível
    if (req.method === 'OPTIONS') return send(res, 204, {})

    if (p === '/student/identify') return send(res, 200, STUDENT)

    if (p === '/student_trails' && req.method === 'GET') {
      return send(
        res,
        200,
        Object.keys(TRAILS).map((id) => ({
          id: `st-${id}`,
          student_id: 's1',
          institution_id: 'i1',
          trail_id: id,
          current_stage_number: pos[id].stage,
          current_question_number: pos[id].question,
          status: pos[id].status,
        })),
      )
    }
    if (p === '/trails') return send(res, 200, Object.entries(TRAILS).map(([id, t]) => ({ id, name: t.name, subject: t.name })))
    if (p === '/trail_stages') {
      const rows = []
      for (const [id, t] of Object.entries(TRAILS)) for (let s = 1; s <= t.stages; s++) rows.push({ trail_id: id, stage_number: s })
      return send(res, 200, rows)
    }
    if (p === '/trail_stage_questions') {
      const t = TRAILS[q.get('trail_id')]
      if (q.get('action') === 'max') {
        return send(res, 200, { max_question_number: t ? t.questions : 0, total_questions: t ? t.questions : 0 })
      }
      const rows = []
      if (t) for (let n = 1; n <= t.questions; n++) rows.push({ trail_id: q.get('trail_id'), stage_number: 1, question_number: n, title: titleFor(q.get('trail_id'), n), is_released: true })
      return send(res, 200, rows)
    }

    if (p === '/student_trails/next-content') {
      const id = q.get('trail_id')
      if (!TRAILS[id]) return send(res, 200, { status: 'not_found' })
      if (pos[id].status === 'completed') return send(res, 200, { status: 'completed', trail_id: id })
      return send(res, 200, content(id, pos[id].stage, pos[id].question))
    }

    if (p === '/student_trails/history') {
      const id = q.get('trail_id')
      const mine = logs.filter((l) => l.trail_id === id)
      return send(res, 200, { logs: mine, has_more: false, next_before: null, position: null })
    }

    if (p === '/student_trails/advance') {
      const b = await readBody(req)
      const id = b.trail_id
      const t = TRAILS[id]
      const cur = pos[id]
      if (!t || !cur) return send(res, 200, { status: 'blocked' })
      cur.version += 1
      cur.status = 'in_progress'
      if (cur.stage < t.stages) cur.stage += 1
      else if (cur.question < t.questions) {
        cur.question += 1
        cur.stage = 1
      } else {
        cur.status = 'completed'
        return send(res, 200, { status: 'completed', completed: true, progress_version: cur.version })
      }
      return send(res, 200, { status: 'ok', next_stage_number: cur.stage, next_question_number: cur.question, progress_version: cur.version })
    }

    if (p === '/conversation_logs' && req.method === 'POST') {
      const b = await readBody(req)
      const row = { id: `l${logId++}`, created_at_ms: Date.now(), ...b }
      logs.push(row)
      return send(res, 200, row)
    }

    if (p === '/exercise_attempts') {
      const b = await readBody(req)
      const ok = String(b.student_answer || '').trim().toUpperCase().startsWith('B')
      return send(res, 200, {
        id: 'a1',
        student_id: 's1',
        institution_id: 'i1',
        trail_id: b.trail_id,
        stage_number: b.stage_number,
        question_number: b.question_number,
        student_answer: b.student_answer,
        correct_option: 'B',
        is_correct: ok,
        score: ok ? 100 : 0,
        feedback: null,
        pedagogical_feedback: ok
          ? 'Isso mesmo! 4/8 é igual a 1/2, ou seja, metade da pizza.'
          : 'Quase. Pense: metade de 8 fatias são quantas fatias?',
        attempt_number: 1,
      })
    }

    if (p === '/student_trails/maria') {
      const b = await readBody(req)
      return send(res, 200, {
        status: 'ok',
        reply: `Boa pergunta! Sobre "${String(b.message || '').slice(0, 60)}": vamos pensar juntos, etapa por etapa. Qual parte você já entendeu?`,
        model: 'mock',
        stage_number: b.stage_number || 1,
        question_number: b.question_number || 1,
      })
    }

    send(res, 404, { status: 'error', message: `mock: rota não prevista ${req.method} ${p}` })
  })
  .listen(3000, () => console.log('mock API em http://localhost:3000'))
