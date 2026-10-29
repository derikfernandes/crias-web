import { parseYesNo, pick, type Row } from './tableFiles'
import { assertStudentName } from './studentFieldValidation'
import { stripPhoneDigits, toCanonicalPhone } from './trilha/phoneNormalize'
import type { Student } from '../types/student'

/**
 * Ações em massa por planilha (INTERFACE.md, seções C e D da 1.1.1.b).
 *
 * Cada `plan...` lê as linhas da planilha e devolve o que vai mudar, o que fica como está e os erros.
 * Nada aqui grava no banco: a gravação fica em quem chama, depois da confirmação em linha.
 *
 * Regras comuns:
 * - Importar sempre adiciona ou altera o que a planilha informa; nunca apaga o que não está nela.
 * - Só as colunas indicadas são lidas. O que vem entre parênteses no cabeçalho é ignorado.
 * - Linha totalmente vazia é ignorada. A linha do cabeçalho é a linha 1; os dados começam na 2.
 * - Cada linha com problema vira um erro com a linha, uma referência (nome, ID ou e-mail) e o motivo.
 */

export type BulkIssue = { line: number; ref: string; error: string }

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const lineOf = (i: number) => i + 2

function blank(...values: string[]): boolean {
  return values.every((v) => !v.trim())
}

