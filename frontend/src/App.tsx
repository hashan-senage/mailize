import {HashRouter, Navigate, Route, Routes} from 'react-router-dom'
import {AppShell} from '@/layouts/AppShell'
import AboutPage from '@/pages/About'
import DashboardPage from '@/pages/Dashboard'
import InboxPage from '@/pages/Inbox'
import ProjectsPage from '@/pages/Projects'
import SettingsPage from '@/pages/Settings'
import SMTPPage from '@/pages/SMTP'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="smtp" element={<SMTPPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
