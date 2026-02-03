/**
 * CRMZap - WhatsApp Adapter (Evolution API)
 * 
 * Integração com Evolution API para WhatsApp
 * https://github.com/EvolutionAPI/evolution-api
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

export interface WhatsAppConfig extends ChannelConfig {
  evolutionApiUrl: string       // URL da Evolution API
  evolutionApiKey: string       // API Key
  instanceName: string          // Nome da instância
  webhookSecret?: string        // Secret para verificar webhooks
}

export class WhatsAppAdapter implements ChannelAdapter {
  readonly type = 'whatsapp' as const
  readonly name = 'WhatsApp'
  readonly icon = '💬'

  private config: WhatsAppConfig | null = null

  // ============================================
  // CONFIGURAÇÃO
  // ============================================

  async configure(config: ChannelConfig): Promise<void> {
    this.config = config as WhatsAppConfig
  }

  async validateConfig(config: ChannelConfig): Promise<boolean> {
    const c = config as WhatsAppConfig
    return !!(c.evolutionApiUrl && c.evolutionApiKey && c.instanceName)
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'apikey': this.config?.evolutionApiKey || '',
    }
  }

  private getBaseUrl(): string {
    return this.config?.evolutionApiUrl?.replace(/\/$/, '') || ''
  }

  // ============================================
  // WEBHOOK
  // ============================================

  async verifyWebhook(payload: any, signature?: string): Promise<boolean> {
    // Evolution API pode enviar um header de verificação
    // Por padrão, aceita se tiver instanceName correto
    if (!this.config) return false
    
    // Verificar se o webhook é da instância correta
    const instance = payload?.instance?.instanceName || payload?.instance
    if (instance && instance !== this.config.instanceName) {
      return false
    }

    return true
  }

  async parseWebhook(payload: WebhookPayload): Promise<Message | null> {
    const data = payload.raw
    
    // Evolution API envia diferentes tipos de eventos
    const eventType = data.event
    
    // Só processar mensagens recebidas
    if (eventType !== 'messages.upsert') {
      return null
    }

    const messageData = data.data
    if (!messageData || messageData.key?.fromMe) {
      // Ignorar mensagens enviadas por nós
      return null
    }

    const key = messageData.key
    const msg = messageData.message

    // Determinar tipo de mensagem
    let type: MessageType = 'text'
    let content: Message['content'] = {}

    if (msg?.conversation || msg?.extendedTextMessage?.text) {
      type = 'text'
      content.text = msg.conversation || msg.extendedTextMessage?.text
    } else if (msg?.imageMessage) {
      type = 'image'
      content.caption = msg.imageMessage.caption
      content.mimeType = msg.imageMessage.mimetype
      // URL precisa ser baixada via Evolution API
    } else if (msg?.videoMessage) {
      type = 'video'
      content.caption = msg.videoMessage.caption
      content.mimeType = msg.videoMessage.mimetype
    } else if (msg?.audioMessage) {
      type = 'audio'
      content.mimeType = msg.audioMessage.mimetype
    } else if (msg?.documentMessage) {
      type = 'document'
      content.fileName = msg.documentMessage.fileName
      content.mimeType = msg.documentMessage.mimetype
    } else if (msg?.stickerMessage) {
      type = 'sticker'
    } else if (msg?.locationMessage) {
      type = 'location'
      content.latitude = msg.locationMessage.degreesLatitude
      content.longitude = msg.locationMessage.degreesLongitude
    }

    // Extrair número do remetente
    const remoteJid = key.remoteJid || ''
    const senderId = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '')

    const message: Message = {
      id: `wa_${key.id}_${Date.now()}`,
      externalId: key.id,
      conversationId: `wa_${senderId}`,
      channel: 'whatsapp',
      direction: 'inbound',
      type,
      content,
      status: 'delivered',
      sender: {
        id: senderId,
        name: messageData.pushName || senderId,
      },
      timestamp: new Date(messageData.messageTimestamp * 1000 || Date.now()),
      metadata: {
        remoteJid,
        isGroup: remoteJid.includes('@g.us'),
        raw: data,
      },
    }

    return message
  }

  // ============================================
  // ENVIO DE MENSAGENS
  // ============================================

  async sendText(to: string, text: string): Promise<SendResult> {
    if (!this.config) {
      return { success: false, error: 'Adapter não configurado', timestamp: new Date() }
    }

    try {
      const response = await fetch(
        `${this.getBaseUrl()}/message/sendText/${this.config.instanceName}`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            number: to,
            text: text,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        return { 
          success: false, 
          error: result.message || 'Erro ao enviar', 
          timestamp: new Date() 
        }
      }

      return {
        success: true,
        messageId: result.key?.id,
        externalId: result.key?.id,
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
      const response = await fetch(
        `${this.getBaseUrl()}/message/sendMedia/${this.config.instanceName}`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            number: to,
            mediatype: 'image',
            media: url,
            caption: caption,
          }),
        }
      )

      const result = await response.json()

      return {
        success: response.ok,
        messageId: result.key?.id,
        error: response.ok ? undefined : result.message,
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
      const response = await fetch(
        `${this.getBaseUrl()}/message/sendMedia/${this.config.instanceName}`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            number: to,
            mediatype: 'document',
            media: url,
            fileName: filename,
          }),
        }
      )

      const result = await response.json()

      return {
        success: response.ok,
        messageId: result.key?.id,
        error: response.ok ? undefined : result.message,
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
      const response = await fetch(
        `${this.getBaseUrl()}/message/sendWhatsAppAudio/${this.config.instanceName}`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            number: to,
            audio: url,
          }),
        }
      )

      const result = await response.json()

      return {
        success: response.ok,
        messageId: result.key?.id,
        error: response.ok ? undefined : result.message,
        timestamp: new Date(),
      }
    } catch (error: any) {
      return { success: false, error: error.message, timestamp: new Date() }
    }
  }

  async sendVideo(to: string, url: string, caption?: string): Promise<SendResult> {
    return this.sendImage(to, url, caption) // Usa mesmo endpoint com mediatype diferente
  }

  // ============================================
  // HISTÓRICO
  // ============================================

  async fetchHistory(contactId: string, limit = 100): Promise<Message[]> {
    if (!this.config) return []

    try {
      const response = await fetch(
        `${this.getBaseUrl()}/chat/findMessages/${this.config.instanceName}`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            where: {
              key: {
                remoteJid: `${contactId}@s.whatsapp.net`,
              },
            },
            limit,
          }),
        }
      )

      if (!response.ok) return []

      const result = await response.json()
      const messages: Message[] = []

      for (const msg of result.messages || []) {
        // Converter para formato unificado
        // (simplificado - implementar parseamento completo)
        messages.push({
          id: `wa_${msg.key?.id}`,
          externalId: msg.key?.id,
          conversationId: `wa_${contactId}`,
          channel: 'whatsapp',
          direction: msg.key?.fromMe ? 'outbound' : 'inbound',
          type: 'text',
          content: { text: msg.message?.conversation || '' },
          status: 'delivered',
          sender: {
            id: msg.key?.fromMe ? 'me' : contactId,
            name: msg.pushName || contactId,
          },
          timestamp: new Date(msg.messageTimestamp * 1000),
        })
      }

      return messages
    } catch (error) {
      console.error('[WhatsAppAdapter] Erro ao buscar histórico:', error)
      return []
    }
  }

  // ============================================
  // STATUS
  // ============================================

  async healthCheck(): Promise<boolean> {
    if (!this.config) return false

    try {
      const response = await fetch(
        `${this.getBaseUrl()}/instance/connectionState/${this.config.instanceName}`,
        { headers: this.getHeaders() }
      )
      const data = await response.json()
      return data.state === 'open'
    } catch {
      return false
    }
  }

  async getStatus(): Promise<ChannelStatus> {
    if (!this.config) {
      return { connected: false, error: 'Não configurado' }
    }

    try {
      const response = await fetch(
        `${this.getBaseUrl()}/instance/connectionState/${this.config.instanceName}`,
        { headers: this.getHeaders() }
      )
      const data = await response.json()

      return {
        connected: data.state === 'open',
        details: {
          state: data.state,
          instance: this.config.instanceName,
        },
      }
    } catch (error: any) {
      return { connected: false, error: error.message }
    }
  }
}

export default WhatsAppAdapter
