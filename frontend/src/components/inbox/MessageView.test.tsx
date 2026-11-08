import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {TooltipProvider} from '@/components/ui/Tooltip'
import {msg} from '@/test/fixtures'

vi.mock('@/services/api', () => ({
  api: {message: vi.fn(), saveAttachment: vi.fn()},
  errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
  onEvent: () => () => {},
}))
import {api} from '@/services/api'
import {MessageView} from './MessageView'

const full = msg({
  htmlBody: '<p>Hi</p>',
  textBody: 'Hi plain',
  headers: [{name: 'X-Mailer', value: 'test'}],
  rawSource: 'Subject: Welcome aboard\r\n\r\nHi plain',
  ccAddresses: ['carol@example.test'],
  attachments: [{id: 'a1', messageId: 'm1', filename: 'invoice.pdf', contentType: 'application/pdf', size: 2048, createdAt: ''}],
})

describe('MessageView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('prompts when nothing is selected', () => {
    render(<MessageView id={null} onDelete={() => {}} />)
    expect(screen.getByText('Select an email')).toBeInTheDocument()
  })

  it('shows details and every inspector tab', async () => {
    vi.mocked(api.message).mockResolvedValue(full as never)
    render(
      <TooltipProvider>
        <MessageView id="m1" onDelete={() => {}} />
      </TooltipProvider>,
    )
    expect(await screen.findByText('Welcome aboard', {selector: 'h2'})).toBeInTheDocument()
    expect(screen.getByText('carol@example.test')).toBeInTheDocument()
    expect(screen.getByTitle('Email HTML preview')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', {name: 'Text'}))
    expect(screen.getByText('Hi plain', {selector: 'pre'})).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', {name: /Headers/}))
    expect(screen.getByText('X-Mailer')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', {name: 'Raw source'}))
    expect(screen.getByText(/Subject: Welcome aboard/, {selector: 'pre'})).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', {name: /Attachments/}))
    expect(screen.getByText('invoice.pdf')).toBeInTheDocument()
    expect(screen.getByText(/application\/pdf · 2.0 KB/)).toBeInTheDocument()
  })

  it('shows an error state when the message cannot be loaded', async () => {
    vi.mocked(api.message).mockRejectedValue('not found')
    render(<MessageView id="gone" onDelete={() => {}} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('not found')
  })
})
