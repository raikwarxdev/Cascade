import { cn } from '@/lib/utils'

type LogoProps = {
  className?: string
  markClassName?: string
  wordmarkClassName?: string
  size?: number
}

/**
 * Cascade wordmark: a solid terracotta tile with three descending slots cut
 * clean out of it — the cascade read as negative space, so it holds up on any
 * background and at any size.
 */
export function Logo({ className, markClassName, wordmarkClassName, size = 22 }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} className={markClassName} />
      <span
        className={cn(
          'font-sans text-[1.0625rem] font-bold tracking-[-0.02em] text-foreground',
          wordmarkClassName,
        )}
      >
        Cascade
      </span>
    </span>
  )
}

export function LogoMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn('text-accent', className)}
    >
      <defs>
        <mask id="cascade-mark-cutout">
          <rect width="24" height="24" rx="6.5" fill="#fff" />
          <g fill="#000">
            <rect x="4" y="5.6" width="10" height="3.2" rx="1.6" />
            <rect x="7" y="10.4" width="10" height="3.2" rx="1.6" />
            <rect x="10" y="15.2" width="10" height="3.2" rx="1.6" />
          </g>
        </mask>
      </defs>
      <rect
        width="24"
        height="24"
        rx="6.5"
        fill="currentColor"
        mask="url(#cascade-mark-cutout)"
      />
    </svg>
  )
}
