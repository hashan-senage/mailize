import {create} from 'zustand'

export type ThemePreference = 'dark' | 'light' | 'system'

const KEY = 'mailize.theme'

function readStored(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'dark' || v === 'light' || v === 'system') return v
  } catch {
    /* storage unavailable */
  }
  return 'dark'
}

export function applyTheme(pref: ThemePreference) {
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

interface ThemeState {
  preference: ThemePreference
  setPreference: (p: ThemePreference) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: readStored(),
  setPreference: (preference) => {
    try {
      localStorage.setItem(KEY, preference)
    } catch {
      /* ignore */
    }
    applyTheme(preference)
    set({preference})
  },
}))
