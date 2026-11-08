import {describe, expect, it} from 'vitest'
import {buildPreviewDocument, hasRemoteContent, PREVIEW_CSP} from './emailHtml'

describe('email HTML sanitising', () => {
  it('removes scripts, handlers, iframes, forms and meta refresh', () => {
    const doc = buildPreviewDocument(
      '<p onclick="steal()">hi</p><script>alert(1)</script><iframe src="https://evil"></iframe>' +
        '<form action="https://evil"><input></form><meta http-equiv="refresh" content="0;url=https://evil">' +
        '<a href="javascript:alert(1)">x</a><img src="x" onerror="alert(1)">',
    )
    expect(doc).not.toMatch(/<script/i)
    expect(doc).not.toMatch(/onclick|onerror/i)
    expect(doc).not.toMatch(/<iframe|<form/i)
    expect(doc).not.toMatch(/http-equiv="refresh"/i)
    expect(doc).not.toMatch(/javascript:/i)
    expect(doc).toContain('hi')
  })

  it('embeds a CSP that blocks every network load', () => {
    const doc = buildPreviewDocument('<img src="https://tracker.example/p.gif">')
    expect(doc).toContain(PREVIEW_CSP)
    expect(PREVIEW_CSP).toContain("default-src 'none'")
    expect(PREVIEW_CSP).not.toMatch(/https?:|\*/)
  })

  it('keeps styling content', () => {
    expect(buildPreviewDocument('<style>p{color:red}</style><p>x</p>')).toContain('color:red')
  })

  it('detects remote content', () => {
    expect(hasRemoteContent('<img src="https://a/b.png">')).toBe(true)
    expect(hasRemoteContent('<div style="background:url(http://a/b)">')).toBe(true)
    expect(hasRemoteContent('<p>local only</p>')).toBe(false)
  })
})
