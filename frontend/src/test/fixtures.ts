import type {Message} from '@/types'

export const msg = (over: Partial<Message> = {}): Message => ({
  id: 'm1',
  projectId: 'p1',
  projectName: 'Shop',
  messageId: 'abc@x',
  fromAddress: 'alice@example.test',
  toAddresses: ['bob@example.test'],
  ccAddresses: null,
  bccAddresses: null,
  replyTo: '',
  subject: 'Welcome aboard',
  hasHtml: true,
  hasText: true,
  size: 1200,
  isRead: false,
  attachmentCount: 0,
  receivedAt: new Date().toISOString(),
  ...over,
})
