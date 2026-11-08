import type {InputHTMLAttributes, ReactNode, TextareaHTMLAttributes} from 'react'
import {cn} from '@/lib/utils'

// On focus only the border colour changes: no outline, ring or box-shadow.
const control =
  'w-full rounded-md border border-border bg-surface-2 px-3 text-[13px] text-fg placeholder:text-muted/70 ' +
  'transition-colors hover:border-muted/60 focus:border-brand focus:outline-none focus:shadow-none focus-visible:outline-none disabled:opacity-50'

export function Field({label, hint, children}: {label: string; hint?: string; children: ReactNode}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted">{hint}</span>}
    </label>
  )
}

export function Input({className, ...p}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, 'selectable h-8', className)} {...p} />
}

export function Textarea({className, ...p}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, 'selectable min-h-20 py-2', className)} {...p} />
}

export function Switch({checked, onChange, label}: {checked: boolean; onChange: (v: boolean) => void; label: string}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-brand' : 'bg-border')}
    >
      <span
        className={cn('absolute left-0.5 top-0.5 size-4 rounded-full bg-white transition-transform', checked && 'translate-x-4')}
      />
    </button>
  )
}
