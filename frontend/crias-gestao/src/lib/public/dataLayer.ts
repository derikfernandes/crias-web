/**
 * Camada pública para componentes visuais.
 * Expõe apenas o indicador de prontidão — sem a instância do banco.
 */
import { db } from '../firebase'

export const dataLayerReady = Boolean(db)
