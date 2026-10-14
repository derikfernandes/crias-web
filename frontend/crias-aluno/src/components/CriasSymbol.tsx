/**
 * Símbolo do Crias (v1.0, seção 5).
 * Animado: sobe, cresce e gira devagar, com um brilho circular atrás.
 * Parado (animated=false): só a imagem. Sempre como arquivo, nunca texto.
 */
type Props = {
  size: number
  animated?: boolean
  className?: string
}

export default function CriasSymbol({ size, animated = true, className }: Props) {
  const src = `${import.meta.env.BASE_URL}crias-symbol.png`
  if (!animated) {
    return (
      <img
        className={className ? `v1-0-symbol ${className}` : 'v1-0-symbol'}
        src={src}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
    )
  }
  const glow = Math.round(size * 0.18)
  return (
    <span
      className={`v1-0-symbol-wrap${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="v1-0-symbol-glow" style={{ inset: -glow }} />
      <img
        className="v1-0-symbol v1-0-symbol--anim"
        src={src}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
    </span>
  )
}
