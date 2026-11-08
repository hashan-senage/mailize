import {Link, useLocation} from 'react-router-dom'
import {Badge} from '@/components/ui/Badge'
import {useSmtpStatus} from '@/hooks/useSmtpStatus'
import {NAV_ITEMS} from './nav'
import {ThemeToggle} from './ThemeToggle'

export function Header() {
  const {pathname} = useLocation()
  const current = NAV_ITEMS.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)))
  const {data: smtp} = useSmtpStatus()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
      <h1 className="text-[15px] font-semibold">{current?.label ?? 'Mailize'}</h1>
      <div className="flex items-center gap-3">
        {smtp && (
          <Link to="/smtp" aria-label="SMTP server status">
            <Badge tone={smtp.running ? 'success' : 'neutral'}>
              <span className={`size-1.5 rounded-full ${smtp.running ? 'bg-success' : 'bg-muted'}`} />
              {smtp.running ? `SMTP listening on ${smtp.address}` : 'SMTP stopped'}
            </Badge>
          </Link>
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
