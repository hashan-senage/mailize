import {Inbox, Info, LayoutDashboard, Server, Settings, FolderKanban, type LucideIcon} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  {to: '/', label: 'Overview', icon: LayoutDashboard},
  {to: '/inbox', label: 'Inbox', icon: Inbox},
  {to: '/projects', label: 'Projects', icon: FolderKanban},
  {to: '/smtp', label: 'SMTP Server', icon: Server},
  {to: '/settings', label: 'Settings', icon: Settings},
  {to: '/about', label: 'About Mailize', icon: Info},
]
