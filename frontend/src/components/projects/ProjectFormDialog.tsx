import {useEffect, useState, type FormEvent} from 'react'
import {toast} from 'sonner'
import {Button} from '@/components/ui/Button'
import {Dialog} from '@/components/ui/Dialog'
import {Field, Input, Textarea} from '@/components/ui/Field'
import {api, errorMessage} from '@/services/api'
import type {CreatedProject, Project} from '@/types'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  /** When set, the dialog edits this project; otherwise it creates one. */
  project?: Project
  onCreated?: (c: CreatedProject) => void
  onSaved?: () => void
}

export function ProjectFormDialog({open, onOpenChange, project, onCreated, onSaved}: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setName(project?.name ?? '')
      setDescription(project?.description ?? '')
      setError(null)
    }
  }, [open, project])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (project) {
        await api.updateProject(project.id, name, description, project.status)
        toast.success('Project updated')
        onSaved?.()
      } else {
        const created = await api.createProject(name, description)
        toast.success('Project created')
        onCreated?.(created)
      }
      onOpenChange(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={project ? 'Edit project' : 'Create project'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Project name">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={80} required />
        </Field>
        <Field label="Description (optional)">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
        </Field>
        {error && (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={busy || !name.trim()}>
            {project ? 'Save changes' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
