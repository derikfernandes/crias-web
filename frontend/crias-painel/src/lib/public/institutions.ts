/**
 * API pública de instituições para componentes visuais.
 * Reexporta wrappers existentes sem alterar comportamento.
 */
export {
  createInstitutionSequential,
  deleteInstitution,
  subscribeToInstitutionOptions,
  updateInstitution,
  type InstitutionFormData,
} from '../institutionFirestore'
