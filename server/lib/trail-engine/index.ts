/**
 * Shared Trail Engine — API pública (Wave A).
 * Independente de path HTTP; Chatis e app Trilha consomem as mesmas funções.
 */

export {
  advance,
  computeLegacyPrimitiveAdvance,
  computeSemanticAdvance,
  effectFingerprint,
  loadTrailTotals,
  markInteraction,
  requestFingerprint,
  resolveIdempotencyDecision,
  setProgressStatus,
} from './advance'
export type { AdvanceInput } from './advance'

export { assertServiceBearer, isMutationMethod } from './auth'

export { contentFingerprint } from './contentFingerprint'

export {
  additiveProgressDefaults,
  ensureEnrollment,
  getActiveEnrollment,
  getEnrollment,
  listEnrollmentsForStudent,
  questionDocId,
  requireEnrollment,
  snapshotToProgress,
  stageDocId,
  studentTrailDocId,
} from './enrollment'

export {
  isTrailEngineError,
  TrailEngineError,
  trailEngineErrorToJson,
} from './errors'
export type { TrailEngineErrorCode } from './errors'

export { decideNextAction, getNextContent } from './getNextContent'

export {
  resolvePersistedDeliveryText,
  resolveStepDisplayBody,
} from './resolvePersistedDelivery'
export type { ResolvedStepBody } from './resolvePersistedDelivery'

export { getTrailHistory } from './getHistory'
export type { HistoryItem, TrailHistoryResult } from './getHistory'

export { getTrailConversation } from './getConversation'
export type {
  TrailConversationMessage,
  TrailConversationResult,
} from './getConversation'

export { ensureStepDelivery } from './ensureStepDelivery'
export type { EnsureStepDeliveryResult } from './ensureStepDelivery'

export { getStatus } from './getStatus'

export { buildStableIdempotencyKey } from './idempotencyKey'

export {
  isValidCanonicalPhone,
  phoneLookupVariants,
  stripPhoneDigits,
  toCanonicalPhone,
} from './phoneNormalize'

export {
  recordDelivery,
  recordMessage,
  recordStudentMessage,
} from './recordMessage'
export type { RecordMessageInput, RecordMessageResult } from './recordMessage'

export {
  resolveStudentByPhone,
  resolveStudentByPhoneSoft,
} from './resolveStudent'

export { submitExerciseAnswer } from './submitExercise'
export type { SubmitExerciseInput, SubmitExerciseResult } from './submitExercise'

export type {
  AdvanceReason,
  AdvanceResult,
  AiContentStatus,
  CollectionNames,
  ComputedAdvance,
  LegacyPrimitive,
  NextAction,
  NextContentResult,
  NextContentSource,
  ResolvedStudent,
  StageType,
  StudentTrailProgress,
  StudentTrailStatus,
  TrailChannel,
} from './types'
export { defaultCollectionNames } from './types'
