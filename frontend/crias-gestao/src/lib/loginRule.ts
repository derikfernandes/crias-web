/**
 * REGRA DE LOGIN (definida pelo Thiago, versão 1.2). Vale para TODA a aplicação:
 * aluno (Crias Aluno) e usuário da Educação (Crias Educação).
 *
 *  1. A pessoa pode ter OU e-mail OU telefone (pelo menos um dos dois). Nome é sempre obrigatório.
 *  2. O sistema IDENTIFICA sozinho o que foi digitado no campo de login: se parece e-mail, procura por e-mail;
 *     se são dígitos, procura por telefone (e pelo ID do aluno, como já faz hoje).
 *  3. Se a pessoa tiver os DOIS, escolhe qual deles vale para a senha dela. Essa escolha fica no campo
 *     `login_identifier` ('phone' | 'email'). Sem o campo, vale o que existir; havendo os dois, vale o telefone.
 *
 * O QUE O FRONTEND JÁ FAZ (esta pasta e as telas):
 *  - Cadastro de aluno e de usuário: nome obrigatório e telefone ou e-mail; seletor "Entrar com" quando há os dois.
 *  - Planilhas em massa: mesma regra de cadastro.
 *  - Grava `students.email`, `students.login_identifier`, `admin_users.name`, `admin_users.phone_number` e
 *    `admin_users.login_identifier`. Usuário da Educação só com telefone ganha o ID de documento `tel_<dígitos>`.
 *
 * CURSOR 1.2 (o que o backend AINDA PRECISA fazer, nada disso foi feito no frontend):
 *  A. Aluno: `identifyStudent` (server/lib/studentTrailProgressService.ts) já aceita telefone, e-mail ou ID.
 *     Falta respeitar `login_identifier`: se for 'email', o telefone não autentica; se for 'phone', o e-mail não
 *     autentica. Sem o campo, aceita os dois.
 *  B. Usuário da Educação: o login hoje é Firebase Auth e-mail/senha. Falta aceitar telefone: sugestão é uma
 *     função de servidor que recebe `login` + senha, acha o documento em `admin_users` (por e-mail, por
 *     `phone_number` ou pelo ID `tel_...`), valida a senha e devolve um custom token do Firebase Auth.
 *     Usuário só com telefone não tem e-mail no Firebase Auth: criar a conta de Auth com e-mail sintético
 *     (ex.: `tel_<dígitos>@login.crias.local`) ou usar o custom token por UID = ID do documento.
 *  C. `firestore.rules`: foi adicionada a coleção `admin_profiles` (perfis editáveis). Fazer o deploy das regras.
 *  D. Senha da Educação gerada ou definida pela tela de Usuários: hoje só existe "Redefinir senha" por e-mail
 *     (Firebase). Para usuário só com telefone é preciso um caminho de definir senha pelo servidor.
 *
 * Veja também docs/ORIENTACOES-CURSOR-1.2.md.
 */

export type LoginIdentifier = 'phone' | 'email'

/** Identificador que vale para a senha: o escolhido, ou o único que existir, ou o telefone se houver os dois. */
export function effectiveLoginIdentifier(input: {
  phone?: string | null
  email?: string | null
  chosen?: LoginIdentifier | null
}): LoginIdentifier | null {
  const hasPhone = Boolean((input.phone ?? '').replace(/\D/g, ''))
  const hasEmail = Boolean((input.email ?? '').trim())
  if (hasPhone && hasEmail) return input.chosen === 'email' ? 'email' : 'phone'
  if (hasPhone) return 'phone'
  if (hasEmail) return 'email'
  return null
}

/** O texto digitado no login parece e-mail? Senão trata como telefone ou ID. */
export function looksLikeEmail(login: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login.trim())
}
