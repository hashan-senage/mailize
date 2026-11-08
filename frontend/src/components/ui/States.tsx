import {AlertTriangle, Loader2, type LucideIcon} from 'lucide-react'
import type {ReactNode} from 'react'
import {Button} from './Button'

export function Loading({label = 'Loading…'}: {label?: string}) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-muted">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  )
}

export function ErrorState({message, onRetry}: {message: string; onRetry?: () => void}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
      <AlertTriangle className="size-6 text-danger" />
      <p className="max-w-sm text-[13px] text-muted">{message}</p>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  )
}

export function EmptyState({icon: Icon, title, children}: {icon: LucideIcon; title: string; children?: ReactNode}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-brand/10 text-cyan">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-1 text-sm font-semibold">{title}</h3>
      {children && <div className="max-w-sm text-[13px] text-muted">{children}</div>}
    </div>
  )
}
