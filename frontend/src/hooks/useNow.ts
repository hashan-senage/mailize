import {useEffect, useState} from 'react'

/** Current time, ticking every `ms` while `active` (used for live uptime). */
export function useNow(active: boolean, ms = 1000): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [active, ms])
  return now
}
