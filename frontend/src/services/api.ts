import * as B from '../../wailsjs/go/main/App'
import {EventsOn} from '../../wailsjs/runtime/runtime'
import type {
  AppInfo,
  CreatedProject,
  DashboardStats,
  Framework,
  Message,
  MessageFilter,
  MessagePage,
  Project,
  ProjectCredentials,
  ProjectStatus,
  Settings,
  SMTPConfiguration,
  SMTPStatus,
  StorageInfo,
  Attachment,
} from '@/types'

// Wails generated signatures use generated classes; the JSON shapes are identical, so we cast once here.
const c = <T>(p: Promise<unknown>) => p as Promise<T>

/** The only module that talks to Go. Components and hooks import this, never wailsjs directly. */
export const api = {
  appInfo: () => c<AppInfo>(B.GetAppInfo()),
  storageInfo: () => c<StorageInfo>(B.GetStorageInfo()),
  dashboard: () => c<DashboardStats>(B.GetDashboardStats()),
  unreadCount: () => c<number>(B.GetUnreadCount()),

  projects: () => c<Project[]>(B.GetProjects()),
  createProject: (name: string, description: string) => c<CreatedProject>(B.CreateProject({name, description} as never)),
  updateProject: (id: string, name: string, description: string, status: ProjectStatus) =>
    c<Project>(B.UpdateProject({id, name, description, status} as never)),
  deleteProject: (id: string) => c<void>(B.DeleteProject(id)),
  credentials: (id: string) => c<ProjectCredentials>(B.GetProjectCredentials(id)),
  regenerate: (id: string) => c<ProjectCredentials>(B.RegenerateProjectCredentials(id)),

  smtpStatus: () => c<SMTPStatus>(B.GetSMTPStatus()),
  startSmtp: () => c<void>(B.StartSMTPServer()),
  stopSmtp: () => c<void>(B.StopSMTPServer()),
  smtpConfig: (projectId: string, framework: Framework) => c<SMTPConfiguration>(B.GetSMTPConfiguration(projectId, framework)),

  messages: (f: MessageFilter) => c<MessagePage>(B.GetMessages(f as never)),
  message: (id: string) => c<Message>(B.GetMessage(id)),
  deleteMessages: (ids: string[]) => c<void>(B.DeleteMessages(ids)),
  setRead: (ids: string[], read: boolean) => c<void>(B.SetMessagesRead(ids, read)),
  clearInbox: (projectId: string) => c<void>(B.ClearInbox(projectId)),
  attachments: (messageId: string) => c<Attachment[]>(B.GetAttachments(messageId)),
  saveAttachment: (id: string) => c<string>(B.SaveAttachment(id)),

  settings: () => c<Settings>(B.GetSettings()),
  updateSettings: (s: Settings) => c<Settings>(B.UpdateSettings(s as never)),
  clearAllData: () => c<void>(B.ClearAllData()),
}

export type BackendEvent =
  | 'smtp:started'
  | 'smtp:stopped'
  | 'message:received'
  | 'message:deleted'
  | 'message:updated'
  | 'project:updated'

/** Subscribe to a backend event; returns an unsubscribe function. */
export function onEvent(event: BackendEvent, cb: (data: unknown) => void): () => void {
  return EventsOn(event, cb)
}

/** Wails rejects with a string (or Error); normalise to a message safe to show. */
export function errorMessage(e: unknown): string {
  if (typeof e === 'string') return e
  if (e instanceof Error) return e.message
  return 'Something went wrong.'
}
