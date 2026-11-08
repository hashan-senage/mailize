// Mirrors internal/models (JSON tags). Kept hand-written so the UI does not depend on generated classes.

export type ProjectStatus = 'active' | 'disabled'

export interface Project {
  id: string
  name: string
  description: string
  smtpUsername: string
  status: ProjectStatus
  isSystem: boolean
  messageCount: number
  createdAt: string
  updatedAt: string
}

export interface ProjectCredentials {
  projectId: string
  username: string
  password: string
}

export interface CreatedProject {
  project: Project
  credentials: ProjectCredentials
}

export interface Header {
  name: string
  value: string
}

export interface Attachment {
  id: string
  messageId: string
  filename: string
  contentType: string
  size: number
  createdAt: string
}

export interface Message {
  id: string
  projectId: string
  projectName: string
  messageId: string
  fromAddress: string
  toAddresses: string[] | null
  ccAddresses: string[] | null
  bccAddresses: string[] | null
  replyTo: string
  subject: string
  textBody?: string
  htmlBody?: string
  hasHtml: boolean
  hasText: boolean
  headers?: Header[]
  rawSource?: string
  rawTruncated?: boolean
  size: number
  isRead: boolean
  attachmentCount: number
  receivedAt: string
  attachments?: Attachment[]
}

export interface MessageFilter {
  projectId: string
  search: string
  sender: string
  recipient: string
  dateFrom: string
  dateTo: string
  unreadOnly: boolean
  oldestFirst: boolean
  limit: number
  offset: number
}

export interface MessagePage {
  items: Message[]
  total: number
  limit: number
  offset: number
}

export interface SMTPStatus {
  running: boolean
  host: string
  port: number
  address: string
  activeConnections: number
  startedAt?: string
  lastError?: string
}

export interface DashboardStats {
  totalMessages: number
  messagesToday: number
  unreadMessages: number
  projectCount: number
  recent: Message[]
  smtp: SMTPStatus
  insights: Insights
  server: ServerInfo
}

export interface Settings {
  smtpHost: string
  smtpPort: number
  requireAuth: boolean
  allowPublicBind: boolean
  maxMessageMb: number
  maxConnections: number
  autoStartSmtp: boolean
}

export interface StorageInfo {
  dataDir: string
  databasePath: string
  attachmentsDir: string
  rawDir: string
}

export interface ConfigValue {
  label: string
  value: string
}

export interface SMTPConfiguration {
  framework: string
  filename: string
  language: string
  snippet: string
  values: ConfigValue[]
  notes: string[]
}

export type Framework = 'laravel' | 'php' | 'node' | 'generic'

export interface AppInfo {
  name: string
  tagline: string
  version: string
  goVersion: string
  os: string
  arch: string
}

export interface ReceivedEvent {
  id: string
  projectId: string
  projectName: string
  from: string
  subject: string
  attachments: number
}

export interface DayCount {
  date: string
  count: number
}

export interface ProjectStat {
  projectId: string
  name: string
  status: string
  total: number
  unread: number
  lastReceivedAt?: string
}

export interface SenderStat {
  address: string
  count: number
}

export interface Insights {
  attachmentCount: number
  attachmentBytes: number
  messageBytes: number
  avgMessageBytes: number
  lastReceivedAt?: string
  withHtml: number
  last7Days: DayCount[]
  projects: ProjectStat[] | null
  topSenders: SenderStat[] | null
}

export interface ServerInfo {
  requireAuth: boolean
  maxMessageMb: number
  maxConnections: number
  autoStart: boolean
  localOnly: boolean
}
