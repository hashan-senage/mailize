import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {ProjectFormDialog} from '@/components/projects/ProjectFormDialog'

vi.mock('@/services/api', () => ({
  api: {createProject: vi.fn(), updateProject: vi.fn()},
  errorMessage: (e: unknown) => (typeof e === 'string' ? e : 'Something went wrong.'),
  onEvent: () => () => {},
}))
import {api} from '@/services/api'

const project = {
  id: 'p1', name: 'Shop', description: '', smtpUsername: 'mz_a', status: 'active',
  isSystem: false, messageCount: 0, createdAt: '', updatedAt: '',
}

describe('ProjectFormDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a project and hands the credentials back', async () => {
    const created = {project, credentials: {projectId: 'p1', username: 'mz_a', password: 'pw'}}
    vi.mocked(api.createProject).mockResolvedValue(created as never)
    const onCreated = vi.fn()
    render(<ProjectFormDialog open onOpenChange={() => {}} onCreated={onCreated} />)

    const submit = screen.getByRole('button', {name: 'Create Project'})
    expect(submit).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Project name'), 'Shop')
    await userEvent.type(screen.getByLabelText(/Description/), 'Store')
    await userEvent.click(submit)
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created))
    expect(api.createProject).toHaveBeenCalledWith('Shop', 'Store')
  })

  it('shows backend validation errors and stays open', async () => {
    vi.mocked(api.createProject).mockRejectedValue('Project name must be 80 characters or fewer.')
    const onOpenChange = vi.fn()
    render(<ProjectFormDialog open onOpenChange={onOpenChange} />)
    await userEvent.type(screen.getByLabelText('Project name'), 'x')
    await userEvent.click(screen.getByRole('button', {name: 'Create Project'}))
    expect(await screen.findByRole('alert')).toHaveTextContent('80 characters')
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
