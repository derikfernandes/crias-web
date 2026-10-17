import { useMemo } from 'react'
import { DocPageView } from '../design/views/DocPageView'
import { PRODUCTION_API_DOC_BASE, PRODUCTION_APP_ORIGIN } from '../lib/site'

export function DocPage() {
  const viteApiBase = import.meta.env.VITE_API_BASE_URL
  const baseUrl = useMemo(
    () => (viteApiBase ?? PRODUCTION_API_DOC_BASE).replace(/\/$/, ''),
    [viteApiBase],
  )

  return (
    <DocPageView
      baseUrl={baseUrl}
      appOrigin={PRODUCTION_APP_ORIGIN}
      showDefaultBaseHint={!viteApiBase}
    />
  )
}
