import {describe, expect, it} from 'vitest'
import {dayBounds, formatBytes, formatRelative, joinAddrs} from './format'

describe('format', () => {
  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })

  it('formats relative time', () => {
    const now = Date.parse('2026-01-01T12:00:00Z')
    expect(formatRelative('2026-01-01T11:59:50Z', now)).toBe('just now')
    expect(formatRelative('2026-01-01T11:30:00Z', now)).toBe('30m ago')
    expect(formatRelative('2026-01-01T09:00:00Z', now)).toBe('3h ago')
    expect(formatRelative('garbage', now)).toBe('')
  })

  it('joins addresses safely', () => {
    expect(joinAddrs(null)).toBe('')
    expect(joinAddrs(['a@x', 'b@x'])).toBe('a@x, b@x')
  })

  it('builds an exclusive end-of-day bound', () => {
    expect(dayBounds('', '')).toEqual({dateFrom: '', dateTo: ''})
    const {dateFrom, dateTo} = dayBounds('2026-03-01', '2026-03-01')
    expect(new Date(dateTo).getTime() - new Date(dateFrom).getTime()).toBeGreaterThanOrEqual(23 * 3600 * 1000)
  })
})

import {formatDuration, weekdayShort} from './format'

describe('duration + weekday', () => {
  it('formats durations', () => {
    expect(formatDuration(5)).toBe('5s')
    expect(formatDuration(65)).toBe('1m 5s')
    expect(formatDuration(3725)).toBe('1h 2m')
    expect(formatDuration(90000)).toBe('1d 1h')
    expect(formatDuration(-3)).toBe('0s')
  })
  it('returns a weekday for a local date without timezone drift', () => {
    expect(weekdayShort('2026-03-04')).toBe(new Date(2026, 2, 4).toLocaleDateString(undefined, {weekday: 'short'}))
  })
})
