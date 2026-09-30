import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-on-primary border-transparent hover:bg-primary-700 shadow-[0_1px_3px_0_rgba(37,99,235,0.3)] hover:shadow-[0_4px_16px_0_rgba(37,99,235,0.35)]',
  secondary:
    'bg-primary-50 text-primary-text border-primary-200 hover:bg-primary-100 hover:border-primary-300',
  ghost:
    'bg-transparent text-ink-subtle border-transparent hover:bg-surface-2 hover:text-ink',
  danger:
    'bg-danger text-on-danger border-transparent hover:opacity-90 shadow-[0_1px_3px_0_rgba(220,38,38,0.3)]',
}

// Design-system sizes carry a MIN HEIGHT, not just padding. `sm` maps to the
// system's dense-row `xs` (36px) so buttons inside table rows stay compact.
const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'min-h-11 px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'min-h-12 px-5 py-2.5 text-sm rounded-xl gap-2',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className = '', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center border font-semibold transition-all duration-200 active:scale-[0.97]',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-600/15',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
})
