import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useState} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {msg} from '@/test/fixtures'
import {EMPTY_FILTERS, FilterBar, type Filters} from './FilterBar'
import {MessageList} from './MessageList'

describe('MessageList', () => {
  it('shows recipient, subject, project, attachment and unread state', () => {
    render(
      <MessageList
        items={[msg({attachmentCount: 2}), msg({id: 'm2', subject: 'Read one', isRead: true})]}
        selectedId={null}
        checked={new Set()}
        showProject
        onSelect={() => {}}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByText('Welcome aboard')).toBeInTheDocument()
    expect(screen.getAllByText(/bob@example.test/)).toHaveLength(2)
    expect(screen.getAllByText('Shop')).toHaveLength(2)
    expect(screen.getAllByLabelText('Unread')).toHaveLength(1)
    expect(screen.getAllByLabelText('Has attachments')).toHaveLength(1)
  })

  it('reports selection and checkbox toggles', async () => {
    const onSelect = vi.fn()
    const onToggle = vi.fn()
    render(
      <MessageList items={[msg()]} selectedId={null} checked={new Set()} showProject={false} onSelect={onSelect} onToggle={onToggle} />,
    )
    await userEvent.click(screen.getByText('Welcome aboard'))
    expect(onSelect).toHaveBeenCalledWith('m1')
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onToggle).toHaveBeenCalledWith('m1')
  })
})

function Harness({spy}: {spy: (f: Filters) => void}) {
  const [f, setF] = useState<Filters>(EMPTY_FILTERS)
  return (
    <FilterBar
      filters={f}
      projects={[{id: 'p1', name: 'Shop'} as never]}
      onChange={(n) => {
        spy(n)
        setF(n)
      }}
      onRefresh={() => {}}
    />
  )
}

describe('FilterBar', () => {
  it('updates search, project and sort, and can clear filters', async () => {
    const spy = vi.fn()
    render(<Harness spy={spy} />)
    await userEvent.type(screen.getByLabelText('Search emails'), 'inv')
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({search: 'inv'}))
    // custom dropdown: open the trigger, then pick an option
    await userEvent.click(screen.getByRole('combobox', {name: 'Filter by project'}))
    await userEvent.click(await screen.findByRole('option', {name: 'Shop'}))
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({projectId: 'p1'}))
    await userEvent.click(screen.getByRole('combobox', {name: 'Sort order'}))
    await userEvent.click(await screen.findByRole('option', {name: 'Oldest first'}))
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({oldestFirst: true}))
    await userEvent.click(screen.getByText('Clear filters'))
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({search: ''}))
  })
})
