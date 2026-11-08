import {Monitor, Moon, Sun} from 'lucide-react'
import {Tooltip} from '@/components/ui/Tooltip'
import {cn} from '@/lib/utils'
import {useThemeStore, type ThemePreference} from '@/stores/theme'

const OPTIONS: {value: ThemePreference; label: string; icon: typeof Sun}[] = [
  {value: 'dark', label: 'Dark theme', icon: Moon},
  {value: 'light', label: 'Light theme', icon: Sun},
  {value: 'system', label: 'System theme', icon: Monitor},
]

export function ThemeToggle() {
  const {preference, setPreference} = useThemeStore()
  return (
    <div role="radiogroup" aria-label="Theme" className="flex rounded-md border border-border p-0.5">
      {OPTIONS.map(({value, label, icon: Icon}) => (
        <Tooltip key={value} label={label} side="bottom">
          <button
            role="radio"
            aria-checked={preference === value}
            aria-label={label}
            onClick={() => setPreference(value)}
            className={cn(
              'flex size-6 items-center justify-center rounded transition-colors',
              preference === value ? 'bg-brand text-white' : 'text-muted hover:text-fg',
            )}
          >
            <Icon className="size-3.5" />
          </button>
        </Tooltip>
      ))}
    </div>
  )
}
