import {api} from '@/services/api'
import {useBackend} from './useBackend'

export function useAppInfo() {
  const {data, error, loading} = useBackend(api.appInfo)
  return {info: data, error, loading}
}
