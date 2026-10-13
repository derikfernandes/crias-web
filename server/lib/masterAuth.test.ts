import { describe, expect, it } from 'vitest'

import {
  isEmailInMasterEnvList,
  parseMasterAdminEmails,
} from './masterAuth'

describe('masterAuth env list', () => {
  it('parseia CSV de e-mails normalizados', () => {
    const emails = parseMasterAdminEmails({
      MASTER_ADMIN_EMAILS: ' Alice@Exemplo.com , bob@exemplo.com ',
    } as NodeJS.ProcessEnv)
    expect(emails).toEqual(['alice@exemplo.com', 'bob@exemplo.com'])
  })

  it('lista vazia sem env', () => {
    expect(parseMasterAdminEmails({} as NodeJS.ProcessEnv)).toEqual([])
  })

  it('isEmailInMasterEnvList', () => {
    const env = {
      MASTER_ADMIN_EMAILS: 'master@exemplo.com',
    } as NodeJS.ProcessEnv
    expect(isEmailInMasterEnvList('Master@Exemplo.com', env)).toBe(true)
    expect(isEmailInMasterEnvList('other@exemplo.com', env)).toBe(false)
  })
})
