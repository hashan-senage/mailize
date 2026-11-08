import '@testing-library/jest-dom/vitest'
import {afterEach, vi} from 'vitest'
import {cleanup} from '@testing-library/react'

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.className = ''
})

// jsdom lacks matchMedia / ResizeObserver, used by the theme store and Radix.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (q: string) => ({
    matches: false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }),
})

// Radix Select relies on pointer-capture and scrollIntoView, which jsdom does not implement.
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as unknown as {ResizeObserver: typeof ResizeObserverStub}).ResizeObserver = ResizeObserverStub
