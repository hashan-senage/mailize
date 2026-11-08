import {api} from '@/services/api'
import {useBackend} from './useBackend'

/** Live SMTP status, refreshed by backend start/stop events (no polling). */
export function useSmtpStatus() {
  return useBackend(api.smtpStatus, ['smtp:started', 'smtp:stopped'])
}
