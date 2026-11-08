import {Download, Mail, Paperclip, Trash2} from 'lucide-react'
import {useEffect, useState} from 'react'
import {toast} from 'sonner'
import {Badge} from '@/components/ui/Badge'
import {Button} from '@/components/ui/Button'
import {CopyButton} from '@/components/ui/CopyButton'
import {EmptyState, ErrorState, Loading} from '@/components/ui/States'
import {useBackend} from '@/hooks/useBackend'
import {formatBytes, formatDateTime, joinAddrs} from '@/lib/format'
import {cn} from '@/lib/utils'
import {api, errorMessage} from '@/services/api'
import type {Message} from '@/types'
import {HtmlPreview} from './HtmlPreview'

type Tab = 'preview' | 'text' | 'headers' | 'raw' | 'attachments'

function Meta({label, value}: {label: string; value: string}) {
  if (!value) return null
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="selectable min-w-0 break-words">{value}</dd>
    </>
  )
}

export function MessageView({id, onDelete}: {id: string | null; onDelete: (id: string) => void}) {
  const {data: m, error, loading, reload} = useBackend<Message | null>(
    () => (id ? api.message(id) : Promise.resolve(null)),
    [],
    [id],
  )
  const [tab, setTab] = useState<Tab>('preview')

  // default to the richest available view when a different message is opened
  useEffect(() => {
    if (m) setTab(m.hasHtml ? 'preview' : 'text')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.id])

  if (!id) {
    return (
      <EmptyState icon={Mail} title="Select an email">
        Choose a message from the list to inspect it.
      </EmptyState>
    )
  }
  if (loading && !m) return <Loading />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!m) return null

  const save = async (attId: string) => {
    try {
      const dest = await api.saveAttachment(attId)
      if (dest) toast.success('Attachment saved')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const tabs: {id: Tab; label: string}[] = [
    {id: 'preview', label: 'Preview'},
    {id: 'text', label: 'Text'},
    {id: 'headers', label: `Headers${m.headers ? ` (${m.headers.length})` : ''}`},
    {id: 'raw', label: 'Raw source'},
    {id: 'attachments', label: `Attachments (${m.attachments?.length ?? 0})`},
  ]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="selectable text-[15px] font-semibold">{m.subject || '(no subject)'}</h2>
          <Button variant="ghost" aria-label="Delete email" onClick={() => onDelete(m.id)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
        <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-1 text-[13px]">
          <Meta label="From" value={m.fromAddress} />
          <Meta label="To" value={joinAddrs(m.toAddresses)} />
          <Meta label="CC" value={joinAddrs(m.ccAddresses)} />
          <Meta label="BCC" value={joinAddrs(m.bccAddresses)} />
          <Meta label="Reply-To" value={m.replyTo} />
          <Meta label="Received" value={formatDateTime(m.receivedAt)} />
          <Meta label="Message-ID" value={m.messageId} />
          <dt className="text-muted">Project</dt>
          <dd>
            <Badge tone="brand">{m.projectName}</Badge>
          </dd>
        </dl>
      </div>

      <div role="tablist" aria-label="Message view" className="flex gap-1 border-b border-border px-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-[13px] font-medium transition-colors',
              tab === t.id ? 'border-cyan text-fg' : 'border-transparent text-muted hover:text-fg',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {tab === 'preview' &&
          (m.hasHtml ? (
            <HtmlPreview html={m.htmlBody ?? ''} />
          ) : (
            <p className="text-[13px] text-muted">This message has no HTML part. See the Text tab.</p>
          ))}

        {tab === 'text' &&
          (m.hasText ? (
            <div className="space-y-2">
              <div className="flex justify-end">
                <CopyButton text={m.textBody ?? ''} label="Copy text" what="Text" />
              </div>
              <pre className="selectable whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{m.textBody}</pre>
            </div>
          ) : (
            <p className="text-[13px] text-muted">This message has no plain-text part.</p>
          ))}

        {tab === 'headers' && (
          <table className="w-full text-xs">
            <tbody>
              {(m.headers ?? []).map((h, i) => (
                <tr key={i} className="border-b border-border/60 align-top">
                  <td className="selectable w-44 py-1.5 pr-3 font-mono font-medium text-cyan">{h.name}</td>
                  <td className="selectable break-all py-1.5 font-mono">{h.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'raw' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">
                {formatBytes(m.size)}
                {m.rawTruncated && ' · showing the first 2 MB'}
              </span>
              <CopyButton text={m.rawSource ?? ''} label="Copy raw source" what="Raw source" />
            </div>
            <pre className="selectable overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">
              {m.rawSource || 'Raw source is not available.'}
            </pre>
          </div>
        )}

        {tab === 'attachments' &&
          ((m.attachments?.length ?? 0) === 0 ? (
            <p className="text-[13px] text-muted">No attachments.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {m.attachments!.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Paperclip className="size-4 shrink-0 text-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="selectable truncate text-[13px] font-medium">{a.filename}</p>
                    <p className="font-mono text-[11px] text-muted">
                      {a.contentType} · {formatBytes(a.size)}
                    </p>
                  </div>
                  <Button onClick={() => save(a.id)}>
                    <Download className="size-4" /> Save
                  </Button>
                </li>
              ))}
            </ul>
          ))}
      </div>
    </div>
  )
}
