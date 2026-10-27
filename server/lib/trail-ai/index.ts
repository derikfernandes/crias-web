export {
  buildTrailAiPrompt,
  formatContextFromLogs,
  loadTrailAiPromptParts,
} from './buildTrailAiPrompt'
export type { BuiltTrailAiPrompt, TrailAiPromptInput } from './buildTrailAiPrompt'
export { ensureTrailAiContent } from './ensureTrailAiContent'
export type { EnsureTrailAiResult } from './ensureTrailAiContent'
export { formatAiAnswer } from './formatAiAnswer'
export {
  buildVertexGenerateContentUrl,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_VERTEX_LOCATION,
  DEFAULT_VERTEX_MODEL,
  GEMINI_FETCH_TIMEOUT_CAP_MS,
  GEMINI_FETCH_TIMEOUT_MS,
  PINNED_GEMINI_MODEL,
  generateContentWithGemini,
  GOOGLE_OAUTH_SCOPES,
  isGeminiFlashFamilyModel,
  isTrailAiDisabled,
  normalizeVertexModelId,
  resolveEffectiveVertexLocation,
  resolveGenerateContentTimeoutMs,
  resolveGeminiModel,
  resolveTrailAiModel,
  resolveVertexTarget,
} from './geminiClient'
export {
  invalidateTrailAiDelivery,
  listRecentContextLogs,
  listTrailConversationLogsSafe,
  readTrailAiDeliveryFingerprint,
  resolveDeliveredAiContent,
  trailAiDeliveryDocId,
  upsertTrailAiDeliveryCache,
} from './resolveDeliveredAiContent'
export {
  blocoMismatchesSubject,
  contentFingerprint,
  enrichBlocoContent,
  extractCorrectLetterFromText,
  filterContextForBloco,
  isBlocoRespostaPrompt,
} from './blocoSubjectGuard'
