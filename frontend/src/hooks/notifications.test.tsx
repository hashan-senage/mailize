import {act, render, screen, waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {Sidebar} from '@/components/layout/Sidebar'
import {TooltipProvider} from '@/components/ui/Tooltip'

type Handler = (data: unknown) => void
const handlers = new Map<string, Set<Handler>>()
const emit = (event: string, data?: unknown) => handlers.get(event)?.forEach((h) => h(data))

vi.mock('@/services/api', () => ({
  api: {unreadCount: vi.fn()},
  errorMessage: String,
  onEvent: (event: string, cb: Handler) => {
    if (!handlers.has(event)) handlers.set(event, new Set())
    handlers.get(event)!.add(cb)
    return () => handlers.get(event)!.delete(cb)
  },
}))
vi.mock('sonner', () => ({toast: vi.fn(), Toaster: () => null}))

import {toast} from 'sonner'
import {api} from '@/services/api'
import {useIncomingMailNotifications} from './useIncomingMailNotifications'

function Probe() {
  useIncomingMailNotifications()
  return null
}

describe('incoming mail notifications', () => {
  beforeEach(() => {
    handlers.clear()
    vi.clearAllMocks()
  })

  it('shows a toast with sender, subject and project when mail arrives', () => {
    render(
      <MemoryRouter>
        <Probe />
      </MemoryRouter>,
    )
    act(() =>
      emit('message:received', {id: 'm9', projectId: 'p1', projectName: 'Shop', from: 'alice@x.test', subject: 'Order shipped', attachments: 2}),
    )
    expect(toast).toHaveBeenCalledTimes(1)
    const [title, opts] = vi.mocked(toast).mock.calls[0] as unknown as [string, {description: string; action: {label: string}}]
    expect(title).toBe('New email · Shop')
    expect(opts.description).toContain('alice@x.test')
    expect(opts.description).toContain('Order shipped')
    expect(opts.description).toContain('2 attachment(s)')
    expect(opts.action.label).toBe('Open')
  })

  it('stops listening after unmount', () => {
    const {unmount} = render(
      <MemoryRouter>
        <Probe />
      </MemoryRouter>,
    )
    unmount()
    act(() => emit('message:received', {id: 'x', projectId: 'p', projectName: '', from: '', subject: '', attachments: 0}))
    expect(toast).not.toHaveBeenCalled()
  })
})

describe('Inbox badge', () => {
  beforeEach(() => {
    handlers.clear()
    vi.clearAllMocks()
  })
  const renderSidebar = () =>
    render(
      <MemoryRouter>
        <TooltipProvider>
          <Sidebar />
        </TooltipProvider>
      </MemoryRouter>,
    )

  it('shows the unread count and updates live when mail arrives', async () => {
    vi.mocked(api.unreadCount).mockResolvedValue(2)
    renderSidebar()
    expect(await screen.findByLabelText('2 unread emails')).toHaveTextContent('2')

    vi.mocked(api.unreadCount).mockResolvedValue(3)
    act(() => emit('message:received', {}))
    await waitFor(() => expect(screen.getByLabelText('3 unread emails')).toBeInTheDocument())
  })

  it('hides the badge when nothing is unread and caps large counts', async () => {
    vi.mocked(api.unreadCount).mockResolvedValue(0)
    const {unmount} = renderSidebar()
    await waitFor(() => expect(api.unreadCount).toHaveBeenCalled())
    expect(screen.queryByLabelText(/unread emails/)).toBeNull()
    unmount()

    vi.mocked(api.unreadCount).mockResolvedValue(250)
    renderSidebar()
    expect(await screen.findByLabelText('250 unread emails')).toHaveTextContent('99+')
  })
})
