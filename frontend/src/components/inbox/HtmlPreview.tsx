import {Maximize2, ShieldCheck, X} from 'lucide-react'
import {useMemo, useState} from 'react'
import {Button} from '@/components/ui/Button'
import {buildPreviewDocument, hasRemoteContent} from '@/lib/emailHtml'

/**
 * Renders untrusted email HTML. The iframe has an EMPTY sandbox attribute: no scripts, no
 * same-origin access, no popups, no top-level navigation, no forms. The document also carries a
 * CSP that blocks all network loads. Email HTML is never inserted into the app's own DOM.
 */
export function HtmlPreview({html}: {html: string}) {
  const [full, setFull] = useState(false)
  const doc = useMemo(() => buildPreviewDocument(html), [html])
  const remote = useMemo(() => hasRemoteContent(html), [html])

  const frame = (
    <iframe
      title="Email HTML preview"
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={doc}
      className="size-full rounded-md border border-border bg-white"
    />
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-success" />
          Sandboxed preview{remote ? ' · remote images and styles are blocked' : ''}
        </span>
        <Button variant="ghost" className="h-7" onClick={() => setFull(true)}>
          <Maximize2 className="size-3.5" /> Full screen
        </Button>
      </div>
      <div className="min-h-0 flex-1">{frame}</div>

      {full && (
        <div role="dialog" aria-modal="true" aria-label="Full screen preview" className="fixed inset-0 z-50 flex flex-col bg-bg p-4">
          <div className="mb-3 flex justify-end">
            <Button onClick={() => setFull(false)} aria-label="Close full screen">
              <X className="size-4" /> Close
            </Button>
          </div>
          <div className="min-h-0 flex-1">{frame}</div>
        </div>
      )}
    </div>
  )
}
