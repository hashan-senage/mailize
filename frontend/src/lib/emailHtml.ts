import DOMPurify from 'dompurify'

/**
 * Email HTML is untrusted. Defence in depth:
 *  1. DOMPurify strips scripts, event handlers, forms, embeds, meta-refresh, etc.
 *  2. The result is rendered only inside an iframe with an empty `sandbox` attribute (no scripts,
 *     no same-origin, no popups, no top navigation).
 *  3. A restrictive CSP inside the document blocks every network request (remote images, CSS, fonts).
 */
export const PREVIEW_CSP =
  "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; form-action 'none'; base-uri 'none'"

export function buildPreviewDocument(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: false,
    FORCE_BODY: true,
    ADD_TAGS: ['style'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'meta', 'link', 'base'],
    FORBID_ATTR: ['srcset', 'ping'],
    ALLOW_DATA_ATTR: false,
  })
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}">
<style>body{margin:16px;font-family:system-ui,sans-serif;color:#111;background:#fff;word-wrap:break-word}img{max-width:100%;height:auto}</style>
</head><body>${clean}</body></html>`
}

/** True if the HTML references remote resources the preview will block. */
export function hasRemoteContent(html: string): boolean {
  return /\b(?:src|href|background)\s*=\s*["']?https?:\/\//i.test(html) || /url\(\s*["']?https?:\/\//i.test(html)
}
