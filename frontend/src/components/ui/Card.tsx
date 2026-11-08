import type {HTMLAttributes, ReactNode} from 'react'
import {cn} from '@/lib/utils'

export function Card({className, ...props}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-border bg-surface', className)} {...props} />
}

export function CardHeader({title, action}: {title: string; action?: ReactNode}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {action}
    </div>
  )
}
