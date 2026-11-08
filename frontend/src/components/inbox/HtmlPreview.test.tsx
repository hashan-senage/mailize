import {render, screen} from '@testing-library/react'
import {describe, expect, it} from 'vitest'
import {HtmlPreview} from './HtmlPreview'

describe('HtmlPreview', () => {
  it('renders in an iframe with an empty sandbox and a CSP, never in the app DOM', () => {
    const {container} = render(
      <HtmlPreview html={'<h1>Hello</h1><script>window.pwned=1</script><img src="https://t/x.gif">'} />,
    )
    const frame = screen.getByTitle('Email HTML preview') as HTMLIFrameElement
    expect(frame.getAttribute('sandbox')).toBe('')
    expect(frame.getAttribute('srcdoc')).toContain('Content-Security-Policy')
    expect(frame.getAttribute('srcdoc')).not.toMatch(/<script/i)
    expect(container.querySelector('h1')).toBeNull()
    expect(screen.getByText(/remote images and styles are blocked/i)).toBeInTheDocument()
  })
})
