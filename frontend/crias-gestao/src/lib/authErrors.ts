export function firebaseAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'E-mail inválido.'
    case 'auth/user-disabled':
      return 'Esta conta foi desativada.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos.'
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Tente novamente mais tarde.'
    case 'auth/network-request-failed':
      return 'Falha de rede. Verifique sua conexão.'
    default:
      return 'Não foi possível entrar. Tente novamente.'
  }
}
