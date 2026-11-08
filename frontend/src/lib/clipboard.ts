import {toast} from 'sonner'

export async function copyText(text: string, what = 'Copied') {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${what} to clipboard`)
  } catch {
    toast.error('Could not access the clipboard')
  }
}
