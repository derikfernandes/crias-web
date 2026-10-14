#!/usr/bin/env node
/**
 * Seed dos prompts IA no Firestore.
 *
 * Preferência em preview/prod: Master → /prompts → "Seed (só ausentes)".
 *
 * CLI (ops):
 *   npx --yes tsx scripts/seed-ai-prompts.mjs [--force] [--dry-run]
 *
 * Env: FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON
 *      SEED_ACTOR_EMAIL / SEED_ACTOR_UID (opcionais)
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function loadServiceAccountJson() {
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON?.trim()
  if (!raw) {
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON ausente.')
  }
  if (raw.startsWith('{')) return JSON.parse(raw)
  if (raw.startsWith('@')) {
    return JSON.parse(readFileSync(raw.slice(1), 'utf8'))
  }
  try {
    return JSON.parse(readFileSync(raw, 'utf8'))
  } catch {
    return JSON.parse(raw)
  }
}

async function main() {
  const force = process.argv.includes('--force')
  const dryRun = process.argv.includes('--dry-run')
  const actor = {
    email: process.env.SEED_ACTOR_EMAIL?.trim() || 'seed@local',
    uid: process.env.SEED_ACTOR_UID?.trim() || 'seed-script',
  }

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          force,
          actor,
          ids: [
            'parceiro_estudo',
            'gerador_trilha',
            'spacing_rules',
            'criar_trilha_ia',
            'criar_trilha_ia_system',
          ],
        },
        null,
        2,
      ),
    )
    return
  }

  const admin = require('firebase-admin')
  const sa = loadServiceAccountJson()
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa) })
  }
  const db = admin.firestore()

  const mod = await import(
    pathToFileURL(join(root, 'server/lib/ai-prompts/promptRegistry.ts')).href
  )
  const result = await mod.seedAiPrompts(db, actor, { force })
  console.log(JSON.stringify(result, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
