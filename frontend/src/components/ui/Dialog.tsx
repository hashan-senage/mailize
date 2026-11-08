import * as RD from '@radix-ui/react-dialog'
import {X} from 'lucide-react'
import type {ReactNode} from 'react'
import {cn} from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

/** Accessible modal (focus trap, Esc to close, labelled) built on Radix. */
export function Dialog({open, onOpenChange, title, description, children, footer, wide}: Props) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <RD.Content
          aria-describedby={description ? undefined : undefined}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100vw-48px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-surface shadow-2xl',
            wide ? 'max-w-2xl' : 'max-w-md',
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <RD.Title className="text-[15px] font-semibold">{title}</RD.Title>
              {description && <RD.Description className="mt-1 text-[13px] text-muted">{description}</RD.Description>}
            </div>
            <RD.Close aria-label="Close" className="rounded p-1 text-muted hover:text-fg">
              <X className="size-4" />
            </RD.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  )
}
