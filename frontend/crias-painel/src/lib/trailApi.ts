function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim()
  if (raw) return raw.replace(/\/+$/, '')
  return window.location.origin
}

export async function deleteTrailCascade(trailId: string): Promise<void> {
  const id = trailId.trim()
  if (!id) throw new Error('ID da trilha ausente para exclusão.')

  const url = new URL('/api/trails', resolveApiBaseUrl())
  url.searchParams.set('id', id)

  const res = await fetch(url.toString(), { method: 'DELETE' })
  if (res.status === 204) return

  let message = `Falha ao excluir trilha (HTTP ${res.status}).`
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
