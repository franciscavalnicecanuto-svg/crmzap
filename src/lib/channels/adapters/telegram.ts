/**
 * CRMZap - Telegram Adapter
 * 
 * Integração com Telegram Bot API
 * https://core.telegram.org/bots/api
 */

import {
  ChannelAdapter,
  ChannelConfig,
  ChannelStatus,
  Message,
  SendResult,
  WebhookPayload,
  MessageType,
} from '../types'

export interface TelegramConfig extends ChannelConfig {
  botToken: string              // Token do BotFather
  webhookSecret?: string        // Secret para verificar webhooks
}

const TELEGRAM_API = 'https://api.telegram.org/bot'

export class TelegramAdapter implements ChannelAdapter {
  readonly type = 'telegram' as const
  readonly name = 'Telegram'
  readonly icon = '✈️'

  private config: TelegramConfig | null = null

  // ============================================
  // CONFIGURAÇÃO
  // ============================================

  async configure(config: ChannelConfig): Promise<void> {
    this.config = config as TelegramConfig
  }

  async validateConfig(config: ChannelConfig): Promise<boolean> {
    const c = config as TelegramConfig
    if (!c.botToken) return false

    // Validar token fazendo uma chamada de teste
    try {
      const response = await fetch(`${TELEGRAM_API}${c.botToken}/getMe`)
      const data = await response.json()
      return data.ok === true
    } catch {
      return false
    }
  }

  private getApiUrl(method: string): string {
    return `${TELEGRAM_API}${this.config?.botToken}/${method}`
  }

  // ============================================
  // WEBHOOK
  // ============================================

  async verifyWebhook(payload: any, signature?: string): Promise<boolean> {
    // Telegram não envia assinatura por padrão
    // Pode-se usar secret_token se configurado no setWebhook
    if (this.config?.webhookSecret && signature) {
      return signature === this.config.webhookSecret
    }
    
    // Verificar se tem estrutura válida de update
    return !!(payload.update_id !== undefined)
  }

  async parseWebhook(payload: WebhookPayload): Promise<Message | null> {
    const update = payload.raw

    // Telegram envia diferentes tipos de updates
    const message = update.message || update.edited_message || update.channel_post

    if (!message) {
      // Pode ser callback_query, inline_query, etc
      return null
    }

    // Ignorar mensagens de bots
    if (message.from?.is_bot) {
      return null
    }

    // Determinar tipo de mensagem
    let type: MessageType = 'text'
    let content: Message['content'] = {}

    if (message.text) {
      type = 'text'
      content.text = message.text
    } else if (message.photo) {
      type = 'image'
      // Pegar a maior resolução
      const photo = message.photo[message.photo.length - 1]
      content.mediaUrl = await this.getFileUrl(photo.file_id)
      content.caption = message.caption
    } else if (message.video) {
      type = 'video'
      content.mediaUrl = await this.getFileUrl(message.video.file_id)
      content.caption = message.caption
      content.mimeType = message.video.mime_type
    } else if (message.audio || message.voice) {
      type = 'audio'
      const audio = message.audio || message.voice
      content.mediaUrl = await this.getFileUrl(audio.file_id)
      content.mimeType = audio.mime_type
    } else if (message.document) {
      type = 'document'
      content.mediaUrl = await this.getFileUrl(message.document.file_id)
      content.fileName = message.document.file_name
      content.mimeType = message.document.mime_type
      content.caption = message.caption
    } else if (message.sticker) {
      type = 'sticker'
      content.mediaUrl = await this.getFileUrl(message.sticker.file_id)
    } else if (message.location) {
      type = 'location'
      content.latitude = message.location.latitude
      content.longitude = message.location.longitude
    } else if (message.contact) {
      type = 'contact'
      content.contactCard = {
        name: `${message.contact.first_name} ${message.contact.last_name || ''}`.trim(),
        phone: message.contact.phone_number,
      }
    }

    const chatId = message.chat.id.toString()
    const senderId = message.from?.id.toString() || chatId

    const parsedMessage: Message = {
      id: `tg_${message.message_id}_${Date.now()}`,
      externalId: message.message_id.toString(),
      conversationId: `tg_${chatId}`,
      channel: 'telegram',
      direction: 'inbound',
      type,
      content,
      status: 'delivered',
      sender: {
        id: senderId,
        name: message.from 
          ? `${message.from.first_name} ${message.from.last_name || ''}`.trim()
          : message.chat.title || chatId,
        avatarUrl: undefined, // Telegram não envia avatar no webhook
      },
      timestamp: new Date(message.date * 1000),
      metadata: {
        chatId,
        chatType: message.chat.type, // private, group, supergroup, channel
        updateId: update.update_id,
        raw: update,
      },
    }

    return parsedMessage
  }

  /**
   * Obtém URL do arquivo via Telegram API
   */
  private async getFileUrl(fileId: string): Promise<string | undefined> {
    if (!this.config) return undefined

    try {
      const response = await fetch(this.getApiUrl('getFile'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId }),
      })

