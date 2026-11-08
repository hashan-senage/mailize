import type {ReactNode} from 'react'
import {cn} from '@/lib/utils'

type Tone = 'neutral' | 'brand' | 'success' | 'warning'

const tones: Record<Tone, string> = {
  neutral: 'border-border text-muted',
  brand: 'border-brand/40 bg-brand/10 text-cyan',
  success: 'border-success/40 bg-success/10 text-success',
  warning: 'border-warning/40 bg-warning/10 text-warning',
}

export function Badge({tone = 'neutral', children, className}: {tone?: Tone; children: ReactNode; className?: string}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
