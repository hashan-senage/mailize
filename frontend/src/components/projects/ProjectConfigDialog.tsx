import {Dialog} from '@/components/ui/Dialog'
import {ConfigPanel} from './ConfigPanel'

export function ProjectConfigDialog({
  projectId,
  name,
  onOpenChange,
  refreshKey,
}: {
  projectId: string | null
  name: string
  onOpenChange: (o: boolean) => void
  refreshKey?: number
}) {
  return (
    <Dialog
      open={projectId !== null}
      onOpenChange={onOpenChange}
      title={`SMTP configuration — ${name}`}
      description="Copy this into your application. Credentials are specific to this project."
      wide
    >
      {projectId && <ConfigPanel projectId={projectId} refreshKey={refreshKey} />}
    </Dialog>
  )
}
