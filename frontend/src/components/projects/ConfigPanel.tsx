import {useState} from 'react'
import {Button} from '@/components/ui/Button'
import {CopyButton} from '@/components/ui/CopyButton'
import {ErrorState, Loading} from '@/components/ui/States'
import {useBackend} from '@/hooks/useBackend'
import {copyText} from '@/lib/clipboard'
import {cn} from '@/lib/utils'
import {api} from '@/services/api'
import type {Framework} from '@/types'

const FRAMEWORKS: {id: Framework; label: string}[] = [
  {id: 'laravel', label: 'Laravel'},
  {id: 'php', label: 'PHP'},
  {id: 'node', label: 'Node.js'},
  {id: 'generic', label: 'Generic SMTP'},
]

/** Framework presets + copyable values for one project. Credentials come from the backend, never hardcoded. */
export function ConfigPanel({projectId, refreshKey = 0}: {projectId: string; refreshKey?: number}) {
  const [framework, setFramework] = useState<Framework>('laravel')
  const {data, error, loading, reload} = useBackend(
    () => api.smtpConfig(projectId, framework),
    ['project:updated'],
    [projectId, framework, refreshKey],
  )

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Framework" className="flex gap-1 rounded-lg border border-border p-1">
        {FRAMEWORKS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={framework === f.id}
            onClick={() => setFramework(f.id)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
              framework === f.id ? 'bg-brand text-white' : 'text-muted hover:text-fg',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && !data && <Loading />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <>
          <div className="rounded-lg border border-border bg-surface-2">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="font-mono text-xs text-muted">{data.filename}</span>
              <Button className="h-7" onClick={() => copyText(data.snippet, 'Configuration copied')}>
                Copy configuration
              </Button>
            </div>
            <pre className="selectable overflow-x-auto p-3 font-mono text-xs leading-relaxed">{data.snippet}</pre>
          </div>

          <dl className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 text-[13px]">
            {data.values.map((v) => (
              <div key={v.label} className="contents">
                <dt className="text-muted">{v.label}</dt>
                <dd className="selectable truncate font-mono">{v.value}</dd>
                <CopyButton text={v.value} label={`Copy ${v.label.toLowerCase()}`} what={v.label} />
              </div>
            ))}
          </dl>

          <ul className="space-y-1 text-xs text-muted">
            {data.notes.map((n) => (
              <li key={n}>• {n}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
