import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it} from 'vitest'
import {ThemeToggle} from '@/components/layout/ThemeToggle'
import {TooltipProvider} from '@/components/ui/Tooltip'
import {useThemeStore} from './theme'

describe('theme switching', () => {
  it('switches theme, applies the class and persists the choice', async () => {
    document.documentElement.classList.add('dark')
    render(
      <TooltipProvider>
        <ThemeToggle />
      </TooltipProvider>,
    )
    await userEvent.click(screen.getByRole('radio', {name: 'Light theme'}))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('mailize.theme')).toBe('light')
    expect(useThemeStore.getState().preference).toBe('light')

    await userEvent.click(screen.getByRole('radio', {name: 'Dark theme'}))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
