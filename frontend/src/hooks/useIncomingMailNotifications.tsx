import {useEffect} from 'react'
import {useNavigate} from 'react-router-dom'
import {toast} from 'sonner'
import {onEvent} from '@/services/api'
import type {ReceivedEvent} from '@/types'

/**
 * Shows an in-app notification for every captured email, on whatever page the user is on.
 * Driven by the backend's "message:received" event (no polling). Mount once, inside the router.
 */
export function useIncomingMailNotifications() {
  const navigate = useNavigate()

  useEffect(() => {
    return onEvent('message:received', (data) => {
      const e = data as ReceivedEvent
      const sender = e.from || 'unknown sender'
      toast(`New email${e.projectName ? ` · ${e.projectName}` : ''}`, {
        id: `mail-${e.id}`,
        description: `${sender} — ${e.subject || '(no subject)'}${e.attachments > 0 ? ` · ${e.attachments} attachment(s)` : ''}`,
        duration: 6000,
        action: {
          label: 'Open',
          onClick: () => navigate(`/inbox?project=${e.projectId}`),
        },
      })
    })
  }, [navigate])
}
