import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  assertNoSilentWipe,
  decideStudentMigration,
  detectBlockIdChanges,
  detectChatisVersion,
  diffCriasTrailFlows,
  migrateFlow24To25,
  parseChatisExport,
  parseChatisExportJson,
  ChatisParseError,
  validateChatisExport,
} from '../index'
import type { ChatisRawExport } from '../types'

const here = dirname(fileURLToPath(import.meta.url))
const fixtures = join(here, '..', '__fixtures__')

function readFixture(name: string): string {
  return readFileSync(join(fixtures, name), 'utf8')
}

function loadJson(name: string): ChatisRawExport {
  return JSON.parse(readFixture(name)) as ChatisRawExport
}

describe('detectChatisVersion', () => {
  it('detecta 2.4 no snippet e no oráculo raiz', () => {
    expect(detectChatisVersion(loadJson('crias-2.4.snippet.json'))).toBe('2.4')
    const oracle = readFileSync(
      join(here, '..', '..', '..', '..', '[ONLINE]_Crias_2.4.json'),
      'utf8',
    )
    expect(detectChatisVersion(oracle)).toBe('2.4')
  })
})

describe('parseChatisExport — oráculo 2.4', () => {
  it('produz IR CriasTrailFlow alinhado ao discovery', () => {
    const oracle = JSON.parse(
      readFileSync(
        join(here, '..', '..', '..', '..', '[ONLINE]_Crias_2.4.json'),
        'utf8',
      ),
    ) as ChatisRawExport
    const flow = parseChatisExport(oracle)
    expect(flow.version).toBe('2.4')
    expect(flow.source.builderId).toBe(284)
    expect(flow.source.blockCount).toBe(82)
    expect(flow.source.connectionCount).toBe(187)
    expect(flow.source.httpActionCount).toBe(32)
    expect(flow.variables.length).toBe(19)
    expect(flow.scripts.length).toBe(2)
    expect(flow.identity.phonePath).toBe('contact.phone')
    expect(flow.agents.trailAI.id).toBe(81)
    expect(flow.agents.supervisor.id).toBe(87)
    expect(flow.agents.tutors.matematica.agentId).toBe(85)
    expect(flow.phases.progression.advance.httpMode).toBe('legacy_primitives')
    expect(flow.validatorSemantics).toBe('chatis_false_port_is_on_match')
    expect(
      flow.http.endpoints.some((e) => e.role === 'lookup_student'),
    ).toBe(true)
    expect(
      flow.http.endpoints.some((e) => e.role === 'advance_stage'),
    ).toBe(true)
  })
})

describe('Cases A–G (fixtures)', () => {
  const base = loadJson('crias-2.4.snippet.json')
  const baseFlow = parseChatisExport(base)

  it('A — text change: valid + diff text_change', () => {
    const raw = loadJson('case-a-text-change.json')
    expect(validateChatisExport(raw).ok).toBe(true)
    const report = diffCriasTrailFlows(baseFlow, parseChatisExport(raw))
    expect(report.summary.textChanges).toBeGreaterThanOrEqual(1)
    expect(report.changes.some((c) => c.kind === 'text_change')).toBe(true)
  })

  it('B — add activity', () => {
    const raw = loadJson('case-b-add-activity.json')
    expect(validateChatisExport(raw).ok).toBe(true)
    const report = diffCriasTrailFlows(baseFlow, parseChatisExport(raw))
    expect(report.summary.activitiesAdded).toBe(1)
  })

  it('C — remove activity', () => {
    const raw = loadJson('case-c-remove-activity.json')
    expect(validateChatisExport(raw).ok).toBe(true)
    const report = diffCriasTrailFlows(baseFlow, parseChatisExport(raw))
    expect(report.summary.activitiesRemoved).toBe(1)
  })

  it('D — unknown field: warning, parse ok', () => {
    const raw = loadJson('case-d-unknown-field.json')
    const v = validateChatisExport(raw)
    expect(v.ok).toBe(true)
    expect(v.issues.some((i) => i.code === 'unknown_field')).toBe(true)
    const flow = parseChatisExport(raw)
    expect(flow.rawUnknownFields).toContain('experimentalFlag')
  })

  it('E — missing required', () => {
    const raw = loadJson('case-e-missing-required.json')
    const v = validateChatisExport(raw)
    expect(v.ok).toBe(false)
    expect(v.issues.some((i) => i.code === 'missing_required')).toBe(true)
  })

  it('F — invalid JSON', () => {
    const text = readFixture('case-f-invalid.json')
    const v = validateChatisExport(text)
    expect(v.ok).toBe(false)
    expect(v.issues[0]?.code).toBe('invalid_json')
    expect(() => parseChatisExportJson(text)).toThrow(ChatisParseError)
  })

  it('G — id change', () => {
    const raw = loadJson('case-g-id-change.json')
    expect(validateChatisExport(raw).ok).toBe(true)
    const idIssues = detectBlockIdChanges(base, raw)
    expect(idIssues.some((i) => i.code === 'id_change')).toBe(true)
    const report = diffCriasTrailFlows(baseFlow, parseChatisExport(raw))
    expect(report.summary.idChanges).toBeGreaterThanOrEqual(1)
  })
})

describe('migrate 2.4 → 2.5 + diff', () => {
  it('troca legacy_primitives por facade next-content/advance', () => {
    const flow24 = parseChatisExport(loadJson('crias-2.4.snippet.json'))
    const flow25 = migrateFlow24To25(flow24)
    expect(flow25.version).toBe('2.5')
    expect(flow25.phases.progression.advance.httpMode).toBe('facade')
    expect(
      flow25.http.endpoints.some((e) => e.role === 'next_content'),
    ).toBe(true)
    expect(flow25.http.endpoints.some((e) => e.role === 'advance')).toBe(true)
    // lookup preservado (strangler)
    expect(
      flow25.http.endpoints.some((e) => e.role === 'lookup_student'),
    ).toBe(true)
    // primitives de progressão removidos do IR 2.5
    expect(
      flow25.http.endpoints.some((e) => e.role === 'advance_stage'),
    ).toBe(false)

    const report = diffCriasTrailFlows(flow24, flow25)
    expect(report.fromVersion).toBe('2.4')
    expect(report.toVersion).toBe('2.5')
    expect(report.changes.some((c) => c.kind === 'version_bump')).toBe(true)
    expect(report.summary.endpointChanges).toBeGreaterThan(0)
  })
})

describe('migration policy — in-progress (sem wipe)', () => {
  it('in_progress → rehydrate, wipeAllowed=false', () => {
    const d = decideStudentMigration({
      studentId: 's1',
      trailId: 't1',
      status: 'in_progress',
      fromVersion: '2.4',
      toVersion: '2.5',
    })
    expect(d.action).toBe('rehydrate_via_engine')
    expect(d.wipeAllowed).toBe(false)
    assertNoSilentWipe(d)
  })

  it('explicit reset não autoriza wipe silencioso', () => {
    const d = decideStudentMigration({
      studentId: 's1',
      trailId: 't1',
      status: 'in_progress',
      fromVersion: '2.4',
      toVersion: '2.5',
      explicitResetRequested: true,
    })
    expect(d.action).toBe('blocked_requires_manual')
    expect(d.wipeAllowed).toBe(false)
  })

  it('not_started preserva cursor', () => {
    const d = decideStudentMigration({
      studentId: 's1',
      trailId: 't1',
      status: 'not_started',
      fromVersion: '2.4',
      toVersion: '2.5',
    })
    expect(d.action).toBe('preserve_cursor')
    expect(d.wipeAllowed).toBe(false)
  })
})
