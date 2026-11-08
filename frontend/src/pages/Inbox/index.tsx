import {ChevronLeft, ChevronRight, Inbox as InboxIcon, MailCheck, MailOpen, Trash2} from 'lucide-react'
import {useEffect, useMemo, useState} from 'react'
import {useSearchParams} from 'react-router-dom'
import {toast} from 'sonner'
import {EMPTY_FILTERS, FilterBar, type Filters} from '@/components/inbox/FilterBar'
import {MessageList} from '@/components/inbox/MessageList'
import {MessageView} from '@/components/inbox/MessageView'
import {Button} from '@/components/ui/Button'
import {ConfirmDialog} from '@/components/ui/ConfirmDialog'
import {EmptyState, ErrorState, Loading} from '@/components/ui/States'
import {useBackend} from '@/hooks/useBackend'
import {useDebounced} from '@/hooks/useDebounced'
import {dayBounds} from '@/lib/format'
import {api, errorMessage} from '@/services/api'
import type {MessageFilter} from '@/types'

const PAGE = 50

type Confirm = null | {kind: 'selected'} | {kind: 'clear'} | {kind: 'one'; id: string}

export default function InboxPage() {
  const [params, setParams] = useSearchParams()
  const [filters, setFilters] = useState<Filters>({...EMPTY_FILTERS, projectId: params.get('project') ?? ''})
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<Confirm>(null)

  const debounced = useDebounced(filters, 250)
  const {data: projects} = useBackend(api.projects, ['project:updated'])

  const query: MessageFilter = useMemo(
    () => ({
      projectId: debounced.projectId,
      search: debounced.search.trim(),
      sender: debounced.sender.trim(),
      recipient: debounced.recipient.trim(),
      ...dayBounds(debounced.from, debounced.to),
      unreadOnly: debounced.unreadOnly,
      oldestFirst: debounced.oldestFirst,
      limit: PAGE,
      offset: page * PAGE,
    }),
    [debounced, page],
  )

  // New mail, deletions and read-state changes are pushed from Go; no polling.
  const {data, error, loading, reload} = useBackend(
    () => api.messages(query),
    ['message:received', 'message:deleted', 'message:updated', 'project:updated'],
    [JSON.stringify(query)],
  )

  useEffect(() => setPage(0), [debounced])
  useEffect(() => {
    // keep the URL in sync so deep links (?project=) work and survive reloads
    const next = new URLSearchParams(params)
    if (filters.projectId) next.set('project', filters.projectId)
    else next.delete('project')
    if (next.toString() !== params.toString()) setParams(next, {replace: true})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.projectId])

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const lastPage = Math.max(0, Math.ceil(total / PAGE) - 1)
  const anyFilter = JSON.stringify({...filters, oldestFirst: false}) !== JSON.stringify({...EMPTY_FILTERS})

  // drop selection of messages that no longer exist
  useEffect(() => {
    if (!data) return
    const ids = new Set(items.map((m) => m.id))
    setChecked((c) => new Set([...c].filter((id) => ids.has(id))))
    if (selectedId && !ids.has(selectedId) && data.total === 0) setSelectedId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const open = async (id: string) => {
    setSelectedId(id)
    const m = items.find((x) => x.id === id)
    if (m && !m.isRead) {
      try {
        await api.setRead([id], true)
      } catch (e) {
        toast.error(errorMessage(e))
      }
    }
  }

  const toggle = (id: string) =>
    setChecked((c) => {
      const n = new Set(c)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const markChecked = async (read: boolean) => {
    try {
      await api.setRead([...checked], read)
      setChecked(new Set())
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const runConfirmed = async () => {
    if (!confirm) return
    try {
      if (confirm.kind === 'selected') {
        await api.deleteMessages([...checked])
        toast.success(`Deleted ${checked.size} email(s)`)
        setChecked(new Set())
      } else if (confirm.kind === 'one') {
        await api.deleteMessages([confirm.id])
        if (selectedId === confirm.id) setSelectedId(null)
        toast.success('Email deleted')
      } else {
        await api.clearInbox(filters.projectId)
        setSelectedId(null)
        setChecked(new Set())
        toast.success('Inbox cleared')
      }
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const clearLabel = filters.projectId ? 'Clear this project’s inbox' : 'Clear inbox'

  return (
    <div className="-m-6 flex h-[calc(100%+3rem)] min-h-0">
      <section aria-label="Email list" className="flex w-[340px] shrink-0 flex-col border-r border-border xl:w-[400px]">
        <FilterBar filters={filters} projects={(projects ?? []).filter((p) => p.messageCount > 0 || !p.isSystem)} onChange={setFilters} onRefresh={reload} />

        <div className="flex items-center gap-1 border-b border-border px-3 py-1.5 text-xs">
          {checked.size > 0 ? (
            <>
              <span className="text-muted">{checked.size} selected</span>
              <Button variant="ghost" className="ml-auto h-7" onClick={() => markChecked(true)} aria-label="Mark as read">
                <MailOpen className="size-3.5" />
              </Button>
              <Button variant="ghost" className="h-7" onClick={() => markChecked(false)} aria-label="Mark as unread">
                <MailCheck className="size-3.5" />
              </Button>
              <Button variant="ghost" className="h-7 text-danger" onClick={() => setConfirm({kind: 'selected'})} aria-label="Delete selected">
                <Trash2 className="size-3.5" />
              </Button>
            </>
          ) : (
            <>
              <label className="flex items-center gap-2 text-muted">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={items.length > 0 && items.every((m) => checked.has(m.id))}
                  onChange={(e) => setChecked(e.target.checked ? new Set(items.map((m) => m.id)) : new Set())}
                  className="accent-[#0878d1]"
                />
                {total} {total === 1 ? 'email' : 'emails'}
              </label>
              <Button variant="ghost" className="ml-auto h-7 text-muted" disabled={total === 0 && !anyFilter} onClick={() => setConfirm({kind: 'clear'})}>
                <Trash2 className="size-3.5" /> {clearLabel}
              </Button>
            </>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && !data && <Loading />}
          {error && <ErrorState message={error} onRetry={reload} />}
          {data && items.length === 0 && (
            <EmptyState icon={InboxIcon} title={anyFilter ? 'No emails match your filters' : 'Your inbox is empty'}>
              {anyFilter
                ? 'Try a different search or clear the filters.'
                : 'Start the SMTP server, point your app at it, and sent emails will appear here instantly.'}
            </EmptyState>
          )}
          {items.length > 0 && (
            <MessageList items={items} selectedId={selectedId} checked={checked} showProject={!filters.projectId} onSelect={open} onToggle={toggle} />
          )}
        </div>

        {total > PAGE && (
          <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-xs text-muted">
            <span>
              {page * PAGE + 1}–{Math.min(total, (page + 1) * PAGE)} of {total}
            </span>
            <span className="flex gap-1">
              <Button variant="ghost" className="h-7" disabled={page === 0} aria-label="Previous page" onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="ghost" className="h-7" disabled={page >= lastPage} aria-label="Next page" onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="size-4" />
              </Button>
            </span>
          </div>
        )}
      </section>

      <section aria-label="Email details" className="min-w-0 flex-1">
        <MessageView id={selectedId} onDelete={(id) => setConfirm({kind: 'one', id})} />
      </section>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === 'clear' ? clearLabel + '?' : 'Delete email(s)?'}
        description={
          confirm?.kind === 'clear'
            ? 'Every captured email (and its attachments) in this view will be permanently deleted.'
            : 'The selected email(s) and their attachments will be permanently deleted.'
        }
        confirmLabel="Delete"
        onConfirm={runConfirmed}
      />
    </div>
  )
}
