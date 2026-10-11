/** Seta do proto — ↑ enviar Maria; → Continuar / Enviar resposta. */
export default function SendArrowIcon({
  size = 18,
  direction = 'up',
}: {
  size?: number
  direction?: 'up' | 'right'
}) {
  const d =
    direction === 'right'
      ? 'M5 12h14M13 6l6 6-6 6'
      : 'M12 19V5M6 11l6-6 6 6'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
