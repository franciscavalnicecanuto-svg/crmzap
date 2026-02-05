// CRMzap Messaging API Client
// Connects to whatszap-messaging service

const API_URL = process.env.NEXT_PUBLIC_MESSAGING_API_URL || 'http://localhost:3001'

export type ChannelType = 'whatsapp' | 'telegram' | 'discord' | 'webchat' | 'facebook' | 'instagram'

export interface ChannelStatus {
  type: ChannelType
  accountId: string
  connected: boolean
  qrCode?: string
  error?: string
}

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
  timestamp: string
  fromMe: boolean
  replyTo?: {
    id: string
    text?: string
    senderId?: string
  }
}

export interface MediaAttachment {
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker'
  url?: string
  mimeType?: string
  filename?: string
  caption?: string
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
  lastMessageAt?: string
}

class MessagingAPI {
  private baseUrl: string
  private eventSource: EventSource | null = null
  
  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl
  }
  
  // Health check
  async health(): Promise<{ status: string; timestamp: string }> {
    const res = await fetch(`${this.baseUrl}/api/health`)
    return res.json()
  }
  
  // Get all channel statuses
  async getChannels(): Promise<{ channels: ChannelStatus[] }> {
    const res = await fetch(`${this.baseUrl}/api/channels`)
    return res.json()
  }
  
  // Get specific channel status
  async getChannelStatus(type: ChannelType, accountId: string): Promise<ChannelStatus> {
    const res = await fetch(`${this.baseUrl}/api/channels/${type}/${accountId}`)
    if (!res.ok) throw new Error('Channel not found')
    return res.json()
  }
  
  // Add a new channel
  async addChannel(config: {
    type: ChannelType
    accountId: string
    enabled?: boolean
    telegram?: { botToken: string }
    whatsapp?: { authDir?: string }
  }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.baseUrl}/api/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, enabled: config.enabled ?? true }),
    })
    return res.json()
  }
  
  // Connect channel
  async connect(type: ChannelType, accountId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${this.baseUrl}/api/channels/${type}/${accountId}/connect`, {
      method: 'POST',
    })
    return res.json()
  }
  
  // Disconnect channel
  async disconnect(type: ChannelType, accountId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${this.baseUrl}/api/channels/${type}/${accountId}/disconnect`, {
      method: 'POST',
    })
    return res.json()
  }
  
  // Get WhatsApp QR code
  async getWhatsAppQR(accountId: string): Promise<{ qrCode: string } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/channels/whatsapp/${accountId}/qr`)
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  }
  
  // Send message
  async sendMessage(params: {
    channel: ChannelType
    accountId: string
    chatId: string
    text?: string
    media?: MediaAttachment[]
    replyTo?: string
  }): Promise<{ success: boolean; messageId: string }> {
    const res = await fetch(`${this.baseUrl}/api/messages/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    return res.json()
  }
  
  // Subscribe to real-time events via SSE
  subscribe(callbacks: {
    onMessage?: (msg: UnifiedMessage) => void
    onStatus?: (status: ChannelStatus) => void
    onContact?: (contact: Contact) => void
    onError?: (error: Event) => void
  }): () => void {
    if (typeof window === 'undefined') return () => {}
    
    this.eventSource = new EventSource(`${this.baseUrl}/api/events`)
    
    this.eventSource.addEventListener('message', (e) => {
      const data = JSON.parse(e.data) as UnifiedMessage
      callbacks.onMessage?.(data)
    })
    
    this.eventSource.addEventListener('status', (e) => {
      const data = JSON.parse(e.data) as ChannelStatus
      callbacks.onStatus?.(data)
    })
    
    this.eventSource.addEventListener('contact', (e) => {
      const data = JSON.parse(e.data) as Contact
      callbacks.onContact?.(data)
    })
    
    this.eventSource.onerror = (e) => {
      callbacks.onError?.(e)
    }
    
    // Return unsubscribe function
    return () => {
      this.eventSource?.close()
      this.eventSource = null
    }
  }
}

export const messagingApi = new MessagingAPI()
export default messagingApi
