/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string
  /** Base da API REST (documentação em /doc). Configure no .env local ou na Vercel. */
  readonly VITE_API_BASE_URL?: string
  /**
   * Override da origem em links públicos (`public_link`). Se omitido, usa sempre
   * `https://crias-trilhas.vercel.app` (também em dev). Ex.: `http://localhost:5173` só se
   * precisar gerar links locais.
   */
  readonly VITE_PUBLIC_APP_ORIGIN?: string
  /** Versão do app (branch/tag do GitHub, injetada no build). */
  readonly VITE_APP_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
