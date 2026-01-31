import { Server as HttpServer } from 'http'
import { EventEmitter } from 'events'
import { WhatsAppChannel } from './whatsapp.js'
import { TelegramChannel } from './telegram.js'
import { WebchatChannel } from './webchat.js'
import { MetaChannel } from './meta.js'
import type { 
  ChannelType, 
  ChannelConfig, 
  UnifiedMessage, 
  ChannelStatus, 
  SendMessageRequest,
  Contact,
} from '../types.js'

type ChannelInstance = WhatsAppChannel | TelegramChannel | WebchatChannel | MetaChannel

export class ChannelManager extends EventEmitter {
  private channels: Map<string, ChannelInstance> = new Map()
  private httpServer: HttpServer | null = null

  constructor() {
    super()
  }

  setHttpServer(server: HttpServer): void {
    this.httpServer = server
  }

  private getKey(type: ChannelType, accountId: string): string {
    return `${type}:${accountId}`
  }

  async addChannel(config: ChannelConfig): Promise<void> {
    const key = this.getKey(config.type, config.accountId)
    
    if (this.channels.has(key)) {
      throw new Error(`Channel ${key} already exists`)
    }

    let channel: ChannelInstance

    switch (config.type) {
      case 'whatsapp':
        channel = new WhatsAppChannel(config.accountId, config.whatsapp?.authDir)
        break
      
      case 'telegram':
        if (!config.telegram?.botToken) {
          throw new Error('Telegram bot token required')
        }
        channel = new TelegramChannel(config.accountId, config.telegram.botToken)
        break
      
      case 'webchat':
        channel = new WebchatChannel(config.accountId)
        if (this.httpServer) {
          (channel as WebchatChannel).attach(this.httpServer)
        }
        break
      
      case 'facebook':
        if (!config.facebook?.pageId || !config.facebook?.pageAccessToken) {
          throw new Error('Facebook page ID and access token required')
        }
        channel = new MetaChannel(config.accountId, {
          pageId: config.facebook.pageId,
          pageAccessToken: config.facebook.pageAccessToken,
          appSecret: config.facebook.appSecret,
        }, 'facebook')
        break
      
      case 'instagram':
        if (!config.instagram?.pageId || !config.instagram?.pageAccessToken || !config.instagram?.instagramAccountId) {
          throw new Error('Instagram page ID, access token, and Instagram account ID required')
        }
        channel = new MetaChannel(config.accountId, {
          pageId: config.instagram.pageId,
          pageAccessToken: config.instagram.pageAccessToken,
          instagramAccountId: config.instagram.instagramAccountId,
          appSecret: config.instagram.appSecret,
        }, 'instagram')
        break
      
      default:
        throw new Error(`Unsupported channel type: ${config.type}`)
    }

    // Forward events
    channel.on('message', (msg: UnifiedMessage) => {
      this.emit('message', msg)
    })

    channel.on('status', (status: ChannelStatus) => {
      this.emit('status', status)
    })

    channel.on('contact', (contact: Contact) => {
      this.emit('contact', contact)
    })

    this.channels.set(key, channel)

    // Auto-connect non-webchat channels
    if (config.type !== 'webchat' && config.enabled) {
      await this.connect(config.type, config.accountId)
    }
  }

  async connect(type: ChannelType, accountId: string): Promise<void> {
    const key = this.getKey(type, accountId)
    const channel = this.channels.get(key)
    
    if (!channel) {
      throw new Error(`Channel ${key} not found`)
    }

    if ('connect' in channel) {
      await channel.connect()
    }
  }

  async disconnect(type: ChannelType, accountId: string): Promise<void> {
    const key = this.getKey(type, accountId)
    const channel = this.channels.get(key)
    
    if (!channel) {
      throw new Error(`Channel ${key} not found`)
    }

    await channel.disconnect()
  }

  async removeChannel(type: ChannelType, accountId: string): Promise<void> {
    const key = this.getKey(type, accountId)
    const channel = this.channels.get(key)
    
    if (channel) {
      await channel.disconnect()
      this.channels.delete(key)
    }
  }

  async sendMessage(request: SendMessageRequest): Promise<string> {
    const key = this.getKey(request.channel, request.accountId)
    const channel = this.channels.get(key)
    
    if (!channel) {
      throw new Error(`Channel ${key} not found`)
    }

    return channel.sendMessage(
      request.chatId, 
      request.text, 
      request.media, 
      request.replyTo
    )
  }

  getStatus(type: ChannelType, accountId: string): ChannelStatus | null {
    const key = this.getKey(type, accountId)
    const channel = this.channels.get(key)
    return channel?.getStatus() || null
  }

  getAllStatus(): ChannelStatus[] {
    return Array.from(this.channels.values()).map(ch => ch.getStatus())
  }

  getChannel(type: ChannelType, accountId: string): ChannelInstance | null {
    const key = this.getKey(type, accountId)
    return this.channels.get(key) || null
  }
}

export { WhatsAppChannel } from './whatsapp.js'
export { TelegramChannel } from './telegram.js'
export { WebchatChannel } from './webchat.js'
export { MetaChannel, getOAuthUrl, getPageAccessToken } from './meta.js'
