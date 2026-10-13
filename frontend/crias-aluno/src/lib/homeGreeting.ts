const GREETINGS = [
  (name: string) => `Vamos avançar mais, ${name}?`,
  (name: string) => `Bora continuar de onde parou, ${name}?`,
  (name: string) => `Oi, ${name}. O que vamos aprender hoje?`,
  (name: string) => `Qual trilha você quer seguir, ${name}?`,
  (name: string) => `Mais uma etapa hoje, ${name}?`,
] as const

function visitKey(studentId: string): string {
  return `crias_student_home_visit:${studentId.trim()}`
}

/** Saudação que alterna a cada visita à home (localStorage por aluno). */
export function nextHomeGreeting(studentId: string, displayName: string): string {
  const name = displayName.trim() || 'aluno'
  const id = studentId.trim()
  let idx = 0
  if (id) {
    try {
      const raw = localStorage.getItem(visitKey(id))
      const prev = raw ? Number.parseInt(raw, 10) : 0
      idx = Number.isFinite(prev) ? prev % GREETINGS.length : 0
      localStorage.setItem(visitKey(id), String(idx + 1))
    } catch {
      idx = 0
    }
  }
  return GREETINGS[idx]!(name)
}
