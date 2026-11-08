import * as RS from '@radix-ui/react-select'
import {Check, ChevronDown} from 'lucide-react'
import {cn} from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  'aria-label': string
  className?: string
  disabled?: boolean
}

// Radix forbids an empty-string item value, so "" (e.g. "All projects") is mapped to a sentinel.
const EMPTY = '__empty__'
const enc = (v: string) => (v === '' ? EMPTY : v)
const dec = (v: string) => (v === EMPTY ? '' : v)

/** Custom dropdown (no native <select>): keyboard navigable, typeahead, accessible. */
export function Select({value, onValueChange, options, className, disabled, 'aria-label': ariaLabel}: Props) {
  return (
    <RS.Root value={enc(value)} onValueChange={(v) => onValueChange(dec(v))} disabled={disabled}>
      <RS.Trigger
        aria-label={ariaLabel}
        className={cn(
          'flex h-8 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface-2 px-3 text-left text-[13px] text-fg',
          'transition-colors hover:border-muted/60 focus:border-brand focus:outline-none data-[state=open]:border-brand',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          <RS.Value />
        </span>
        <RS.Icon>
          <ChevronDown className="size-4 shrink-0 text-muted" />
        </RS.Icon>
      </RS.Trigger>
      <RS.Portal>
        <RS.Content
          position="popper"
          sideOffset={4}
          className="z-[60] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-xl"
        >
          <RS.Viewport>
            {options.map((o) => (
              <RS.Item
                key={enc(o.value)}
                value={enc(o.value)}
                className="relative flex h-8 cursor-pointer select-none items-center rounded-md py-1 pl-8 pr-3 text-[13px] text-fg outline-none data-[highlighted]:bg-brand/15 data-[state=checked]:text-cyan"
              >
                <RS.ItemIndicator className="absolute left-2.5">
                  <Check className="size-3.5" />
                </RS.ItemIndicator>
                <RS.ItemText>{o.label}</RS.ItemText>
              </RS.Item>
            ))}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  )
}
