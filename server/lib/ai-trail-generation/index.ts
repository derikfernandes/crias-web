export {
  getDefaultAiTrailPrompt,
  getDefaultAiTrailPromptAsync,
  DEFAULT_AI_TRAIL_PROMPT,
} from './defaultPrompt.js'
export {
  extractDocuments,
  formatSourcesForPrompt,
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_TOTAL_CHARS,
} from './extractText.js'
export type { ExtractedDoc, ExtractResult, UploadedDoc } from './extractText.js'
export { generateAiTrail } from './generate.js'
export type { GenerateAiTrailInput, GenerateAiTrailResult } from './generate.js'
export {
  DEFAULT_TRAIL_GENERATE_TIMEOUT_MS,
  TRAIL_GENERATE_ROUTE_BUDGET_MS,
  TRAIL_GENERATE_TIMEOUT_USER_MESSAGE,
  canAffordTrailGenerateCall,
  friendlyTrailGenerateError,
  isTrailGenerateTimeoutError,
  remainingTrailGenerateTimeoutMs,
  resolveTrailGenerateTimeoutMs,
} from './timeout.js'
export { mapGeneratedTrailToDraft } from './mapToTrailModel.js'
export type {
  MappedContentEtapa,
  MappedContentPhase,
  MappedContentQuestion,
  MappedStructurePhase,
  MappedTrailDraft,
} from './mapToTrailModel.js'
export { GENERATED_TRAIL_JSON_SCHEMA, SYSTEM_WRAPPER } from './schema.js'
export type {
  AiTrailPhaseType,
  GeneratedBlock,
  GeneratedContent,
  GeneratedPhase,
  GeneratedStage,
  GeneratedTrail,
  ValidationIssue,
  ValidationResult,
} from './types.js'
export { normalizeCorrectOption, validateGeneratedTrail } from './validate.js'
