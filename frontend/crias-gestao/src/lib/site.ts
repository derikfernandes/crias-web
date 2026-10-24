/** Origem pública do Crias Web em produção na Vercel. */
export const PRODUCTION_APP_ORIGIN = 'https://crias-web.vercel.app'

/** URL pública da Gestão em produção (`/gestao/`). */
export const PRODUCTION_GESTAO_ORIGIN = `${PRODUCTION_APP_ORIGIN}/gestao`

/**
 * Base da API na documentação /doc quando `VITE_API_BASE_URL` não está definida.
 * Ajuste via env se o backend for outro host.
 */
export const PRODUCTION_API_DOC_BASE = PRODUCTION_APP_ORIGIN

/** Placeholder de contato no rodapé da sidebar (Ajuda). */
export const HELP_MAILTO = 'mailto:suporte@crias.org'
