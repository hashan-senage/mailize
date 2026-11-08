import {Outlet} from 'react-router-dom'
import {Toaster} from 'sonner'
import {Header} from '@/components/layout/Header'
import {Sidebar} from '@/components/layout/Sidebar'
import {TooltipProvider} from '@/components/ui/Tooltip'
import {useIncomingMailNotifications} from '@/hooks/useIncomingMailNotifications'
import {useThemeStore} from '@/stores/theme'

export function AppShell() {
  const preference = useThemeStore((s) => s.preference)
  useIncomingMailNotifications()
  return (
    <TooltipProvider>
      <div className="flex h-full">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="min-h-0 flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster theme={preference === 'system' ? 'system' : preference} position="bottom-right" />
    </TooltipProvider>
  )
}
