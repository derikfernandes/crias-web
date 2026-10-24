import { useMemo } from 'react'
import { useAuth } from './useAuth'
import {
  canAccessInstitution,
  canAccessNav,
  filterInstitutionsByAccess,
  hasFullAccess,
  hasGestaoAccess,
  isMasterAccess,
  isUnrestrictedAccess,
} from '../lib/adminPermissions'
import type { NavPermission } from '../types/adminUser'

export function usePermissions() {
  const { adminProfile, permissionsLoading, user } = useAuth()
  const userEmail = user?.email ?? null

  return useMemo(
    () => ({
      adminProfile,
      permissionsLoading,
      isUnrestricted: isUnrestrictedAccess(adminProfile),
      hasFullAccess: hasFullAccess(adminProfile, userEmail),
      hasGestaoAccess: hasGestaoAccess(adminProfile, userEmail),
      isMaster: isMasterAccess(adminProfile, userEmail),
      canNav: (permission: NavPermission) =>
        canAccessNav(adminProfile, permission, { userEmail }),
      canInstitution: (institutionId: string) =>
        canAccessInstitution(adminProfile, institutionId, { userEmail }),
      filterInstitutions: <T extends { id: string }>(items: T[]) =>
        filterInstitutionsByAccess(adminProfile, items, { userEmail }),
    }),
    [adminProfile, permissionsLoading, userEmail],
  )
}
