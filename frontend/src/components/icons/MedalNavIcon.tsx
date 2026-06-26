type Props = {
  className?: string
}

/** Icono compacto de medalla para la navegación. */
export function MedalNavIcon({ className = "navlink-icon-medal" }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="1.15em"
      height="1.15em"
      aria-hidden
      focusable="false"
    >
      <circle cx="12" cy="10" r="6.5" fill="currentColor" opacity="0.18" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="10" r="4" fill="currentColor" opacity="0.35" />
      <path
        d="M9.5 16.5 8 21l4-2 4 2-1.5-4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}
