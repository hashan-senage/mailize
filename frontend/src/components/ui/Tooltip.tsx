import * as RT from '@radix-ui/react-tooltip'
import type {ReactNode} from 'react'

export function TooltipProvider({children}: {children: ReactNode}) {
  return <RT.Provider delayDuration={250}>{children}</RT.Provider>
}

interface Props {
  label: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  disabled?: boolean
  children: ReactNode
}

export function Tooltip({label, side = 'right', disabled, children}: Props) {
  if (disabled) return <>{children}</>
  return (
    <RT.Root>
      <RT.Trigger asChild>{children}</RT.Trigger>
      <RT.Portal>
        <RT.Content
          side={side}
          sideOffset={8}
          className="z-50 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-fg shadow-lg"
        >
          {label}
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  )
}
