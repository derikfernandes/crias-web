function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim()
  if (raw) return raw.replace(/\/+$/, '')
  return window.location.origin
}

/**
 * Exclui o aluno via API com cascade em student_trails, conversation_logs
 * e exercise_attempts (mesmo padrão de deleteTrailCascade).
 */
export async function updateStudentPassword(
  studentId: string,
  password: string,
): Promise<void> {
  const id = studentId.trim()
  const plain = password.trim()
  if (!id) throw new Error('ID do aluno ausente.')
  if (plain.length < 6) {
    throw new Error('Senha deve ter pelo menos 6 caracteres.')
  }

  const url = new URL('/api/student', resolveApiBaseUrl())
  url.searchParams.set('id', id)

  const res = await fetch(url.toString(), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: plain }),
  })

  if (res.ok) return

  let message = `Falha ao definir senha (HTTP ${res.status}).`
  try {
    const body = (await res.json()) as { error?: unknown }
    if (typeof body?.error === 'string' && body.error.trim()) {
      message = body.error
    }
  } catch {
    // mantém mensagem padrão
  }
  throw new Error(message)
}

export async function deleteStudentCascade(studentId: string): Promise<void> {
  const id = studentId.trim()
  if (!id) throw new Error('ID do aluno ausente para exclusão.')

  const url = new URL('/api/student', resolveApiBaseUrl())
  url.searchParams.set('id', id)

  const res = await fetch(url.toString(), { method: 'DELETE' })
  if (res.status === 204) return

  let message = `Falha ao excluir aluno (HTTP ${res.status}).`
  try {
    const body = (await res.json()) as { error?: unknown }
    if (typeof body?.error === 'string' && body.error.trim()) {
      message = body.error
    }
  } catch {
    // mantém mensagem padrão
  }
  throw new Error(message)
}
