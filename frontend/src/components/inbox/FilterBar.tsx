import {RefreshCw, Search} from 'lucide-react'
import {Button} from '@/components/ui/Button'
import {Input} from '@/components/ui/Field'
import {Select} from '@/components/ui/Select'
import type {Project} from '@/types'

export interface Filters {
  projectId: string
  search: string
  sender: string
  recipient: string
  from: string // YYYY-MM-DD
  to: string
  unreadOnly: boolean
  oldestFirst: boolean
}

export const EMPTY_FILTERS: Filters = {
  projectId: '',
  search: '',
  sender: '',
  recipient: '',
  from: '',
  to: '',
  unreadOnly: false,
  oldestFirst: false,
}

interface Props {
  filters: Filters
  projects: Project[]
  onChange: (f: Filters) => void
  onRefresh: () => void
}

export function FilterBar({filters, projects, onChange, onRefresh}: Props) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({...filters, [k]: v})
  const active = JSON.stringify({...filters, projectId: '', oldestFirst: false}) !== JSON.stringify(EMPTY_FILTERS)

  return (
    <div className="space-y-2 border-b border-border p-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted" />
          <Input
            aria-label="Search emails"
            placeholder="Search subject, sender, recipient, body…"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            className="pl-8"
          />
        </div>
        <Button aria-label="Refresh inbox" onClick={onRefresh}>
          <RefreshCw className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select
          aria-label="Filter by project"
          value={filters.projectId}
          onValueChange={(v) => set('projectId', v)}
          options={[{value: '', label: 'All projects'}, ...projects.map((p) => ({value: p.id, label: p.name}))]}
        />
        <Select
          aria-label="Sort order"
          value={filters.oldestFirst ? 'oldest' : 'newest'}
          onValueChange={(v) => set('oldestFirst', v === 'oldest')}
          options={[
            {value: 'newest', label: 'Newest first'},
            {value: 'oldest', label: 'Oldest first'},
          ]}
        />
        <Input aria-label="Filter by sender" placeholder="Sender" value={filters.sender} onChange={(e) => set('sender', e.target.value)} />
        <Input aria-label="Filter by recipient" placeholder="Recipient" value={filters.recipient} onChange={(e) => set('recipient', e.target.value)} />
        <Input aria-label="From date" type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} />
        <Input aria-label="To date" type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 text-muted">
          <input type="checkbox" checked={filters.unreadOnly} onChange={(e) => set('unreadOnly', e.target.checked)} className="accent-[#0878d1]" />
          Unread only
        </label>
        {active && (
          <button className="text-cyan hover:underline" onClick={() => onChange({...EMPTY_FILTERS, projectId: filters.projectId, oldestFirst: filters.oldestFirst})}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
