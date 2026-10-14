/** Versão atual (branch/tag do GitHub injetada no build do Vite). */
export function getAppVersion(): string {
  const raw = import.meta.env.VITE_APP_VERSION?.trim()
  return raw || 'v2.2'
}
