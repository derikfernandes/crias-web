/** Maria amarela #ffd500 — protótipo v4 (nav / composer / hero / login). */
type Size = 'nav' | 'composer' | 'hero' | 'login'

const PX: Record<Size, number> = {
  nav: 28,
  composer: 48,
  hero: 112,
  login: 96,
}

type Props = {
  size?: Size
  mood?: 'idle' | 'oi'
  className?: string
}

export default function MariaFace({
  size = 'nav',
  mood = 'idle',
  className,
}: Props) {
  const s = PX[size]
  const wave = mood === 'oi' && (size === 'hero' || size === 'login')
  return (
    <span
      className={[
        'maria-face',
        `maria-face--${size}`,
        wave ? 'maria-face--wave' : '',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width: s, height: Math.round(s * (wave ? 1.12 : 1)) }}
      aria-hidden
    >
      {size === 'hero' || size === 'login' ? (
        <span className="maria-face__shadow" />
      ) : null}
      <span className="maria-face__bob">
        <span className="maria-face__shell">
          <span className="maria-face__gloss" />
          <svg
            className="maria-face__svg"
            viewBox="0 0 100 100"
            width={s * 0.68}
            height={s * 0.68}
          >
            <ellipse cx="34" cy="44" rx="7.4" ry="8.6" fill="#001c0e" />
            <circle cx="36.4" cy="40.2" r="2.7" fill="#fff" />
            <ellipse cx="66" cy="44" rx="7.4" ry="8.6" fill="#001c0e" />
            <circle cx="68.4" cy="40.2" r="2.7" fill="#fff" />
            <path
              d="M35 64 Q50 78 65 64"
              stroke="#001c0e"
              strokeWidth="5.4"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </span>
        {wave ? <span className="maria-face__hand" /> : null}
      </span>
    </span>
  )
}
