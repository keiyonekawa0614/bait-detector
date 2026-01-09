interface FishingIconProps {
  className?: string
}

export function FishingIcon({ className }: FishingIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Fishing rod */}
      <path d="M3 3l6 6" />
      <path d="M9 9c0 0 3-1 5 1s1 5 1 5" />
      {/* Line */}
      <path d="M15 15l0 6" strokeDasharray="2 2" />
      {/* Hook */}
      <path d="M15 21c-1 0-2-1-2-2s1-2 2-2" />
      {/* Fish */}
      <ellipse cx="19" cy="19" rx="3" ry="2" />
      <path d="M22 19l1.5 1.5M22 19l1.5-1.5" />
    </svg>
  )
}
