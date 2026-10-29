/**
 * REGRA DE LOGIN DO ALUNO (atualizada com a decisão do dérik no PR #34).
 *
 *  1. Nome obrigatório. Pelo menos um de: telefone OU e-mail.
 *  2. O campo de login do app identifica sozinho: e-mail → busca por e-mail;
 *     dígitos → telefone (e ID do documento, como s1766).
 *  3. Canais que autenticam (mesma senha):
 *     - só telefone → telefone (+ ID)
 *     - só e-mail → e-mail (+ ID)
 *     - telefone e e-mail → os DOIS (+ ID)
 *  4. `login_identifier` pode existir no banco como preferência legada / default de UI,
 *     mas NÃO bloqueia o outro canal quando ambos estão cadastrados.
 *
 * Educação (admin_users): login hoje é Firebase e-mail/senha. Telefone da Educação
 * continua TODO (custom token). O seletor "Entrar com" em Usuários da Gestão, se
 * ainda aparecer, é só da Educação — não do aluno.
 *
 * Backend: `identifyStudent` em server/lib/studentTrailProgressService.ts
 * (loginChannelsForStudent / studentAcceptsTypedLogin).
 *
 * Veja também docs/ORIENTACOES-CURSOR-1.2.md.
 */

export type LoginIdentifier = 'phone' | 'email'

/** Canais com que o aluno pode entrar, dados os contatos cadastrados. */
export function loginChannelsForContact(input: {
  phone?: string | null
  email?: string | null
}): LoginIdentifier[] {
  const hasPhone = Boolean((input.phone ?? '').replace(/\D/g, ''))
  const hasEmail = Boolean((input.email ?? '').trim())
  const out: LoginIdentifier[] = []
  if (hasPhone) out.push('phone')
  if (hasEmail) out.push('email')
  return out
}

/**
 * Preferência de UI legada (não bloqueia autenticação).
 * Com os dois contatos e sem escolha, devolve 'phone' só como default visual.
 */
export function effectiveLoginIdentifier(input: {
  phone?: string | null
  email?: string | null
  chosen?: LoginIdentifier | null
}): LoginIdentifier | null {
  const channels = loginChannelsForContact(input)
  if (channels.length === 0) return null
  if (channels.length === 1) return channels[0]!
  return input.chosen === 'email' ? 'email' : 'phone'
}

/** O texto digitado no login parece e-mail? Senão trata como telefone ou ID. */
export function looksLikeEmail(login: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login.trim())
}
