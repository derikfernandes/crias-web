import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const backendImportBan = {
  paths: [
    {
      name: 'firebase-admin',
      message: 'firebase-admin é exclusivo do backend (api/server).',
    },
  ],
  patterns: [
    {
      group: [
        '**/../../api/**',
        '**/../../server/**',
        '../../../api/**',
        '../../../server/**',
      ],
      message: 'Não importe api/ ou server/ a partir do frontend.',
    },
  ],
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // Barreira geral: frontend nunca importa backend / firebase-admin.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/design/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', backendImportBan],
    },
  },
  // Barreira: componentes protegidos (forms mistos) sem Firebase direto.
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...backendImportBan.paths,
            {
              name: 'firebase/firestore',
              message:
                'Componentes não acessam o Firestore. Use props ou src/lib/public/*.',
            },
            {
              name: 'firebase/auth',
              message:
                'Componentes não acessam Auth. Use hooks/páginas ou props.',
            },
            {
              name: 'firebase/app',
              message:
                'Componentes não importam Firebase. Use src/lib/public/dataLayer.',
            },
          ],
          patterns: [
            ...backendImportBan.patterns,
            {
              group: ['**/lib/firebase', '**/lib/firebase.*'],
              message:
                'Não importe firebase.ts em componentes. Use src/lib/public/dataLayer.',
            },
            {
              group: [
                '**/lib/*Firestore',
                '**/lib/*Firestore.*',
                '**/lib/trailApi',
                '**/lib/trailApi.*',
                '**/lib/dashboardSummaryApi',
                '**/lib/dashboardSummaryApi.*',
                '**/lib/adminUserFirestore',
                '**/lib/adminUserFirestore.*',
              ],
              message:
                'Use a camada pública em src/lib/public/* (não *Firestore / APIs internas).',
            },
          ],
        },
      ],
    },
  },
  // Barreira máxima: pasta design/ — somente apresentação.
  // Imports internos (../components, ../views, ../types, ../utils) são permitidos.
  // Escapes para src/lib, src/hooks, src/pages, src/components (fora de design) são bloqueados.
  {
    files: ['src/design/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'firebase',
              message: 'design/ não pode importar Firebase.',
            },
            {
              name: 'firebase/app',
              message: 'design/ não pode importar Firebase.',
            },
            {
              name: 'firebase/auth',
              message: 'design/ não pode importar Auth.',
            },
            {
              name: 'firebase/firestore',
              message: 'design/ não pode importar Firestore.',
            },
            {
              name: 'firebase-admin',
              message: 'design/ não pode importar firebase-admin.',
            },
            {
              name: 'axios',
              message: 'design/ não pode fazer chamadas HTTP.',
            },
          ],
          patterns: [
            {
              group: [
                '../../lib',
                '../../lib/**',
                '../../hooks',
                '../../hooks/**',
                '../../contexts',
                '../../contexts/**',
                '../../pages',
                '../../pages/**',
                '../../layouts',
                '../../layouts/**',
                '../../components',
                '../../components/**',
                '../../../lib/**',
                '../../../hooks/**',
                '../../../contexts/**',
                '../../../pages/**',
                '../../../layouts/**',
                '../../../components/**',
                '../../../api/**',
                '../../../server/**',
                '../../../../api/**',
                '../../../../server/**',
              ],
              message:
                'design/ não pode importar áreas protegidas (lib/hooks/contexts/pages/layouts/components fora de design). Use props.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.type='MetaProperty'][object.meta.name='import'][object.property.name='meta'][property.name='env']",
          message: 'design/ não pode ler import.meta.env.',
        },
        {
          selector:
            "MemberExpression[object.name='process'][property.name='env']",
          message: 'design/ não pode ler process.env.',
        },
        {
          selector: "CallExpression[callee.name='fetch']",
          message: 'design/ não pode chamar fetch().',
        },
        {
          selector: "CallExpression[callee.name='onSnapshot']",
          message: 'design/ não pode usar onSnapshot.',
        },
        {
          selector:
            "CallExpression[callee.name=/^(getDoc|getDocs|setDoc|addDoc|updateDoc|deleteDoc)$/]",
          message: 'design/ não pode chamar APIs do Firestore.',
        },
      ],
    },
  },
])
