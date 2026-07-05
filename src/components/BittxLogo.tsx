// Shared BITTX Logo component — gradient "B" icon
export function BittxLogoIcon({ size = 40 }: { size?: number }) {
  const r = size * 0.26
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={`bittxGrad_${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#ec4899" />
          <stop offset="30%"  stopColor="#a78bfa" />
          <stop offset="60%"  stopColor="#34d399" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx={r} fill={`url(#bittxGrad_${size})`} />
      <text
        x="50" y="72"
        textAnchor="middle"
        fontFamily="'Arial Black', Arial, sans-serif"
        fontWeight="900"
        fontSize="62"
        fill="white"
        style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.35))' }}
      >B</text>
    </svg>
  )
}
