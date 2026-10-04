import type { Firestore } from 'firebase-admin/firestore'

import { requireEnrollment } from './enrollment'
import type { CollectionNames, StudentTrailProgress } from './types'
import { defaultCollectionNames } from './types'

export async function getStatus(
  db: Firestore,
  studentId: string,
  trailId: string,
  collections: CollectionNames = defaultCollectionNames(),
): Promise<StudentTrailProgress> {
  return requireEnrollment(db, studentId, trailId, collections)
}
