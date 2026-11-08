import {useState} from 'react'
import {NavLink} from 'react-router-dom'
import {PanelLeftClose, PanelLeftOpen} from 'lucide-react'
import logo from '@/assets/images/mailize-logo.png'
import {Tooltip} from '@/components/ui/Tooltip'
import {useUnreadCount} from '@/hooks/useUnreadCount'
import {cn} from '@/lib/utils'
import {NAV_ITEMS} from './nav'

const KEY = 'mailize.sidebar.collapsed'

function initialCollapsed() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const unread = useUnreadCount()

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(KEY, c ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !c
    })
  }

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-border bg-surface-2 transition-[width] duration-150',
        collapsed ? 'w-[60px]' : 'w-56',
      )}
    >
      <div className={cn('flex h-14 items-center gap-2.5 px-3.5', collapsed && 'justify-center px-0')}>
        <img src={logo} alt="Mailize" className="size-8 shrink-0" draggable={false} />
        {!collapsed && <span className="text-[15px] font-semibold tracking-tight">Mailize</span>}
      </div>

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-0.5 px-2 py-2">
        {NAV_ITEMS.map(({to, label, icon: Icon}) => (
          <Tooltip key={to} label={label} disabled={!collapsed}>
            <NavLink
              to={to}
              end={to === '/'}
              aria-label={label}
              className={({isActive}) =>
                cn(
                  'group relative flex h-9 items-center gap-3 rounded-md px-2.5 text-[13px] font-medium transition-colors',
                  collapsed && 'justify-center px-0',
                  isActive ? 'bg-brand/15 text-fg' : 'text-muted hover:bg-surface hover:text-fg',
                )
              }
            >
              {({isActive}) => (
                <>
                  {isActive && <span className="brand-gradient absolute left-0 h-5 w-[3px] rounded-r" />}
                  <span className="relative shrink-0">
                    <Icon className={cn('size-[18px]', isActive && 'text-cyan')} />
                    {to === '/inbox' && unread > 0 && collapsed && (
                      <span className="brand-gradient absolute -right-1.5 -top-1.5 size-2.5 rounded-full ring-2 ring-surface-2" aria-hidden />
                    )}
                  </span>
                  {!collapsed && <span className="truncate">{label}</span>}
                  {to === '/inbox' && unread > 0 && !collapsed && (
                    <span
                      aria-label={`${unread} unread emails`}
                      className="brand-gradient ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white"
                    >
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          </Tooltip>
        ))}
      </nav>

      <div className="border-t border-border p-2">
        <Tooltip label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} disabled={!collapsed}>
          <button
            onClick={toggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex h-8 w-full items-center gap-3 rounded-md px-2.5 text-xs text-muted transition-colors hover:bg-surface hover:text-fg',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && 'Collapse'}
          </button>
        </Tooltip>
      </div>
    </aside>
  )
}
