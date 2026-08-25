export function EvidraMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Dark charcoal rounded square logomark — legible on white sidebar */}
      <rect x="0.5" y="0.5" width="31" height="31" rx="8" fill="#14161a" stroke="#2a2d35" />
      <path d="M16 7L24 14.5L21 24H11L8 14.5L16 7Z" stroke="#ffffff" strokeWidth="1.2" strokeLinejoin="round" fill="none" opacity="0.35" />
      <circle cx="16" cy="7" r="2" fill="#2f5fe0" />
      <circle cx="24" cy="14.5" r="1.6" fill="#7c53e0" />
      <circle cx="8" cy="14.5" r="1.6" fill="#7c53e0" />
      <circle cx="21" cy="24" r="1.6" fill="#d97a06" />
      <circle cx="11" cy="24" r="1.6" fill="#16874f" />
      <circle cx="16" cy="16.5" r="2.4" fill="#2f5fe0" />
      <path d="M16 16.5L16 7M16 16.5L24 14.5M16 16.5L8 14.5M16 16.5L21 24M16 16.5L11 24" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}
