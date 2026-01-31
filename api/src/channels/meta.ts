/**
 * Meta Business API Integration
 * Handles both Instagram DMs and Facebook Messenger
 * 
 * Requires:
 * - Facebook Page with Messenger enabled
 * - Instagram Business/Creator account linked to Page
 * - Meta App with messenger permissions
 */

import { EventEmitter } from 'events'
import axios from 'axios'
import type { UnifiedMessage, ChannelStatus, Contact, MediaAttachment } from '../types.js'

const META_API_VERSION = 'v18.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

export interface MetaConfig {
  pageId: string
  pageAccessToken: string
  appSecret?: string // For webhook verification
  instagramAccountId?: string // If using Instagram
}

export class MetaChannel extends EventEmitter {
  private accountId: string
  private config: MetaConfig
  private connected = false
  private channelType: 'facebook' | 'instagram'

  constructor(accountId: string, config: MetaConfig, type: 'facebook' | 'instagram' = 'facebook') {
    super()
    this.accountId = accountId
    this.config = config
    this.channelType = type
  }

  async connect(): Promise<void> {
    try {
      // Verify token by getting page info
      const response = await axios.get(`${META_API_BASE}/${this.config.pageId}`, {
        params: {
          access_token: this.config.pageAccessToken,
          fields: 'name,id',
        },
      })

      if (response.data.id) {
        this.connected = true
        this.emitStatus()
        console.log(`[Meta/${this.channelType}] Connected to page: ${response.data.name}`)
      }
    } catch (error: any) {
      console.error(`[Meta/${this.channelType}] Connection failed:`, error.response?.data || error.message)
      this.connected = false
      this.emitStatus()
      throw new Error('Failed to connect to Meta API')
    }
  }

  /**
   * Process incoming webhook event from Meta
   * Called by the webhook handler in the API
   */
  async processWebhook(body: any): Promise<void> {
    const entries = body.entry || []

    for (const entry of entries) {
      // Facebook Messenger messages
      if (entry.messaging) {
        for (const event of entry.messaging) {
          if (event.message) {
            const unified = this.toUnifiedMessage(event, 'facebook')
            if (unified) {
              this.emit('message', unified)
            }
          }
        }
      }

      // Instagram messages
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === 'messages' && change.value) {
            const unified = this.toUnifiedMessage(change.value, 'instagram')
            if (unified) {
              this.emit('message', unified)
            }
          }
        }
      }
    }
  }

  private toUnifiedMessage(event: any, source: 'facebook' | 'instagram'): UnifiedMessage | null {
    try {
      const senderId = event.sender?.id || event.from?.id
      const text = event.message?.text || event.text
      const timestamp = event.timestamp || Date.now()

      if (!senderId) return null

      const message: UnifiedMessage = {
        id: event.message?.mid || event.id || `${Date.now()}`,
        channel: source === 'instagram' ? 'instagram' as any : 'facebook' as any,
        accountId: this.accountId,
        chatId: senderId,
        senderId: senderId,
        senderName: event.sender?.name,
        text,
        timestamp: new Date(timestamp),
        fromMe: false,
      }

      // Handle attachments
      if (event.message?.attachments) {
        message.media = event.message.attachments.map((att: any) => ({
          type: att.type === 'image' ? 'image' :
                att.type === 'video' ? 'video' :
                att.type === 'audio' ? 'audio' : 'document',
          url: att.payload?.url,
        }))
      }

      return message
    } catch (error) {
      console.error('[Meta] Error parsing message:', error)
      return null
    }
  }

  async sendMessage(recipientId: string, text?: string, media?: MediaAttachment[]): Promise<string> {
    if (!this.connected) {
      throw new Error('Meta channel not connected')
    }

    const endpoint = this.channelType === 'instagram'
      ? `${META_API_BASE}/${this.config.instagramAccountId}/messages`
      : `${META_API_BASE}/${this.config.pageId}/messages`

    try {
      let messageData: any = {
        recipient: { id: recipientId },
      }

      if (media && media.length > 0) {
        const m = media[0]
        messageData.message = {
          attachment: {
            type: m.type === 'image' ? 'image' :
                  m.type === 'video' ? 'video' :
                  m.type === 'audio' ? 'audio' : 'file',
            payload: {
              url: m.url,
              is_reusable: true,
            },
          },
        }
      } else if (text) {
        messageData.message = { text }
      }

      const response = await axios.post(endpoint, messageData, {
        params: { access_token: this.config.pageAccessToken },
      })

      return response.data.message_id || ''
    } catch (error: any) {
      console.error('[Meta] Send error:', error.response?.data || error.message)
      throw new Error('Failed to send message')
    }
  }

  /**
   * Get user profile info
   */
  async getUserProfile(userId: string): Promise<Contact | null> {
    try {
      const response = await axios.get(`${META_API_BASE}/${userId}`, {
        params: {
          access_token: this.config.pageAccessToken,
          fields: 'name,profile_pic',
        },
      })

      return {
        id: userId,
        channel: this.channelType as any,
        accountId: this.accountId,
        chatId: userId,
        name: response.data.name,
        avatar: response.data.profile_pic,
      }
    } catch {
      return null
    }
  }

  disconnect(): void {
    this.connected = false
    this.emitStatus()
  }

  getStatus(): ChannelStatus {
    return {
      type: this.channelType as any,
      accountId: this.accountId,
      connected: this.connected,
    }
  }

  private emitStatus(): void {
    this.emit('status', this.getStatus())
  }

  isConnected(): boolean {
    return this.connected
  }
}

/**
 * OAuth helper to get Page Access Token
 * 
 * Flow:
 * 1. User clicks "Connect Facebook/Instagram"
 * 2. Redirect to Facebook OAuth
 * 3. User authorizes app
 * 4. Get user access token
 * 5. Exchange for page access token
 */
export async function getPageAccessToken(
  appId: string,
  appSecret: string,
  userAccessToken: string,
  pageId: string
): Promise<string> {
  // Get long-lived user token
  const longLivedResponse = await axios.get(`${META_API_BASE}/oauth/access_token`, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: userAccessToken,
    },
  })

  const longLivedToken = longLivedResponse.data.access_token

  // Get page access token
  const pagesResponse = await axios.get(`${META_API_BASE}/me/accounts`, {
    params: { access_token: longLivedToken },
  })

  const page = pagesResponse.data.data.find((p: any) => p.id === pageId)
  if (!page) {
    throw new Error('Page not found or not accessible')
  }

  return page.access_token
}

/**
 * Generate OAuth URL for Facebook Login
 */
export function getOAuthUrl(appId: string, redirectUri: string, state?: string): string {
  const scopes = [
    'pages_messaging',
    'pages_manage_metadata',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_manage_messages',
  ].join(',')

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: 'code',
    ...(state && { state }),
  })

  return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params}`
}
