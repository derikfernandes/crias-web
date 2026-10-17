import { useEffect, useRef, useState } from 'react'

/**
 * Símbolo do Crias (v1.1, regra 1.1.38).
 * Animado: sobe, cresce e balança devagar, com um brilho circular atrás.
 * O brilho só aparece depois que a imagem carregou (nunca só o brilho).
 * Usa a versão leve de 192px. Parado (animated=false): só a imagem.
 */
type Props = {
  size: number
  animated?: boolean
  className?: string
}

export default function CriasSymbol({ size, animated = true, className }: Props) {
  const src = `${import.meta.env.BASE_URL}crias-symbol-192.png`
  const imgRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) setLoaded(true)
  }, [])
  if (!animated) {
    return (
      <img
        className={className ? `v1-0-symbol ${className}` : 'v1-0-symbol'}
        src={src}
        alt=""
        width={size}
        height={size}
        decoding="sync"
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
      {loaded ? <span className="v1-0-symbol-glow" style={{ inset: -glow }} /> : null}
      <img
        ref={imgRef}
        className="v1-0-symbol v1-0-symbol--anim"
        src={src}
        alt=""
        width={size}
        height={size}
        decoding="sync"
        onLoad={() => setLoaded(true)}
        style={{ width: size, height: size }}
      />
    </span>
  )
}
