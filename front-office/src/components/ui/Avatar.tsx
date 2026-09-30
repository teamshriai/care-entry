import { cn } from '../../utils/cn'

type AvatarSize = 'sm' | 'md' | 'lg'

const PALETTE = [
  'bg-tile-blue text-tile-blue-fg',
  'bg-tile-teal text-tile-teal-fg',
  'bg-tile-violet text-tile-violet-fg',
]

function hashIndex(value: string, length: number): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash + value.charCodeAt(i)) % length
  }
  return hash
}

export function Avatar({
  initials,
  size = 'md',
  className = '',
}: {
  initials?: string
  size?: AvatarSize
  className?: string
}) {
  const sizes: Record<AvatarSize, string> = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  }
  const palette = PALETTE[hashIndex(initials ?? '?', PALETTE.length)]

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold',
        sizes[size],
        palette,
        className,
      )}
    >
      {initials}
    </span>
  )
}
