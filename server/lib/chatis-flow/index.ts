/**
 * Chatis flow IR — Wave C (discovery-only).
 * Não altera handlers WhatsApp / strangler de runtime.
 */

export {
  ChatisParseError,
  detectVersionFromBuilderName,
  parseChatisExport,
  parseChatisExportJson,
} from './parseChatisExport'

export { migrateFlow24To25, MIGRATE_STUDENT_CURSOR_POLICY } from './migrate'

export { diffCriasTrailFlows } from './diff'

export {
  detectBlockIdChanges,
  detectChatisVersion,
  validateChatisExport,
} from './validate'

export {
  assertNoSilentWipe,
  decideStudentMigration,
  STUDENT_MIGRATION_POLICY_DOC,
} from './migrationPolicy'

export type {
  ChatisFlowVersion,
  ChatisRawExport,
  CriasTrailFlow,
  DiffChange,
  DiffChangeKind,
  DiffReport,
  EndpointSpec,
  ProgressionLoop,
  StudentMigrationContext,
  StudentMigrationDecision,
  TutorKey,
  ValidationIssue,
  ValidationResult,
  VariableDecl,
} from './types'
