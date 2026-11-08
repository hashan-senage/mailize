import {Play, Square} from 'lucide-react'
import {useEffect, useState} from 'react'
import {toast} from 'sonner'
import {ConfigPanel} from '@/components/projects/ConfigPanel'
import {Badge} from '@/components/ui/Badge'
import {Button} from '@/components/ui/Button'
import {Card, CardHeader} from '@/components/ui/Card'
import {Select} from '@/components/ui/Select'
import {ErrorState, Loading} from '@/components/ui/States'
import {useBackend} from '@/hooks/useBackend'
import {useSmtpStatus} from '@/hooks/useSmtpStatus'
import {api, errorMessage} from '@/services/api'
import {Link} from 'react-router-dom'

export default function SMTPPage() {
  const {data: status, error, loading, reload} = useSmtpStatus()
  const {data: projects} = useBackend(api.projects, ['project:updated'])
  const [busy, setBusy] = useState(false)
  const [projectId, setProjectId] = useState('')

  const selectable = (projects ?? []).filter((p) => !p.isSystem)
  useEffect(() => {
    if (!projectId && selectable.length) setProjectId(selectable[0].id)
    if (projectId && !selectable.some((p) => p.id === projectId)) setProjectId(selectable[0]?.id ?? '')
  }, [selectable, projectId])

  const toggle = async () => {
    if (!status) return
    setBusy(true)
    try {
      if (status.running) await api.stopSmtp()
      else await api.startSmtp()
      reload()
    } catch (e) {
      toast.error(errorMessage(e))
      reload()
    } finally {
      setBusy(false)
    }
  }

  if (loading && !status) return <Loading />
  if (error || !status) return <ErrorState message={error ?? 'Unable to read SMTP status.'} onRetry={reload} />

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold">Capture server</h2>
              <Badge tone={status.running ? 'success' : 'neutral'}>{status.running ? 'Running' : 'Stopped'}</Badge>
            </div>
            <p className="selectable mt-1.5 font-mono text-[13px]">
              {status.running ? status.address : 'Not listening'}
            </p>
            {status.running && (
              <p className="mt-1 text-xs text-muted">{status.activeConnections} active connection(s)</p>
            )}
            {status.lastError && !status.running && <p role="alert" className="mt-1 text-xs text-danger">{status.lastError}</p>}
          </div>
          <Button variant={status.running ? 'secondary' : 'primary'} onClick={toggle} disabled={busy}>
            {status.running ? <Square className="size-4" /> : <Play className="size-4" />}
            {status.running ? 'Stop server' : 'Start server'}
          </Button>
        </div>
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
          Captured emails are stored locally and never forwarded to real recipients. Host, port and limits are configured in{' '}
          <Link to="/settings" className="text-cyan hover:underline">
            Settings
          </Link>
          .
        </p>
      </Card>

      <Card>
        <CardHeader
          title="SMTP configuration"
          action={
            selectable.length > 0 && (
              <Select
                aria-label="Project"
                value={projectId}
                onValueChange={setProjectId}
                options={selectable.map((p) => ({value: p.id, label: p.name}))}
                className="w-52"
              />
            )
          }
        />
        <div className="p-4">
          {selectable.length === 0 ? (
            <p className="text-[13px] text-muted">
              Create a <Link to="/projects" className="text-cyan hover:underline">project</Link> to generate SMTP credentials.
            </p>
          ) : (
            projectId && <ConfigPanel projectId={projectId} />
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Test the connection" />
        <ol className="list-decimal space-y-2 p-4 pl-9 text-[13px] text-muted">
          <li>Make sure the server above is <span className="text-fg">Running</span>.</li>
          <li>Paste the configuration into your application and trigger an email (for Laravel: <code className="font-mono text-fg">php artisan tinker</code> → <code className="font-mono text-fg">Mail::raw('Hello', fn($m) =&gt; $m-&gt;to('test@example.local'))</code>).</li>
          <li>Open the <Link to="/inbox" className="text-cyan hover:underline">Inbox</Link>. The message should appear immediately.</li>
          <li>If it does not: confirm the port matches, encryption is off, and the project is enabled. Rejected logins show as “Authentication failed”.</li>
        </ol>
      </Card>
    </div>
  )
}
