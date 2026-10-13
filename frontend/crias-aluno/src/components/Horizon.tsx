/**
 * Fundo do app do aluno (v6, seção 4).
 * Camada absoluta atrás do conteúdo, sem eventos de ponteiro.
 *
 * - login e home: malha 3D (brilho + piso em grade em perspectiva).
 * - chat (trilha e Monitoria): só a névoa, a 70% de opacidade.
 */
type Props = {
  mode: 'login' | 'home' | 'chat'
}

export default function Horizon({ mode }: Props) {
  const chat = mode === 'chat'
  const H = mode === 'chat' ? 64 : mode === 'home' ? 129 : 190
  const rise = 'vRise 2.4s cubic-bezier(.16,1,.3,1) both'

  const glow = (
    <span
      className="v6-hz-glow"
      style={{
        top: `calc(100% - ${H + 380}px)`,
        animation: `${rise}, vAurora 16s ease-in-out 2.4s infinite`,
      }}
    />
  )

  if (!chat) {
    const perspective = mode === 'home' ? 700 : 900
    return (
      <div className="v6-hz" aria-hidden="true">
        {glow}
        <div
          className="v6-hz-floor"
          style={{ transform: `perspective(${perspective}px) rotateX(70deg)` }}
        />
      </div>
    )
  }

  return (
    <div className="v6-hz v6-hz--chat" aria-hidden="true">
      {glow}
      <span className="v6-hz-smoke" />
    </div>
  )
}
