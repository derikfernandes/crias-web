/** Orb de progresso (proto v4) — verde ou amarelo. */
type Props = {
  pct?: number | null
  hue?: 'g' | 'y'
  size?: number
  className?: string
}

export default function TrailOrb({
  pct = 0,
  hue = 'g',
  size = 34,
  className,
}: Props) {
  const p = Math.max(0, Math.min(100, pct ?? 0))
  const r = size / 2 + Math.max(3, size * 0.16)
  const box = Math.ceil(r * 2 + 4)
  const c = 2 * Math.PI * r
  const sw = Math.max(2, size * 0.06)
  const stroke = hue === 'y' ? '#ffd500' : '#00be85'
  const core =
    hue === 'y'
      ? 'radial-gradient(circle at 32% 28%, #fff7c4 0%, #ffd500 40%, #a87e00 100%)'
      : 'radial-gradient(circle at 32% 28%, #c4ffe9 0%, #00be85 40%, #00553a 100%)'

  return (
    <span
      className={`trail-orb${className ? ` ${className}` : ''}`}
      style={{ width: box, height: box }}
      aria-hidden
    >
      <svg
        width={box}
        height={box}
        viewBox={`0 0 ${box} ${box}`}
        className="trail-orb__ring"
      >
        <circle
          cx={box / 2}
          cy={box / 2}
          r={r}
          fill="none"
          stroke="var(--cr-line, #203328)"
          strokeWidth={sw}
        />
        <circle
          cx={box / 2}
          cy={box / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${(c * p) / 100} ${c}`}
        />
      </svg>
      <span
        className="trail-orb__core"
        style={{
          width: size,
          height: size,
          marginLeft: (box - size) / 2,
          marginTop: (box - size) / 2,
          background: core,
        }}
      />
    </span>
  )
}

/** Seta verde do proto (direita / baixo). */
export function TrailChevron({
  open = false,
  className,
}: {
  open?: boolean
  className?: string
}) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#00be85"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={open ? 'M6 9l6 6 6-6' : 'M9 6l6 6-6 6'} />
    </svg>
  )
}
