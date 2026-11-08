export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function formatRelative(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 45) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  if (s < 86400 * 7) return `${Math.round(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString()
}

export const joinAddrs = (a: string[] | null | undefined) => (a && a.length ? a.join(', ') : '')

/** Local-midnight RFC3339 bounds for a YYYY-MM-DD date input: [start, nextDayStart). */
export function dayBounds(from: string, to: string): {dateFrom: string; dateTo: string} {
  const start = from ? new Date(`${from}T00:00:00`).toISOString() : ''
  let end = ''
  if (to) {
    const d = new Date(`${to}T00:00:00`)
    d.setDate(d.getDate() + 1)
    end = d.toISOString()
  }
  return {dateFrom: start, dateTo: end}
}

/** 3725 -> "1h 2m", 65 -> "1m 5s". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

/** "2026-03-04" -> "Wed" (parsed as a local date, avoiding the UTC off-by-one). */
export function weekdayShort(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {weekday: 'short'})
}
