import {weekdayShort} from '@/lib/format'
import type {DayCount} from '@/types'

/** 7-day volume bars. Values are labelled on every bar so colour is never the only channel. */
export function ActivityChart({days}: {days: DayCount[]}) {
  const max = Math.max(1, ...days.map((d) => d.count))
  const total = days.reduce((n, d) => n + d.count, 0)
  const today = days.length - 1

  return (
    <div>
      <div
        role="img"
        aria-label={`Emails per day, last 7 days: ${days.map((d) => `${weekdayShort(d.date)} ${d.count}`).join(', ')}`}
        className="flex h-36 items-end gap-2"
      >
        {days.map((d, i) => (
          <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${d.date}: ${d.count}`}>
            <span className="text-[11px] tabular-nums text-muted">{d.count}</span>
            <div
              className={`w-full rounded-t ${i === today ? 'brand-gradient' : 'bg-brand/45'}`}
              style={{height: `${Math.max(d.count > 0 ? 6 : 2, (d.count / max) * 100)}%`, minHeight: 2, opacity: d.count === 0 ? 0.35 : 1}}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2 border-t border-border pt-1.5">
        {days.map((d, i) => (
          <span key={d.date} className={`flex-1 text-center text-[11px] ${i === today ? 'font-medium text-fg' : 'text-muted'}`}>
            {i === today ? 'Today' : weekdayShort(d.date)}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{total} email{total === 1 ? '' : 's'} in the last 7 days</p>
    </div>
  )
}
