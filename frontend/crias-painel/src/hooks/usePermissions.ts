import { useMemo } from 'react'
import { useAuth } from './useAuth'
import {
  canAccessInstitution,
  canAccessNav,
  filterInstitutionsByAccess,
  hasFullAccess,
  isUnrestrictedAccess,
} from '../lib/adminPermissions'
import type { NavPermission } from '../types/adminUser'

export function usePermissions() {
  const { adminProfile, permissionsLoading } = useAuth()

  return useMemo(
    () => ({
      adminProfile,
      permissionsLoading,
      isUnrestricted: isUnrestrictedAccess(adminProfile),
      hasFullAccess: hasFullAccess(adminProfile),
      canNav: (permission: NavPermission) =>
        canAccessNav(adminProfile, permission),
      canInstitution: (institutionId: string) =>
        canAccessInstitution(adminProfile, institutionId),
      filterInstitutions: <T extends { id: string }>(items: T[]) =>
        filterInstitutionsByAccess(adminProfile, items),
    }),
    [adminProfile, permissionsLoading],
  )
}
