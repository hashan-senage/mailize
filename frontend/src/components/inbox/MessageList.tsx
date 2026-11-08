import {Paperclip} from 'lucide-react'
import {formatRelative, joinAddrs} from '@/lib/format'
import {cn} from '@/lib/utils'
import type {Message} from '@/types'

interface Props {
  items: Message[]
  selectedId: string | null
  checked: Set<string>
  showProject: boolean
  onSelect: (id: string) => void
  onToggle: (id: string) => void
}

export function MessageList({items, selectedId, checked, showProject, onSelect, onToggle}: Props) {
  return (
    <ul aria-label="Emails" className="divide-y divide-border">
      {items.map((m) => (
        <li
          key={m.id}
          className={cn(
            'group flex gap-2.5 px-3 py-2.5 transition-colors hover:bg-surface-2',
            selectedId === m.id && 'bg-brand/10',
          )}
        >
          <input
            type="checkbox"
            aria-label={`Select email ${m.subject || '(no subject)'}`}
            checked={checked.has(m.id)}
            onChange={() => onToggle(m.id)}
            className="mt-1 size-3.5 shrink-0 accent-[#0878d1]"
          />
          <button onClick={() => onSelect(m.id)} className="min-w-0 flex-1 text-left" aria-current={selectedId === m.id}>
            <div className="flex items-center gap-2">
              {!m.isRead && <span aria-label="Unread" className="size-2 shrink-0 rounded-full bg-cyan" />}
              <span className={cn('truncate text-[13px]', m.isRead ? 'text-muted' : 'font-semibold')}>{m.fromAddress || '(unknown sender)'}</span>
              <span className="ml-auto shrink-0 text-[11px] text-muted">{formatRelative(m.receivedAt)}</span>
            </div>
            <p className={cn('mt-0.5 truncate text-[13px]', !m.isRead && 'font-medium')}>{m.subject || '(no subject)'}</p>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
              <span className="truncate">To: {joinAddrs(m.toAddresses) || '—'}</span>
              {m.attachmentCount > 0 && <Paperclip aria-label="Has attachments" className="size-3 shrink-0" />}
              {showProject && <span className="ml-auto shrink-0 rounded bg-surface-2 px-1.5 py-0.5">{m.projectName}</span>}
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
