/* Dados de exemplo no formato do banco (specs/03_FIRESTORE_MODEL.md). */
type Data = Record<string, unknown>
type TS = { fromMillis: (n: number) => unknown }

const DAY = 86400000

export function seed(Timestamp: TS): Record<string, Record<string, Data>> {
  const now = Date.now()
  const ts = (daysAgo: number) => Timestamp.fromMillis(now - daysAgo * DAY)
  const out: Record<string, Record<string, Data>> = {
    institutions: {},
    students: {},
    trails: {},
    trail_stages: {},
    trail_stage_questions: {},
    student_trails: {},
    exercise_attempts: {},
    conversation_logs: {},
    admin_users: {},
    counters: {},
  }

  out.institutions.i1 = { name: 'Escola Estadual Exemplo', type: 'Escola pública', active: true, created_at: ts(70), updated_at: ts(10), public_link: '' }
  out.institutions.i2 = { name: 'Colégio Exemplo', type: 'Escola privada', active: true, created_at: ts(60), updated_at: ts(12), public_link: '' }

  const TRAILS: Array<[string, string, string, string, string]> = [
    ['t1', 'i1', 'Matemática básica', 'Matemática', 'Porcentagem, frações, proporção, média e área.'],
    ['t2', 'i1', 'Leitura e interpretação', 'Português', 'Ideia principal, inferência e tipos de texto.'],
    ['t3', 'i1', 'Produção de texto', 'Português', 'Planejamento, argumentação e revisão de textos.'],
    ['t4', 'i2', 'Ciências da natureza', 'Ciências', 'Ecossistemas, cadeia alimentar e ciclos da natureza.'],
    ['t5', 'i2', 'História do Brasil', 'História', 'Colônia, Império e República.'],
    ['t6', 'i2', 'Geografia do Brasil', 'Geografia', 'Regiões, clima e população.'],
  ]
  const BLUEPRINT = [
    { title: 'Introdução', stage_type: 'ai', prompt: 'Apresente o tema da atividade em linguagem simples.' },
    { title: 'Explicação', stage_type: 'fixed', prompt: null },
    { title: 'Exemplo', stage_type: 'ai', prompt: 'Dê um exemplo do cotidiano.' },
    { title: 'Exercício', stage_type: 'exercise', prompt: null },
  ]
  const ACTIVITIES = 5
  for (const [id, inst, name, subject, description] of TRAILS) {
    out.trails[id] = { institution_id: inst, name, description, subject, default_total_steps_per_stage: 4, active: true, phase_blueprint: BLUEPRINT, created_at: ts(50), updated_at: ts(5) }
    BLUEPRINT.forEach((p, i) => {
      const s = i + 1
      out.trail_stages[`${id}_stage_${s}`] = { trail_id: id, stage_number: s, title: p.title, stage_type: p.stage_type, prompt: p.prompt, is_released: true, active: true, created_at: ts(50), updated_at: ts(5) }
      for (let q = 1; q <= ACTIVITIES; q++) {
        const ex = p.stage_type === 'exercise'
        out.trail_stage_questions[`${id}_stage_${s}_q_${q}`] = {
          trail_id: id, stage_number: s, question_number: q,
          title: ex ? `Exercício ${q}` : `${p.title} da atividade ${q}`,
          content: ex ? `Qual alternativa responde corretamente ao exercício ${q} de ${name}?` : `Conteúdo da etapa ${s} da atividade ${q} de ${name}.`,
          correct_option: ex ? ['A', 'B', 'C', 'D'][q % 4] : null,
          options: ex ? ['A', 'B', 'C', 'D'].map((k) => ({ key: k, text: `Alternativa ${k} (${name})` })) : null,
          explanation: ex ? 'Porque é a que se aplica ao conceito estudado.' : null,
          annulled: false, annulled_at: null, annulled_reason: null,
          is_released: q <= 3, active: true, created_at: ts(50), updated_at: ts(5),
        }
      }
    })
  }

  const FN = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabriela', 'Hugo', 'Isabela', 'João', 'Karina', 'Lucas', 'Mariana', 'Nicolas', 'Olívia', 'Pedro', 'Rafaela', 'Sofia', 'Tiago', 'Valentina']
  const LN = ['Almeida', 'Barros', 'Castro', 'Dantas', 'Esteves', 'Ferraz', 'Gomes', 'Henrique', 'Ibrahim', 'Jardim', 'Klein', 'Lopes', 'Moura']
  const LV: Array<[string, string]> = [['fundamental', '8º ano'], ['fundamental', '9º ano'], ['médio', '1º ano'], ['médio', '2º ano']]
  const STATUS = ['in_progress', 'completed', 'not_started', 'in_progress', 'in_progress']
  let n = 0
  for (const inst of ['i1', 'i2']) {
    const trails = TRAILS.filter((t) => t[1] === inst)
    for (let k = 0; k < (inst === 'i1' ? 40 : 24); k++) {
      n += 1
      const sid = `s${n}`
      const [lvl, grade] = LV[k % LV.length]
      out.students[sid] = {
        institution_id: inst, name: `${FN[k % FN.length]} ${LN[(k * 7) % LN.length]}`,
        phone_number: `1190000${String(n).padStart(4, '0')}`, school_level: lvl, school_grade: grade,
        // 1.3.8: turma de exemplo (i1: 8º A, 8º B, 9º A; i2: 1º A, 2º A).
        turma: inst === 'i1' ? ['8º A', '8º B', '9º A'][k % 3] : ['1º A', '2º A'][k % 2],
        student_level: ((k % 3) + 1), active: k % 17 !== 0, created_at: ts(40 - (k % 20)), updated_at: ts(k % 9),
        password_hash: k % 5 === 4 ? undefined : 'scrypt$x$y',
      }
      if (out.students[sid].password_hash === undefined) delete out.students[sid].password_hash
      trails.slice(0, 1 + (k % 3)).forEach((t, j) => {
        const status = STATUS[(k + j) % STATUS.length]
        const done = status === 'completed'
        out.student_trails[`${sid}_trail_${t[0]}`] = {
          student_id: sid, institution_id: inst, trail_id: t[0],
          current_stage_number: done ? 4 : 1 + ((k + j) % 4), current_question_number: done ? ACTIVITIES : 1 + ((k + j) % 4),
          status, started_at: status === 'not_started' ? null : ts(30), completed_at: done ? ts(3) : null,
          last_interaction_at: status === 'not_started' ? null : ts((k + j) % 12), created_at: ts(30), updated_at: ts(2),
        }
        if (status !== 'not_started') {
          for (let q = 1; q <= 3; q++) {
            const correct = (k + q + j) % 3 !== 0
            out.exercise_attempts[`${sid}_${t[0]}_${q}_1`] = {
              student_id: sid, institution_id: inst, trail_id: t[0], stage_number: 4, question_number: q,
              student_answer: correct ? ['A', 'B', 'C', 'D'][q % 4] : 'E', correct_option: ['A', 'B', 'C', 'D'][q % 4], is_correct: correct,
              score: correct ? 1 : 0, feedback: null, attempt_number: 1, attempted_at: ts((k + q) % 10), created_at: ts((k + q) % 10), updated_at: ts((k + q) % 10),
            }
          }
        }
      })
    }
  }
  out.counters.students = { next: n + 1 }
  out.counters.institutions = { next: 3 }
  out.counters.trails = { next: 7 }

  out.admin_users['coordenacao@escola_org'] = { email: 'coordenacao@escola.org', name: 'Coordenação', active: true, is_super_admin: true, is_master: true, nav_permissions: [], institution_ids: [], all_institutions: true, created_at: ts(80), updated_at: ts(20) }
  out.admin_users['professora_lima@escola_org'] = { email: 'professora.lima@escola.org', name: 'Mariana Lima', phone_number: '11988880003', active: true, is_super_admin: false, is_master: false, nav_permissions: ['home', 'dashboard', 'student_new', 'trail_new'], institution_ids: ['i1'], all_institutions: false, materias: ['Matemática'], turmas: ['8º A', '8º B'], trail_ids: ['t1'], created_at: ts(60), updated_at: ts(15) }
  out.admin_users['secretaria@colegio_org'] = { email: 'secretaria@colegio.org', active: false, is_super_admin: false, is_master: false, nav_permissions: ['student_new'], institution_ids: ['i2'], all_institutions: false, created_at: ts(50), updated_at: ts(9) }

  return out
}