export function phoneKey(value: string): string {
  const c = toCanonicalPhone(value)
  const digits = c.ok ? c.canonical : stripPhoneDigits(value)
  return digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()

/** Texto resumido dos erros, para a mensagem final: "3 com erro". */
export function errorCountText(n: number): string {
  return n === 1 ? '1 com erro' : `${n} com erro`
}

/** "N alunos" / "1 aluno" com a palavra no singular ou plural. */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/* ===== Alunos: cadastrar ===== */

export type NewStudent = { line: number; name: string; phone: string; email: string; password: string }
export type StudentAddPlan = {
  items: NewStudent[]
  /** Telefone ou e-mail já cadastrado na instituição (ou repetido na planilha): fica de fora. */
  alreadyRegistered: number
  issues: BulkIssue[]
}

/**
 * Cadastrar alunos em massa. Colunas: ID Instituição, Nome (obrigatório), Telefone, E-mail (opcional),
 * Senha (opcional). Regra de cadastro: nome obrigatório e telefone OU e-mail.
 */
export function planStudentsAdd(
  rows: Row[],
  ctx: { institutionId: string; existing: Student[] },
): StudentAddPlan {
  const issues: BulkIssue[] = []
  const items: NewStudent[] = []
  let alreadyRegistered = 0
  const phones = new Set(ctx.existing.map((s) => phoneKey(s.phone_number)).filter(Boolean))
  const emails = new Set(ctx.existing.map((s) => norm(s.email ?? '')).filter(Boolean))
  rows.forEach((row, i) => {
    const line = lineOf(i)
    const inst = pick(row, 'idinstituicao', 'instituicao')
    const name = pick(row, 'nome', 'name')
    const phoneRaw = pick(row, 'telefone', 'celular', 'phone')
    const email = pick(row, 'email', 'e-mail')
    const password = pick(row, 'senha', 'password')
    if (blank(name, phoneRaw, email, password)) return
    const ref = name || phoneRaw || email || `linha ${line}`
    if (!inst) {
      issues.push({ line, ref, error: 'ID Instituição obrigatório.' })
      return
    }
    if (inst !== ctx.institutionId) {
      issues.push({ line, ref, error: 'ID da instituição diferente da instituição selecionada.' })
      return
    }
    const nameErr = assertStudentName(name)
    if (nameErr) {
      issues.push({ line, ref, error: name ? nameErr : 'Nome obrigatório.' })
      return
    }
    if (!phoneRaw && !email) {
      issues.push({ line, ref, error: 'Informe o telefone ou o e-mail.' })
      return
    }
    let phone = ''
    if (phoneRaw) {
      const parsed = toCanonicalPhone(phoneRaw)
      if (!parsed.ok) {
        issues.push({ line, ref, error: 'Telefone inválido (use DDD + número).' })
        return
      }
      phone = parsed.canonical
    }
    if (email && !EMAIL_RE.test(email)) {
      issues.push({ line, ref, error: 'E-mail inválido.' })
      return
    }
    if (password && password.length < 6) {
      issues.push({ line, ref, error: 'A senha precisa de pelo menos 6 caracteres.' })
      return
    }
    const pk = phone ? phoneKey(phone) : ''
    const ek = norm(email)
    if ((pk && phones.has(pk)) || (ek && emails.has(ek))) {
      alreadyRegistered += 1
      return
    }
    if (pk) phones.add(pk)
    if (ek) emails.add(ek)
    items.push({ line, name: name.trim(), phone, email: email.trim(), password })
  })
  return { items, alreadyRegistered, issues }
}

/* ===== Alunos: editar ===== */

export const PED_LABELS: Record<number, string> = { 1: 'Básico', 2: 'Intermediário', 3: 'Avançado' }

export type StudentPatch = {
  name?: string
  phone_number?: string
  email?: string
  school_level?: 'fundamental' | 'médio'
  school_grade?: string
  student_level?: 1 | 2 | 3
}
export type StudentEditPlan = {
  items: Array<{ line: number; student: Student; patch: StudentPatch }>
  /** Linhas encontradas em que nada muda. */
  unchanged: number
  issues: BulkIssue[]
}

/** "Fundamental · 6º ano", "Médio" ou "Médio · 2º ano" para nível e série. */
export function parseSchooling(raw: string): { level?: 'fundamental' | 'médio'; grade?: string } | null {
  const parts = raw.split(/[·|/]/).map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return {}
  const level = norm(parts[0])
  if (level !== 'fundamental' && level !== 'medio') return null
  return { level: level === 'medio' ? 'médio' : 'fundamental', ...(parts[1] ? { grade: parts.slice(1).join(' · ') } : {}) }
}

function parsePed(raw: string): 1 | 2 | 3 | null {
  const v = norm(raw)
  if (['1', 'basico'].includes(v)) return 1
  if (['2', 'intermediario'].includes(v)) return 2
  if (['3', 'avancado'].includes(v)) return 3
  return null
}

/**
 * Editar alunos em massa. Base com todos os dados atuais: ID Instituição, ID Aluno, Nome, Telefone,
 * E-mail, Escolaridade, Nível pedagógico. A linha é achada pelo ID Aluno; campo em branco não muda.
 */
export function planStudentsEdit(
  rows: Row[],
  ctx: { institutionId: string; students: Student[] },
): StudentEditPlan {
  const issues: BulkIssue[] = []
  const items: StudentEditPlan['items'] = []
  let unchanged = 0
  const byId = new Map(ctx.students.filter((s) => s.institution_id === ctx.institutionId).map((s) => [s.id, s]))
  const phoneOwner = new Map<string, string>()
  for (const s of byId.values()) {
    const k = phoneKey(s.phone_number)
    if (k) phoneOwner.set(k, s.id)
  }
  const seen = new Set<string>()
  rows.forEach((row, i) => {
    const line = lineOf(i)
    const inst = pick(row, 'idinstituicao', 'instituicao')
    const id = pick(row, 'idaluno', 'codigoaluno', 'id')
    const name = pick(row, 'nome', 'name')
    const phoneRaw = pick(row, 'telefone', 'celular', 'phone')
    const email = pick(row, 'email', 'e-mail')
    const schooling = pick(row, 'escolaridade')
    const ped = pick(row, 'nivelpedagogico', 'nivel')
    if (blank(inst, id, name, phoneRaw, email, schooling, ped)) return
    const ref = id || name || `linha ${line}`
    if (!id) {
      issues.push({ line, ref, error: 'ID Aluno obrigatório.' })
      return
    }
    if (inst && inst !== ctx.institutionId) {
      issues.push({ line, ref, error: 'ID da instituição diferente da instituição selecionada.' })
      return
    }
    const s = byId.get(id)
    if (!s) {
      issues.push({ line, ref, error: 'Aluno não encontrado nesta instituição.' })
      return
    }
    if (seen.has(id)) {
      issues.push({ line, ref, error: 'ID Aluno repetido na planilha.' })
      return
    }
    seen.add(id)
    const patch: StudentPatch = {}
    if (name && name.trim() !== s.name) {
      const err = assertStudentName(name)
      if (err) {
        issues.push({ line, ref, error: err })
        return
      }
      patch.name = name.trim()
    }
    if (phoneRaw) {
      const parsed = toCanonicalPhone(phoneRaw)
      if (!parsed.ok) {
        issues.push({ line, ref, error: 'Telefone inválido (use DDD + número).' })
        return
      }
      const k = phoneKey(parsed.canonical)
      if (k !== phoneKey(s.phone_number)) {
        const owner = phoneOwner.get(k)
        if (owner && owner !== s.id) {
          issues.push({ line, ref, error: 'Telefone já cadastrado em outro aluno.' })
          return
        }
        patch.phone_number = parsed.canonical
      }
    }
    if (email) {
      if (!EMAIL_RE.test(email)) {
        issues.push({ line, ref, error: 'E-mail inválido.' })
        return
      }
      if (norm(email) !== norm(s.email ?? '')) patch.email = email.trim()
    }
    if (schooling) {
      const parsed = parseSchooling(schooling)
      if (!parsed) {
        issues.push({ line, ref, error: 'Escolaridade inválida (use Fundamental ou Médio, com a série).' })
        return
      }
      if (parsed.level && parsed.level !== s.school_level) patch.school_level = parsed.level
      if (parsed.grade && parsed.grade !== s.school_grade) patch.school_grade = parsed.grade
    }
    if (ped) {
      const level = parsePed(ped)
      if (!level) {
        issues.push({ line, ref, error: 'Nível pedagógico inválido (Básico, Intermediário ou Avançado).' })
        return
      }
      if (level !== s.student_level) patch.student_level = level
    }
    if (Object.keys(patch).length === 0) unchanged += 1
    else items.push({ line, student: s, patch })
  })
  return { items, unchanged, issues }
}

/* ===== Alunos: remover ===== */

export type StudentRemovePlan = {
  items: Array<{ line: number; student: Student }>
  /** Marcados "não", em branco ou já removidos. */
  unchanged: number
  issues: BulkIssue[]
}

/** Remover alunos em massa. Lê só ID Aluno e Remover (sim / não). Remover tira o acesso e guarda o histórico. */
export function planStudentsRemove(
  rows: Row[],
  ctx: { institutionId: string; students: Student[] },
): StudentRemovePlan {
  const issues: BulkIssue[] = []
  const items: StudentRemovePlan['items'] = []
  let unchanged = 0
  const byId = new Map(ctx.students.filter((s) => s.institution_id === ctx.institutionId).map((s) => [s.id, s]))
  const seen = new Set<string>()
  rows.forEach((row, i) => {
    const line = lineOf(i)
    const inst = pick(row, 'idinstituicao', 'instituicao')
    const id = pick(row, 'idaluno', 'codigoaluno', 'id')
    const flagRaw = pick(row, 'remover', 'remove')
    if (blank(inst, id, flagRaw, pick(row, 'nome'), pick(row, 'telefone', 'celular'))) return
    const ref = id || pick(row, 'nome') || `linha ${line}`
    if (!id) {
      issues.push({ line, ref, error: 'ID Aluno obrigatório.' })
      return
    }
    if (inst && inst !== ctx.institutionId) {
      issues.push({ line, ref, error: 'ID da instituição diferente da instituição selecionada.' })
      return
    }
    const s = byId.get(id)
    if (!s) {
      issues.push({ line, ref, error: 'Aluno não encontrado nesta instituição.' })
      return
    }
    if (seen.has(id)) {
      issues.push({ line, ref, error: 'ID Aluno repetido na planilha.' })
      return
    }
    seen.add(id)
    const flag = parseYesNo(flagRaw)
    if (flagRaw && flag === null) {
      issues.push({ line, ref, error: 'Valor de "remover" inválido (use sim ou não).' })
      return
    }
    if (flag === true && s.active) items.push({ line, student: s })
    else unchanged += 1
  })
  return { items, unchanged, issues }
}

/* ===== Trilha > Alunos: ativar ou inativar ===== */

export type TrailStudentsPlan = {
  /** aluno -> ativo (true ativar, false inativar), só dos que mudam. */
  changes: Map<string, boolean>
  activate: number
  inactivate: number
  unchanged: number
  issues: BulkIssue[]
}

/**
 * Ativar ou inativar alunos da trilha em massa. Base: ID Trilha, Trilha, ID Aluno, Nome, Telefone, Ativo.
 * Lê só ID Aluno e Ativo (sim / não). `isActive` diz se o aluno está ativo hoje na trilha.
 */
export function planTrailStudents(
  rows: Row[],
  ctx: { trailId: string; students: Student[]; isActive: (studentId: string) => boolean },
): TrailStudentsPlan {
  const issues: BulkIssue[] = []
  const changes = new Map<string, boolean>()
  let activate = 0
  let inactivate = 0
  let unchanged = 0
  const byId = new Map(ctx.students.map((s) => [s.id, s]))
  const seen = new Set<string>()
  rows.forEach((row, i) => {
    const line = lineOf(i)
    const trail = pick(row, 'idtrilha')
    const id = pick(row, 'idaluno', 'codigoaluno', 'codigo', 'id')
    const flagRaw = pick(row, 'ativo', 'active')
    if (blank(trail, id, flagRaw, pick(row, 'nome'), pick(row, 'telefone', 'celular'))) return
    const ref = id || pick(row, 'nome') || `linha ${line}`
    if (!id) {
      issues.push({ line, ref, error: 'ID Aluno obrigatório.' })
      return
    }
    if (trail && trail !== ctx.trailId) {
      issues.push({ line, ref, error: 'ID da trilha diferente da trilha aberta.' })
      return
    }
    const s = byId.get(id)
    if (!s) {
      issues.push({ line, ref, error: 'Aluno não encontrado nesta instituição.' })
      return
    }
    if (seen.has(id)) {
      issues.push({ line, ref, error: 'ID Aluno repetido na planilha.' })
      return
    }
    seen.add(id)
    const want = parseYesNo(flagRaw)
    if (want === null) {
      issues.push({ line, ref, error: flagRaw ? 'Valor de "ativo" inválido (use sim ou não).' : 'Informe sim ou não em "ativo".' })
      return
    }
    const now = ctx.isActive(id)
    if (want === now) {
      unchanged += 1
      return
    }
    changes.set(id, want)
    if (want) activate += 1
    else inactivate += 1
  })
  return { changes, activate, inactivate, unchanged, issues }
}

/* ===== Trilha > Gabarito ===== */

export type GabaritoCell = {
  id: string
  activity: number
  /** Posição do exercício dentro da atividade (1, 2, 3...). */
  exercise: number
  letter: string
  annulled: boolean
}
export type GabaritoPlan = {
  /** Células com gabarito novo (letra) e/ou anulação nova. */
  items: Array<{ cellId: string; letter?: string; annulled?: boolean }>
  changedLetters: number
  annulled: number
  reactivated: number
  unchanged: number
  issues: BulkIssue[]
}

/**
 * Alterar gabarito em massa. Base: ID Trilha, Trilha, Atividade, Exercício, Gabarito, Anular (sim / não).
 * Só "gabarito" e "anular" são lidos; Atividade e Exercício dizem qual linha é. Em branco não muda.
 */
export function planGabarito(
  rows: Row[],
  ctx: { trailId: string; cells: GabaritoCell[]; optionCount: number },
): GabaritoPlan {
  const issues: BulkIssue[] = []
  const items: GabaritoPlan['items'] = []
  let changedLetters = 0
  let annulled = 0
  let reactivated = 0
  let unchanged = 0
  const byKey = new Map(ctx.cells.map((c) => [`${c.activity}|${c.exercise}`, c]))
  const letters = Array.from({ length: ctx.optionCount }, (_, i) => String.fromCharCode(65 + i))
  const seen = new Set<string>()
  rows.forEach((row, i) => {
    const line = lineOf(i)
    const trail = pick(row, 'idtrilha')
    const act = pick(row, 'atividade')
    const ex = pick(row, 'exercicio')
    const letterRaw = pick(row, 'gabarito').trim().toUpperCase()
    const annulRaw = pick(row, 'anular')
    if (blank(trail, act, ex, letterRaw, annulRaw)) return
    const ref = `Atividade ${act || '?'}, exercício ${ex || '?'}`
    if (trail && trail !== ctx.trailId) {
      issues.push({ line, ref, error: 'ID da trilha diferente da trilha aberta.' })
      return
    }
    const key = `${Number.parseInt(act, 10)}|${Number.parseInt(ex, 10)}`
    const cell = byKey.get(key)
    if (!cell) {
      issues.push({ line, ref, error: 'Exercício não encontrado nesta trilha.' })
      return
    }
    if (seen.has(key)) {
      issues.push({ line, ref, error: 'Exercício repetido na planilha.' })
      return
    }
    seen.add(key)
    if (letterRaw && !letters.includes(letterRaw)) {
      issues.push({ line, ref, error: `Gabarito inválido (use ${letters[0]} a ${letters[letters.length - 1]}).` })
      return
    }
    const annul = parseYesNo(annulRaw)
    if (annulRaw && annul === null) {
      issues.push({ line, ref, error: 'Valor de "anular" inválido (use sim ou não).' })
      return
    }
    const write: { cellId: string; letter?: string; annulled?: boolean } = { cellId: cell.id }
    if (letterRaw && letterRaw !== cell.letter) {
      write.letter = letterRaw
      changedLetters += 1
    }
    if (annul !== null && annul !== cell.annulled) {
      write.annulled = annul
      if (annul) annulled += 1
      else reactivated += 1
    }
    if (write.letter === undefined && write.annulled === undefined) unchanged += 1
    else items.push(write)
  })
  return { items, changedLetters, annulled, reactivated, unchanged, issues }
}

/* ===== Senhas ===== */

export type PasswordsPlan = {
  items: Array<{ line: number; student: Student; password: string }>
  /** Linhas encontradas com a senha em branco: não mudam. */
  unchanged: number
  issues: BulkIssue[]
}

/** Alterar senhas em massa. Base: ID Instituição, ID Aluno, Nome, Telefone, Senha. Só senhas preenchidas mudam. */
export function planPasswords(
  rows: Row[],
  ctx: { institutionId: string; students: Student[] },
): PasswordsPlan {
  const issues: BulkIssue[] = []
  const items: PasswordsPlan['items'] = []
  let unchanged = 0
  const byId = new Map(ctx.students.filter((s) => s.institution_id === ctx.institutionId).map((s) => [s.id, s]))
  const seen = new Set<string>()
  rows.forEach((row, i) => {
    const line = lineOf(i)
    const inst = pick(row, 'idinstituicao', 'instituicao')
    const id = pick(row, 'idaluno', 'codigoaluno', 'id')
    const pw = pick(row, 'senha', 'password')
    if (blank(inst, id, pw, pick(row, 'nome'), pick(row, 'telefone', 'celular'))) return
    const ref = id || pick(row, 'nome') || `linha ${line}`
    if (!id) {
      issues.push({ line, ref, error: 'ID Aluno obrigatório.' })
      return
    }
    if (inst && inst !== ctx.institutionId) {
      issues.push({ line, ref, error: 'ID da instituição diferente da instituição selecionada.' })
      return
    }
    const s = byId.get(id)
    if (!s) {
      issues.push({ line, ref, error: 'Aluno não encontrado nesta instituição.' })
      return
    }
    if (seen.has(id)) {
      issues.push({ line, ref, error: 'ID Aluno repetido na planilha.' })
      return
    }
    seen.add(id)
    if (!pw) {
      unchanged += 1
      return
    }
    if (pw.length < 6) {
      issues.push({ line, ref, error: 'A senha precisa de pelo menos 6 caracteres.' })
      return
    }
    items.push({ line, student: s, password: pw })
  })
  return { items, unchanged, issues }
}

/* ===== Usuários da Educação ===== */

export type UserProfileName = 'admin' | 'basico'
export type NewUser = { line: number; email: string; name: string; phone: string; profile: UserProfileName; password: string }
export type UsersAddPlan = { items: NewUser[]; alreadyRegistered: number; issues: BulkIssue[] }

function parseProfile(raw: string): UserProfileName | null {
  const v = norm(raw)
  if (v === 'admin') return 'admin'
  if (v === 'basico') return 'basico'
  return null
}

/**
 * Adicionar usuários em massa. Colunas: ID Instituição, Nome (obrigatório), Telefone, E-mail, Perfil (Admin / Básico),
 * Senha (opcional). Regra de cadastro: nome obrigatório e telefone OU e-mail. `institutionId` é a instituição escolhida na importação (null na aba Crias).
 */
export function planUsersAdd(
  rows: Row[],
  ctx: { institutionId: string | null; existingEmails: Set<string> },
): UsersAddPlan {
  const issues: BulkIssue[] = []
  const items: NewUser[] = []
  let alreadyRegistered = 0
  const emails = new Set([...ctx.existingEmails].map(norm))
  rows.forEach((row, i) => {
    const line = lineOf(i)
    const inst = pick(row, 'idinstituicao', 'instituicao')
    const name = pick(row, 'nome', 'name')
    const phoneRaw = pick(row, 'telefone', 'celular', 'phone')
    const email = pick(row, 'email', 'e-mail')
    const profileRaw = pick(row, 'perfil', 'profile')
    const password = pick(row, 'senha', 'password')
    if (blank(name, phoneRaw, email, profileRaw, password)) return
    const ref = email || name || `linha ${line}`
    if (ctx.institutionId && !inst) {
      issues.push({ line, ref, error: 'ID Instituição obrigatório.' })
      return
    }
    if (ctx.institutionId && inst !== ctx.institutionId) {
      issues.push({ line, ref, error: 'ID da instituição diferente da instituição selecionada.' })
      return
    }
    if (!name) {
      issues.push({ line, ref, error: 'Nome obrigatório.' })
      return
    }
    if (!email && !phoneRaw) {
      issues.push({ line, ref, error: 'Informe o telefone ou o e-mail.' })
      return
    }
    if (email && !EMAIL_RE.test(email)) {
      issues.push({ line, ref, error: 'E-mail inválido.' })
      return
    }
    const profile = parseProfile(profileRaw)
    if (!profile) {
      issues.push({ line, ref, error: 'Perfil inválido (use Admin ou Básico).' })
      return
    }
    let phone = ''
    if (phoneRaw) {
      const parsed = toCanonicalPhone(phoneRaw)
      if (!parsed.ok) {
        issues.push({ line, ref, error: 'Telefone inválido (use DDD + número).' })
        return
      }
      phone = parsed.canonical
    }
    // O acesso é por e-mail ou por telefone: quem não tem e-mail é identificado pelo telefone.
    const key = email ? norm(email) : `tel:${phoneKey(phone)}`
    if (emails.has(key)) {
      alreadyRegistered += 1
      return
    }
    emails.add(key)
    items.push({ line, email: email.trim(), name: name.trim(), phone, profile, password })
  })
  return { items, alreadyRegistered, issues }
}

export type UserRef = { id: string; email: string; phone?: string; isSuperAdmin?: boolean }
export type UsersRemovePlan = { items: Array<{ line: number; user: UserRef }>; unchanged: number; issues: BulkIssue[] }

/**
 * Remover usuários em massa. Colunas: ID Instituição, Nome, Telefone, E-mail, Remover (sim / não).
 * A remoção parte do e-mail (ou do telefone, para quem não tem e-mail). `protectedEmails` (a própria pessoa, Super admins numa escola) nunca saem.
 */
export function planUsersRemove(
  rows: Row[],
  ctx: { users: UserRef[]; protectedEmails: Set<string> },
): UsersRemovePlan {
  const issues: BulkIssue[] = []
  const items: UsersRemovePlan['items'] = []
  let unchanged = 0
  const byEmail = new Map(ctx.users.map((u) => [u.email ? norm(u.email) : `tel:${phoneKey(u.phone ?? '')}`, u]))
  const protectedSet = new Set([...ctx.protectedEmails].map(norm))
  const seen = new Set<string>()
  rows.forEach((row, i) => {
    const line = lineOf(i)
    const email = pick(row, 'email', 'e-mail')
    const phoneRaw = pick(row, 'telefone', 'celular')
    const flagRaw = pick(row, 'remover', 'remove')
    if (blank(email, flagRaw, pick(row, 'nome'), phoneRaw, pick(row, 'idinstituicao'))) return
    const ref = email || phoneRaw || pick(row, 'nome') || `linha ${line}`
    if (!email && !phoneRaw) {
      issues.push({ line, ref, error: 'Informe o e-mail ou o telefone.' })
      return
    }
    const key = email ? norm(email) : `tel:${phoneKey(phoneRaw)}`
    const u = byEmail.get(key)
    if (!u) {
      issues.push({ line, ref, error: 'Usuário não encontrado.' })
      return
    }
    if (seen.has(key)) {
      issues.push({ line, ref, error: 'E-mail repetido na planilha.' })
      return
    }
    seen.add(key)
    const flag = parseYesNo(flagRaw)
    if (flagRaw && flag === null) {
      issues.push({ line, ref, error: 'Valor de "remover" inválido (use sim ou não).' })
      return
    }
    if (flag === true && protectedSet.has(key)) {
      issues.push({ line, ref, error: 'Este usuário não pode ser removido por aqui.' })
      return
    }
    if (flag === true) items.push({ line, user: u })
    else unchanged += 1
  })
  return { items, unchanged, issues }
}
