/** Erros de rede/sistema → mensagem PT + elegível a “Tentar de novo”. */

const NETWORK_RE =
  /failed to fetch|networkerror|network request failed|load failed|fetch failed|the internet connection appears to be offline|erro de rede/i

const TIMEOUT_RE = /timeout|timed?\s*out|request timeout|aborted|aborterror/i

const SERVER_RE =
  /internal server error|bad gateway|service unavailable|gateway time-?out|\b50[0234]\b/i

const AUTH_EN_RE = /^(unauthorized|forbidden)$/i

const HTMLISH_RE = /^\s*</

export function toUserFacingError(err: unknown, fallback: string): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : ''

  if (!raw || NETWORK_RE.test(raw) || err instanceof TypeError) {
    return 'Não foi possível conectar. Verifique sua internet e tente de novo.'
  }
  if (HTMLISH_RE.test(raw) || /<\/?(html|body)\b/i.test(raw)) {
    return fallback
  }
  if (AUTH_EN_RE.test(raw.trim())) {
    return 'Sua sessão expirou. Entre de novo para continuar.'
  }
  if (TIMEOUT_RE.test(raw)) {
    return 'A conexão demorou demais. Tente de novo.'
  }
  if (SERVER_RE.test(raw)) {
    return 'O serviço está temporariamente indisponível. Tente de novo.'
  }
  // Já em PT / mensagem da API — passa adiante.
  if (/[áàâãéêíóôõúç]|não|trilha|senha|aluno|sessão|permissão/i.test(raw)) {
    return raw
  }
  // Inglês cru residual → fallback amigável.
  if (/^[A-Za-z][A-Za-z0-9 .,_:-]*$/.test(raw) && raw.length < 80) {
    return fallback
  }
  return raw || fallback
}

export function isRetryableSystemError(err: unknown): boolean {
  if (err instanceof TypeError) return true
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  if (!raw) return true
  if (AUTH_EN_RE.test(raw.trim())) return false
  return NETWORK_RE.test(raw) || TIMEOUT_RE.test(raw) || SERVER_RE.test(raw)
}
