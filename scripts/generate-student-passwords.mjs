#!/usr/bin/env node
/**
 * Master script: gera senhas para alunos sem password_hash.
 *
 * Uso (NÃO rodar em massa em produção sem --dry-run primeiro):
 *
 *   # Dry-run Instituto Sol (não grava)
 *   node scripts/generate-student-passwords.mjs --school "Instituto Sol" --dry-run
 *
 *   # Gerar de verdade (só quem ainda não tem senha)
 *   node scripts/generate-student-passwords.mjs --school "Instituto Sol" --out senhas.csv
 *
 *   # Forçar regeneração (sobrescreve existentes)
 *   node scripts/generate-student-passwords.mjs --school "Instituto Sol" --force --out senhas.csv
 *
 * Env obrigatórias:
 *   FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON  (JSON string, caminho, ou @arquivo.json)
 *   STUDENT_PASSWORD_KEY                 (32 bytes em base64 ou hex)
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import {
  buildPasswordFields,
  studentsToCsv,
} from './lib/student-password.mjs'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))

function parseArgs(argv) {
  const out = {
    school: null,
    institutionId: null,
    dryRun: false,
    force: false,
    outFile: null,
    help: false,
  }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--force') out.force = true
    else if (a === '--school') out.school = argv[++i]
    else if (a === '--institution-id') out.institutionId = argv[++i]
    else if (a === '--out') out.outFile = argv[++i]
    else if (a === '--help' || a === '-h') out.help = true
    else {
      console.error(`Argumento desconhecido: ${a}`)
      process.exit(2)
    }
  }
  return out
}

function loadServiceAccountJson() {
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON?.trim()
  if (!raw) {
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON ausente.')
  }
  if (raw.startsWith('@')) {
    return JSON.parse(readFileSync(resolve(raw.slice(1)), 'utf8'))
  }
  if (raw.startsWith('{')) return JSON.parse(raw)
  return JSON.parse(readFileSync(resolve(raw), 'utf8'))
}

function digitsOnly(v) {
  return String(v ?? '').replace(/\D/g, '')
}

async function main() {
  const args = parseArgs(process.argv)
  if (args.help) {
    console.log(`Usage: node scripts/generate-student-passwords.mjs [options]
  --school <nome|id>
  --institution-id <id>
  --dry-run
  --force
  --out <file.csv>`)
    process.exit(0)
  }

  if (!process.env.STUDENT_PASSWORD_KEY?.trim()) {
    throw new Error('STUDENT_PASSWORD_KEY ausente.')
  }

  // firebase-admin pode estar na raiz do monorepo
  let initializeApp, cert, getApps, getFirestore, FieldValue
  try {
    ;({ initializeApp, cert, getApps } = require('firebase-admin/app'))
    ;({ getFirestore, FieldValue } = require('firebase-admin/firestore'))
  } catch {
    const rootRequire = createRequire(resolve(__dirname, '../package.json'))
    ;({ initializeApp, cert, getApps } = rootRequire('firebase-admin/app'))
    ;({ getFirestore, FieldValue } = rootRequire('firebase-admin/firestore'))
  }

  if (!getApps().length) {
    initializeApp({ credential: cert(loadServiceAccountJson()) })
  }
  const db = getFirestore()
  const studentsCollection = process.env.STUDENTS_COLLECTION || 'students'
  const institutionsCollection =
    process.env.INSTITUTIONS_COLLECTION || 'institutions'

  let institutionId = args.institutionId
  if (!institutionId && args.school) {
    const schoolKey = args.school.trim().toLowerCase()
    const byId = await db
      .collection(institutionsCollection)
      .doc(args.school.trim())
      .get()
    if (byId.exists) {
      institutionId = byId.id
    } else {
      const all = await db.collection(institutionsCollection).get()
      for (const doc of all.docs) {
        const name = typeof doc.data()?.name === 'string' ? doc.data().name : ''
        if (name.trim().toLowerCase() === schoolKey) {
          institutionId = doc.id
          break
        }
      }
    }
    if (!institutionId) {
      throw new Error(`Escola não encontrada: ${args.school}`)
    }
    console.error(`Instituição resolvida: ${institutionId}`)
  }

  let query = db.collection(studentsCollection)
  if (institutionId) {
    query = query.where('institution_id', '==', institutionId)
  }
  const snap = await query.get()

  const schoolNameById = new Map()
  const rows = []
  let skipped = 0
  const toWrite = []

  for (const doc of snap.docs) {
    const data = doc.data() ?? {}
    const hasHash =
      typeof data.password_hash === 'string' && data.password_hash.length > 0
    if (hasHash && !args.force) {
      skipped += 1
      continue
    }
    const instId =
      typeof data.institution_id === 'string' ? data.institution_id : ''
    if (instId && !schoolNameById.has(instId)) {
      try {
        const inst = await db.collection(institutionsCollection).doc(instId).get()
        const name =
          typeof inst.data()?.name === 'string' ? inst.data().name : instId
        schoolNameById.set(instId, name)
      } catch {
        schoolNameById.set(instId, instId)
      }
    }
    const fields = buildPasswordFields(null)
    const row = {
      id: doc.id,
      school: schoolNameById.get(instId) ?? instId,
      name: typeof data.name === 'string' ? data.name : '',
      phone_number: digitsOnly(data.phone_number),
      password: fields.password_plain,
    }
    rows.push(row)
    if (!args.dryRun) {
      toWrite.push({ ref: doc.ref, fields })
    }
  }

  let updated = 0
  if (!args.dryRun && toWrite.length > 0) {
    const CHUNK = 400
    for (let i = 0; i < toWrite.length; i += CHUNK) {
      const chunk = toWrite.slice(i, i + CHUNK)
      const batch = db.batch()
      for (const item of chunk) {
        batch.update(item.ref, {
          password_hash: item.fields.password_hash,
          password_encrypted: item.fields.password_encrypted,
          updated_at: FieldValue.serverTimestamp(),
        })
      }
      await batch.commit()
      updated += chunk.length
    }

    // auditoria
    await db.collection('student_password_audit').add({
      actor_email: process.env.MASTER_SCRIPT_ACTOR_EMAIL || 'script@local',
      actor_uid: 'script',
      action: 'bulk_generate',
      institution_id: institutionId || null,
      student_ids: rows.map((r) => r.id).slice(0, 500),
      student_count: rows.length,
      meta: {
        force: Boolean(args.force),
        updated,
        skipped_existing: skipped,
        via: 'scripts/generate-student-passwords.mjs',
      },
      created_at: FieldValue.serverTimestamp(),
    })
  }

  console.error(
    JSON.stringify(
      {
        dry_run: args.dryRun,
        scanned: snap.size,
        would_update: rows.length,
        updated,
        skipped_existing: skipped,
      },
      null,
      2,
    ),
  )

  const csv = studentsToCsv(rows)
  if (args.outFile) {
    writeFileSync(args.outFile, csv, 'utf8')
    console.error(`CSV escrito em ${args.outFile}`)
  } else {
    process.stdout.write(csv)
  }

}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
