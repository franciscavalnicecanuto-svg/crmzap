// Unified message format across all channels
export interface UnifiedMessage {
  id: string
  channel: ChannelType
  accountId: string
  chatId: string
  senderId: string
  senderName?: string
  senderAvatar?: string
  text?: string
  media?: MediaAttachment[]
  timestamp: Date
  fromMe: boolean
  replyTo?: {
    id: string
    text?: string
    senderId?: string
  }
  raw?: unknown // Original message from channel
}

export interface MediaAttachment {
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker'
  url?: string
  buffer?: Buffer
  mimeType?: string
  filename?: string
  caption?: string
}

export type ChannelType = 'whatsapp' | 'telegram' | 'discord' | 'webchat' | 'imessage' | 'teams' | 'googlechat' | 'facebook' | 'instagram'

export interface ChannelConfig {
  type: ChannelType
  accountId: string
  enabled: boolean
  // Channel-specific config
  whatsapp?: {
    authDir?: string
  }
  telegram?: {
    botToken: string
  }
  discord?: {
    botToken: string
    guildId?: string
  }
  webchat?: {
    // No auth needed
  }
  facebook?: {
    pageId: string
    pageAccessToken: string
    appSecret?: string
  }
  instagram?: {
    pageId: string
    pageAccessToken: string
    instagramAccountId: string
    appSecret?: string
  }
}

export interface Contact {
  id: string
  channel: ChannelType
  accountId: string
  chatId: string
  name?: string
  phone?: string
  avatar?: string
  lastMessage?: string
  lastMessageAt?: Date
}

export interface SendMessageRequest {
  channel: ChannelType
  accountId: string
  chatId: string
  text?: string
  media?: MediaAttachment[]
  replyTo?: string
}

export interface ChannelStatus {
  type: ChannelType
  accountId: string
  connected: boolean
  qrCode?: string
  error?: string
}

// Event types for webhooks
export type WebhookEvent = 
  | { type: 'message'; data: UnifiedMessage }
  | { type: 'connection'; data: ChannelStatus }
  | { type: 'contact'; data: Contact }

export interface WebhookConfig {
  url: string
  secret?: string
  events: WebhookEvent['type'][]
}
