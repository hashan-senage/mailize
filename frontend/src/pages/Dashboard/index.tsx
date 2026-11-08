import {FolderKanban, FolderPlus, Inbox, Mail, Paperclip, Server} from 'lucide-react'
import {useState} from 'react'
import {Link, useNavigate} from 'react-router-dom'
import {toast} from 'sonner'
import {ActivityChart} from '@/components/dashboard/ActivityChart'
import {ServerCard} from '@/components/dashboard/ServerCard'
import {ProjectFormDialog} from '@/components/projects/ProjectFormDialog'
import {Badge} from '@/components/ui/Badge'
import {Button} from '@/components/ui/Button'
import {Card, CardHeader} from '@/components/ui/Card'
import {EmptyState, ErrorState, Loading} from '@/components/ui/States'
import {useBackend} from '@/hooks/useBackend'
import {formatBytes, formatRelative} from '@/lib/format'
import {api, errorMessage} from '@/services/api'

function Stat({label, value, hint, accent}: {label: string; value: string | number; hint?: string; accent?: boolean}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${accent ? 'text-cyan' : ''}`}>{value}</p>
      {hint && <p className="mt-1 truncate text-[11px] text-muted">{hint}</p>}
    </Card>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const {data, error, loading, reload} = useBackend(api.dashboard, [
    'message:received',
    'message:deleted',
    'message:updated',
    'project:updated',
    'smtp:started',
    'smtp:stopped',
  ])
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)

  if (loading && !data) return <Loading />
  if (error || !data) return <ErrorState message={error ?? 'Unable to load the dashboard.'} onRetry={reload} />

  const {smtp, insights, server} = data
  const projects = insights.projects ?? []
  const senders = insights.topSenders ?? []
  const htmlShare = data.totalMessages > 0 ? Math.round((insights.withHtml / data.totalMessages) * 100) : 0

  const toggleSmtp = async () => {
    setBusy(true)
    try {
      if (smtp.running) await api.stopSmtp()
      else await api.startSmtp()
      toast.success(smtp.running ? 'SMTP server stopped' : 'SMTP server started')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
      reload()
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ServerCard smtp={smtp} server={server} busy={busy} onToggle={toggleSmtp} />

      <section aria-label="Statistics" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Emails captured" value={data.totalMessages} hint={insights.lastReceivedAt ? `Last ${formatRelative(insights.lastReceivedAt)}` : 'None yet'} />
        <Stat label="Captured today" value={data.messagesToday} />
        <Stat label="Unread" value={data.unreadMessages} accent={data.unreadMessages > 0} />
        <Stat label="Projects" value={data.projectCount} />
        <Stat label="Attachments" value={insights.attachmentCount} hint={formatBytes(insights.attachmentBytes)} />
        <Stat label="Avg. email size" value={formatBytes(insights.avgMessageBytes)} hint={`${htmlShare}% contain HTML`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Activity — last 7 days" />
            <div className="p-4">
              <ActivityChart days={insights.last7Days} />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Recent emails"
              action={
                <Link to="/inbox" className="text-xs text-cyan hover:underline">
                  View inbox
                </Link>
              }
            />
            {data.recent.length === 0 ? (
              <EmptyState icon={Mail} title="No emails captured yet">
                {smtp.running ? 'Send an email from your app and it will appear here.' : 'Start the SMTP server, then send an email from your app.'}
              </EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {data.recent.map((m) => (
                  <li key={m.id}>
                    <Link to={`/inbox?project=${m.projectId}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2">
                      <span className={`size-2 shrink-0 rounded-full ${m.isRead ? 'bg-transparent' : 'bg-cyan'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{m.subject || '(no subject)'}</p>
                        <p className="truncate text-xs text-muted">
                          {m.fromAddress} · {m.projectName}
                        </p>
                      </div>
                      {m.attachmentCount > 0 && <Paperclip className="size-3.5 text-muted" aria-label="Has attachments" />}
                      <span className="shrink-0 text-[11px] text-muted">{formatRelative(m.receivedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Quick actions" />
            <div className="grid gap-2 p-4">
              <Button onClick={() => setCreating(true)} className="justify-start">
                <FolderPlus className="size-4" /> Create project
              </Button>
              <Button onClick={() => navigate('/inbox')} className="justify-start">
                <Inbox className="size-4" /> Open inbox
              </Button>
              <Button onClick={() => navigate('/smtp')} className="justify-start">
                <Server className="size-4" /> View SMTP configuration
              </Button>
              <Button onClick={() => navigate('/projects')} variant="ghost" className="justify-start">
                <FolderKanban className="size-4" /> Manage projects
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Projects" />
            {projects.length === 0 ? (
              <p className="p-4 text-[13px] text-muted">No projects yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {projects.map((p) => (
                  <li key={p.projectId}>
                    <Link to={`/inbox?project=${p.projectId}`} className="flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-surface-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{p.name}</p>
                        <p className="text-[11px] text-muted">{p.lastReceivedAt ? `Last ${formatRelative(p.lastReceivedAt)}` : 'No emails yet'}</p>
                      </div>
                      {p.status === 'disabled' && <Badge>Disabled</Badge>}
                      {p.unread > 0 && <Badge tone="brand">{p.unread} new</Badge>}
                      <span className="w-8 text-right text-[13px] tabular-nums">{p.total}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Top senders" />
            {senders.length === 0 ? (
              <p className="p-4 text-[13px] text-muted">Nothing captured yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {senders.map((s) => (
                  <li key={s.address} className="flex items-center justify-between gap-3 px-4 py-2 text-[13px]">
                    <span className="selectable truncate">{s.address}</span>
                    <span className="tabular-nums text-muted">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <ProjectFormDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={() => {
          reload()
          navigate('/projects')
        }}
      />
    </div>
  )
}
