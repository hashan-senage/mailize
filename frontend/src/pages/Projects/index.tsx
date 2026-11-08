import {FolderKanban, KeyRound, Pencil, Plus, Settings2, Trash2} from 'lucide-react'
import {useState} from 'react'
import {Link} from 'react-router-dom'
import {toast} from 'sonner'
import {ProjectConfigDialog} from '@/components/projects/ProjectConfigDialog'
import {ProjectFormDialog} from '@/components/projects/ProjectFormDialog'
import {Badge} from '@/components/ui/Badge'
import {Button} from '@/components/ui/Button'
import {Card} from '@/components/ui/Card'
import {ConfirmDialog} from '@/components/ui/ConfirmDialog'
import {Switch} from '@/components/ui/Field'
import {EmptyState, ErrorState, Loading} from '@/components/ui/States'
import {Tooltip} from '@/components/ui/Tooltip'
import {useBackend} from '@/hooks/useBackend'
import {formatRelative} from '@/lib/format'
import {api, errorMessage} from '@/services/api'
import type {Project} from '@/types'

export default function ProjectsPage() {
  const {data, error, loading, reload} = useBackend(api.projects, ['project:updated', 'message:received', 'message:deleted'])
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Project | undefined>()
  const [configFor, setConfigFor] = useState<Project | null>(null)
  const [configKey, setConfigKey] = useState(0)
  const [deleting, setDeleting] = useState<Project | null>(null)
  const [regenerating, setRegenerating] = useState<Project | null>(null)

  const toggle = async (p: Project) => {
    try {
      await api.updateProject(p.id, p.name, p.description, p.status === 'active' ? 'disabled' : 'active')
      toast.success(p.status === 'active' ? `${p.name} disabled` : `${p.name} enabled`)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const projects = (data ?? []).filter((p) => !p.isSystem)
  const system = (data ?? []).find((p) => p.isSystem)

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted">Each project has its own SMTP credentials and inbox.</p>
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus className="size-4" /> Create project
        </Button>
      </div>

      {loading && !data && <Loading />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && projects.length === 0 && (
        <Card>
          <EmptyState icon={FolderKanban} title="No projects yet">
            Create a project to get SMTP credentials for your application.
          </EmptyState>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((p) => (
          <Card key={p.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold">{p.name}</h3>
                {p.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{p.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={p.status === 'active' ? 'success' : 'neutral'}>{p.status === 'active' ? 'Active' : 'Disabled'}</Badge>
                <Switch checked={p.status === 'active'} onChange={() => toggle(p)} label={`Enable ${p.name}`} />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted">
              <span className="selectable font-mono">{p.smtpUsername}</span>
              <span>Created {formatRelative(p.createdAt)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Link to={`/inbox?project=${p.id}`} className="text-[13px] text-cyan hover:underline">
                {p.messageCount} {p.messageCount === 1 ? 'email' : 'emails'}
              </Link>
              <div className="ml-auto flex gap-1">
                <Tooltip label="SMTP configuration" side="top">
                  <Button variant="ghost" aria-label="SMTP configuration" onClick={() => setConfigFor(p)}>
                    <Settings2 className="size-4" />
                  </Button>
                </Tooltip>
                <Tooltip label="Regenerate credentials" side="top">
                  <Button variant="ghost" aria-label="Regenerate credentials" onClick={() => setRegenerating(p)}>
                    <KeyRound className="size-4" />
                  </Button>
                </Tooltip>
                <Tooltip label="Edit project" side="top">
                  <Button variant="ghost" aria-label="Edit project" onClick={() => setEditing(p)}>
                    <Pencil className="size-4" />
                  </Button>
                </Tooltip>
                <Tooltip label="Delete project" side="top">
                  <Button variant="ghost" aria-label="Delete project" onClick={() => setDeleting(p)}>
                    <Trash2 className="size-4" />
                  </Button>
                </Tooltip>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {system && system.messageCount > 0 && (
        <p className="text-xs text-muted">
          {system.messageCount} message(s) received without authentication are in the “Unassigned” inbox (
          <Link to={`/inbox?project=${system.id}`} className="text-cyan hover:underline">
            view
          </Link>
          ).
        </p>
      )}

      <ProjectFormDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(c) => {
          reload()
          setConfigFor(c.project)
        }}
      />
      <ProjectFormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(undefined)} project={editing} onSaved={reload} />
      <ProjectConfigDialog
        projectId={configFor?.id ?? null}
        name={configFor?.name ?? ''}
        refreshKey={configKey}
        onOpenChange={(o) => !o && setConfigFor(null)}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.name}”?`}
        description="This permanently deletes the project and all of its captured emails and attachments."
        confirmLabel="Delete project"
        onConfirm={async () => {
          try {
            await api.deleteProject(deleting!.id)
            toast.success('Project deleted')
          } catch (e) {
            toast.error(errorMessage(e))
          }
        }}
      />
      <ConfirmDialog
        open={!!regenerating}
        onOpenChange={(o) => !o && setRegenerating(null)}
        title={`Regenerate credentials for “${regenerating?.name}”?`}
        description="The current username and password stop working immediately. Update your application's configuration afterwards."
        confirmLabel="Regenerate"
        onConfirm={async () => {
          try {
            await api.regenerate(regenerating!.id)
            toast.success('Credentials regenerated')
            setConfigKey((k) => k + 1)
            setConfigFor(regenerating)
          } catch (e) {
            toast.error(errorMessage(e))
          }
        }}
      />
    </div>
  )
}
