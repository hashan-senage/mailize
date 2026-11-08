import {useState} from 'react'
import {Button} from './Button'
import {Dialog} from './Dialog'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => Promise<void> | void
}

/** Confirmation required before every destructive action. */
export function ConfirmDialog({open, onOpenChange, title, description, confirmLabel, onConfirm}: Props) {
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={run}
            disabled={busy}
            className="border-danger/60 bg-danger/15 text-danger hover:bg-danger/25"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <span className="sr-only">{description}</span>
    </Dialog>
  )
}
