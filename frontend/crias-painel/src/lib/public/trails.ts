/**
 * API pública de trilhas para componentes visuais.
 * Reexporta wrappers existentes sem alterar comportamento.
 */
export {
  saveTrailContentDraft,
  saveTrailWithStructure,
  updateTrail,
  type TrailStructureSaveData,
  type TrailUpdateData,
} from '../trailFirestore'

export { deleteTrailCascade } from '../trailApi'
