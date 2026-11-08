import {api} from '@/services/api'
import {useBackend} from './useBackend'

/** Unread email count for the sidebar badge, refreshed by backend events. */
export function useUnreadCount(): number {
  const {data} = useBackend(api.unreadCount, ['message:received', 'message:deleted', 'message:updated', 'project:updated'])
  return data ?? 0
}
