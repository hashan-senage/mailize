import {Lock, Play, ShieldCheck, Square, TriangleAlert} from 'lucide-react'
import {Link} from 'react-router-dom'
import {Badge} from '@/components/ui/Badge'
import {Button} from '@/components/ui/Button'
import {Card} from '@/components/ui/Card'
import {useNow} from '@/hooks/useNow'
import {formatDuration} from '@/lib/format'
import type {ServerInfo, SMTPStatus} from '@/types'

interface Props {
  smtp: SMTPStatus
  server: ServerInfo
  busy: boolean
  onToggle: () => void
}

function Detail({label, value, mono}: {label: string; value: React.ReactNode; mono?: boolean}) {
  return (
    <div>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className={mono ? 'selectable mt-0.5 font-mono text-[13px]' : 'mt-0.5 text-[13px]'}>{value}</dd>
    </div>
  )
}

export function ServerCard({smtp, server, busy, onToggle}: Props) {
  const now = useNow(smtp.running)
  const uptime = smtp.running && smtp.startedAt ? formatDuration((now - new Date(smtp.startedAt).getTime()) / 1000) : '—'

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-2.5">
              {smtp.running && <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />}
              <span className={`relative inline-flex size-2.5 rounded-full ${smtp.running ? 'bg-success' : 'bg-muted'}`} />
            </span>
            <h2 className="text-[15px] font-semibold">SMTP capture server</h2>
            <Badge tone={smtp.running ? 'success' : 'neutral'}>{smtp.running ? 'Running' : 'Stopped'}</Badge>
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {smtp.running
              ? 'Accepting mail from your applications. Nothing is forwarded to real recipients.'
              : 'Start the server to begin capturing email from your applications.'}
          </p>
        </div>
        <Button variant={smtp.running ? 'secondary' : 'primary'} onClick={onToggle} disabled={busy} className="h-9 px-4">
          {smtp.running ? <Square className="size-4" /> : <Play className="size-4" />}
          {busy ? (smtp.running ? 'Stopping…' : 'Starting…') : smtp.running ? 'Stop server' : 'Start SMTP server'}
        </Button>
      </div>

      {smtp.lastError && !smtp.running && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-2.5 text-xs text-danger">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          {smtp.lastError}
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-4">
        <Detail label="Address" value={smtp.address || '—'} mono />
        <Detail label="Uptime" value={uptime} />
        <Detail label="Active connections" value={smtp.running ? `${smtp.activeConnections} / ${server.maxConnections}` : `— / ${server.maxConnections}`} />
        <Detail label="Max message size" value={`${server.maxMessageMb} MB`} />
        <Detail
          label="Authentication"
          value={
            <span className="inline-flex items-center gap-1.5">
              <Lock className="size-3.5 text-muted" />
              {server.requireAuth ? 'Required' : 'Optional'}
            </span>
          }
        />
        <Detail
          label="Exposure"
          value={
            server.localOnly ? (
              <span className="inline-flex items-center gap-1.5 text-success">
                <ShieldCheck className="size-3.5" /> Localhost only
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-warning">
                <TriangleAlert className="size-3.5" /> Network-exposed
              </span>
            )
          }
        />
        <Detail label="Start on launch" value={server.autoStart ? 'Yes' : 'No'} />
        <Detail
          label="Settings"
          value={
            <Link to="/settings" className="text-cyan hover:underline">
              Configure
            </Link>
          }
        />
      </dl>
    </Card>
  )
}
