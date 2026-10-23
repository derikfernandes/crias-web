/**
 * Headers de autenticação das APIs da Gestão (Firebase ID token).
 * Usar em todo fetch admin → /api/* que exige login.
 */
import { auth } from './firebase'

export async function gestaoAuthHeaders(
  extra?: Record<string, string>,
): Promise<Record<string, string>> {
  if (!auth?.currentUser) {
    throw new Error('Faça login na Gestão para continuar.')
  }
  const token = await auth.currentUser.getIdToken()
  return {
    ...(extra ?? {}),
    Authorization: `Bearer ${token}`,
  }
}
