export const initializeApp = () => ({ __mock: true })
export class FirebaseError extends Error {
  code = 'mock'
}