      const data = await response.json()
      if (data.ok && data.result?.file_path) {
        return `https://api.telegram.org/file/bot${this.config.botToken}/${data.result.file_path}`
      }
    } catch (error) {
      console.error('[TelegramAdapter] Erro ao obter URL do arquivo:', error)
    }

    return undefined
  }

  // ============================================
  // ENVIO DE MENSAGENS
  // ============================================

  async sendText(to: string, text: string): Promise<SendResult> {
    if (!this.config) {
      return { success: false, error: 'Adapter não configurado', timestamp: new Date() }
    }

    try {
      const response = await fetch(this.getApiUrl('sendMessage'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: to,
          text: text,
          parse_mode: 'HTML', // Permite formatação básica
        }),
      })

      const result = await response.json()

      if (!result.ok) {
        return {
          success: false,
          error: result.description || 'Erro ao enviar',
          timestamp: new Date(),
        }
      }

      return {
        success: true,
        messageId: result.result?.message_id?.toString(),
        externalId: result.result?.message_id?.toString(),
        timestamp: new Date(),
      }
    } catch (error: any) {
      return { success: false, error: error.message, timestamp: new Date() }
    }
  }

  async sendImage(to: string, url: string, caption?: string): Promise<SendResult> {
    if (!this.config) {
      return { success: false, error: 'Adapter não configurado', timestamp: new Date() }
    }

    try {
      const response = await fetch(this.getApiUrl('sendPhoto'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: to,
          photo: url,
          caption: caption,
          parse_mode: 'HTML',
        }),
      })

      const result = await response.json()

      return {
        success: result.ok,
        messageId: result.result?.message_id?.toString(),
        error: result.ok ? undefined : result.description,
        timestamp: new Date(),
      }
    } catch (error: any) {
      return { success: false, error: error.message, timestamp: new Date() }
    }
  }

  async sendDocument(to: string, url: string, filename: string): Promise<SendResult> {
    if (!this.config) {
      return { success: false, error: 'Adapter não configurado', timestamp: new Date() }
    }

    try {
      const response = await fetch(this.getApiUrl('sendDocument'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: to,
          document: url,
          caption: filename,
        }),
      })

      const result = await response.json()

      return {
        success: result.ok,
        messageId: result.result?.message_id?.toString(),
        error: result.ok ? undefined : result.description,
        timestamp: new Date(),
      }
    } catch (error: any) {
      return { success: false, error: error.message, timestamp: new Date() }
    }
  }

  async sendAudio(to: string, url: string): Promise<SendResult> {
    if (!this.config) {
      return { success: false, error: 'Adapter não configurado', timestamp: new Date() }
    }

    try {
      const response = await fetch(this.getApiUrl('sendAudio'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: to,
          audio: url,
        }),
      })

      const result = await response.json()

      return {
        success: result.ok,
        messageId: result.result?.message_id?.toString(),
        error: result.ok ? undefined : result.description,
        timestamp: new Date(),
      }
    } catch (error: any) {
      return { success: false, error: error.message, timestamp: new Date() }
    }
  }

  async sendVideo(to: string, url: string, caption?: string): Promise<SendResult> {
    if (!this.config) {
      return { success: false, error: 'Adapter não configurado', timestamp: new Date() }
    }

    try {
      const response = await fetch(this.getApiUrl('sendVideo'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: to,
          video: url,
          caption: caption,
          parse_mode: 'HTML',
        }),
      })

      const result = await response.json()

      return {
        success: result.ok,
        messageId: result.result?.message_id?.toString(),
        error: result.ok ? undefined : result.description,
        timestamp: new Date(),
      }
    } catch (error: any) {
      return { success: false, error: error.message, timestamp: new Date() }
    }
  }

  // ============================================
  // WEBHOOK SETUP
  // ============================================

  /**
   * Configura webhook no Telegram
   */
  async setWebhook(url: string, secret?: string): Promise<boolean> {
    if (!this.config) return false

    try {
      const response = await fetch(this.getApiUrl('setWebhook'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          secret_token: secret,
          allowed_updates: ['message', 'edited_message', 'callback_query'],
        }),
      })

      const result = await response.json()
      return result.ok === true
    } catch {
      return false
    }
  }

  /**
   * Remove webhook
   */
  async deleteWebhook(): Promise<boolean> {
    if (!this.config) return false

    try {
      const response = await fetch(this.getApiUrl('deleteWebhook'))
      const result = await response.json()
      return result.ok === true
    } catch {
      return false
    }
  }

  // ============================================
  // STATUS
  // ============================================

  async healthCheck(): Promise<boolean> {
    if (!this.config) return false

    try {
      const response = await fetch(this.getApiUrl('getMe'))
      const data = await response.json()
      return data.ok === true
    } catch {
      return false
    }
  }

  async getStatus(): Promise<ChannelStatus> {
    if (!this.config) {
      return { connected: false, error: 'Não configurado' }
    }

    try {
      const response = await fetch(this.getApiUrl('getMe'))
      const data = await response.json()

      if (data.ok) {
        return {
          connected: true,
          details: {
            botId: data.result.id,
            botUsername: data.result.username,
            botName: data.result.first_name,
          },
        }
      } else {
        return { connected: false, error: data.description }
      }
    } catch (error: any) {
      return { connected: false, error: error.message }
    }
  }
}

export default TelegramAdapter
