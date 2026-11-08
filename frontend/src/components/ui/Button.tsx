import type {ButtonHTMLAttributes} from 'react'
import {cn} from '@/lib/utils'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
}

const variants = {
  primary: 'brand-gradient text-white hover:brightness-110',
  secondary: 'border border-border bg-surface text-fg hover:bg-surface-2',
  ghost: 'text-muted hover:bg-surface hover:text-fg',
}

export function Button({variant = 'secondary', className, type = 'button', ...props}: Props) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-8 items-center justify-center gap-2 rounded-md px-3 text-[13px] font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
