/** Mascote neon da Maria — entrada estilo Clippy (sticker). */
export default function MariaMascot({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <svg
        className="maria-mascot__svg"
        viewBox="0 0 120 120"
        width="96"
        height="96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="mariaGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* glow disc */}
        <circle cx="60" cy="62" r="42" fill="#17ea9d" opacity="0.12" />
        {/* body / face plate */}
        <g filter="url(#mariaGlow)">
          <rect
            x="28"
            y="30"
            width="64"
            height="58"
            rx="18"
            stroke="#17ea9d"
            strokeWidth="3"
            fill="#0c1a14"
          />
          {/* screen */}
          <rect
            x="36"
            y="40"
            width="48"
            height="34"
            rx="10"
            fill="#e8fff6"
            stroke="#17ea9d"
            strokeWidth="1.5"
          />
          {/* happy eyes */}
          <path
            d="M46 54c2.2-2.4 6-2.4 8.2 0"
            stroke="#0c1a14"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M66 54c2.2-2.4 6-2.4 8.2 0"
            stroke="#0c1a14"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* smile */}
          <path
            d="M52 64c2.8 3.2 13.2 3.2 16 0"
            stroke="#0c1a14"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* headphones */}
          <path
            d="M30 52c-6 2-8 10-6 16"
            stroke="#17ea9d"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M90 52c6 2 8 10 6 16"
            stroke="#17ea9d"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="26" cy="68" r="6" stroke="#17ea9d" strokeWidth="2.5" fill="#0c1a14" />
          <circle cx="94" cy="68" r="6" stroke="#17ea9d" strokeWidth="2.5" fill="#0c1a14" />
          {/* sprout */}
          <path
            d="M52 30c-2-8 4-14 8-14 0 6-2 10-4 14"
            stroke="#17ea9d"
            strokeWidth="2.2"
            fill="#0f3d2a"
          />
          <path
            d="M58 30c2-7 8-11 11-10-1 6-4 10-7 12"
            stroke="#17ea9d"
            strokeWidth="2.2"
            fill="#0f3d2a"
          />
          {/* book */}
          <g transform="translate(72 78)">
            <rect
              x="0"
              y="0"
              width="22"
              height="16"
              rx="2"
              fill="#17ea9d"
              opacity="0.9"
            />
            <path d="M11 0v16" stroke="#04140f" strokeWidth="1.2" />
            <path d="M3 5h6M3 9h6M14 5h5M14 9h5" stroke="#04140f" strokeWidth="1" />
          </g>
        </g>
        {/* sparkles */}
        <path d="M18 38l1.5 3.5L23 43l-3.5 1.5L18 48l-1.5-3.5L13 43l3.5-1.5z" fill="#f6e27a" />
        <path d="M98 28l1.2 2.8L102 32l-2.8 1.2L98 36l-1.2-2.8L94 32l2.8-1.2z" fill="#f6e27a" />
        <circle cx="104" cy="70" r="1.6" fill="#f6e27a" />
        <circle cx="22" cy="78" r="1.4" fill="#fff" opacity="0.85" />
      </svg>
    </div>
  )
}
