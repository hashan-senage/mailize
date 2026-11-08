import {useCallback, useEffect, useRef, useState} from 'react'
import {errorMessage, onEvent, type BackendEvent} from '@/services/api'

export interface Async<T> {
  data: T | null
  error: string | null
  loading: boolean
  reload: () => void
}

/**
 * Loads data via `fn` and re-runs it when the backend emits any of `events`
 * (push, not polling). `deps` re-triggers a load when inputs change.
 */
export function useBackend<T>(fn: () => Promise<T>, events: BackendEvent[] = [], deps: unknown[] = []): Async<T> {
  const [state, setState] = useState<{data: T | null; error: string | null; loading: boolean}>({
    data: null,
    error: null,
    loading: true,
  })
  const fnRef = useRef(fn)
  fnRef.current = fn
  const seq = useRef(0)

  const load = useCallback(() => {
    const id = ++seq.current
    fnRef.current()
      .then((data) => id === seq.current && setState({data, error: null, loading: false}))
      .catch((e) => id === seq.current && setState((s) => ({...s, error: errorMessage(e), loading: false})))
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, deps)

  const key = events.join(',')
  useEffect(() => {
    const offs = events.map((e) => onEvent(e, load))
    return () => offs.forEach((off) => off())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, load])

  return {...state, reload: load}
}
