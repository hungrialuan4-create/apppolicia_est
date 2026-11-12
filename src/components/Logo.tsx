export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="pbg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <path d="M32 4 56 12v18c0 15-10 26-24 30C18 56 8 45 8 30V12z" fill="url(#pbg)" stroke="#d4af37" strokeWidth="3" />
      <path d="m32 18 4.2 8.6 9.4 1.4-6.8 6.6 1.6 9.4L32 39.5l-8.4 4.5 1.6-9.4-6.8-6.6 9.4-1.4z" fill="#d4af37" />
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark />
      {!compact && (
        <div className="leading-tight">
          <div className="text-[15px] font-extrabold tracking-[.18em] text-white">POLÍCIA</div>
          <div className="text-[11px] font-bold tracking-[.42em] text-gold">BRASIL</div>
        </div>
      )}
    </div>
  )
}
