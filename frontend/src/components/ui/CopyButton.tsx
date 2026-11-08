import {Copy} from 'lucide-react'
import {copyText} from '@/lib/clipboard'
import {Tooltip} from './Tooltip'

export function CopyButton({text, label, what}: {text: string; label: string; what?: string}) {
  return (
    <Tooltip label={label} side="top">
      <button
        aria-label={label}
        onClick={() => copyText(text, what ?? 'Copied')}
        className="rounded p-1 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <Copy className="size-3.5" />
      </button>
    </Tooltip>
  )
}
