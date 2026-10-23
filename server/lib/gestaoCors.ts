/**
 * CORS restrito aos domínios do Crias (Gestão / painel / previews Vercel).
 * Sem `Access-Control-Allow-Origin: *`.
 */

const DEFAULT_EXACT = [
  'https://crias-web.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
]

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, '')
}

/** Origens extras via env CSV (`CORS_ALLOWED_ORIGINS`). */
export function parseCorsAllowedOrigins(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const raw = env.CORS_ALLOWED_ORIGINS?.trim()
  const fromEnv = raw
    ? raw
        .split(',')
        .map((o) => normalizeOrigin(o))
        .filter(Boolean)
    : []
  const publicOrigin = env.PUBLIC_APP_ORIGIN?.trim().replace(/\/$/, '')
  const extras = publicOrigin ? [publicOrigin] : []
  return [...new Set([...DEFAULT_EXACT, ...fromEnv, ...extras])]
}

/**
 * Aceita origem se estiver na allowlist ou for preview Vercel do projeto Crias.
 */
export function isAllowedCorsOrigin(
  origin: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!origin) return false
  const normalized = normalizeOrigin(origin)
  if (!normalized) return false
  if (parseCorsAllowedOrigins(env).includes(normalized)) return true

  let url: URL
  try {
    url = new URL(normalized)
  } catch {
    return false
  }

  if (url.protocol === 'http:') {
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  }
  if (url.protocol !== 'https:') return false

  const host = url.hostname
  // Produção e aliases do projeto.
  if (host === 'crias-web.vercel.app') return true
  // Previews: crias-xxxxx.vercel.app, crias-web-git-….vercel.app, crias-painel-….
  if (
    /^crias(-web|-painel)?([.-][\w-]+)*\.vercel\.app$/i.test(host) ||
    (/^crias[\w.-]*\.vercel\.app$/i.test(host) &&
      host.includes('derikfernandes'))
  ) {
    return true
  }
  return false
}

/**
 * Headers CORS para a resposta. Só define Allow-Origin quando a Origin
 * do request é permitida (nunca `*`).
 */
export function gestaoCorsHeaders(
  request: Request,
  methods: string,
  env: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  const origin = request.headers.get('Origin')
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  }
  if (origin && isAllowedCorsOrigin(origin, env)) {
    headers['Access-Control-Allow-Origin'] = normalizeOrigin(origin)
  }
  return headers
}
