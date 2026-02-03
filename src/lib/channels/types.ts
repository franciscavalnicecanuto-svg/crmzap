/**
 * CRMZap - Channel Abstraction Layer
 * 
 * Arquitetura de plugins para múltiplos canais de comunicação.
 * Cada canal (WhatsApp, Telegram, Facebook, Instagram, WebChat) 
 * implementa a mesma interface, facilitando adicionar novos canais.
 */

// ============================================
// TIPOS BASE
// ============================================

export type ChannelType = 
  | 'whatsapp'      // Evolution API
  | 'telegram'      // Telegram Bot API
  | 'facebook'      // Facebook Messenger
  | 'instagram'     // Instagram Direct
  | 'webchat'       // Chat do site
  | 'email'         // Futuro: Email

export type MessageDirection = 'inbound' | 'outbound'

export type MessageStatus = 
  | 'pending'       // Aguardando envio
  | 'sent'          // Enviado
  | 'delivered'     // Entregue
  | 'read'          // Lido
  | 'failed'        // Falhou

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'location'
  | 'contact'
  | 'sticker'

// ============================================
// INTERFACES PRINCIPAIS
// ============================================

/**
 * Contato/Cliente unificado
 */
export interface Contact {
  id: string                    // ID interno do CRMZap
  externalId: string            // ID no canal (phone, chatId, etc)
  channel: ChannelType
  name: string
  phone?: string
  email?: string
  avatarUrl?: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

/**
 * Mensagem unificada (independente do canal)
 */
export interface Message {
  id: string                    // ID interno
  externalId: string            // ID no canal original
  conversationId: string        // ID da conversa
  channel: ChannelType
  direction: MessageDirection
  type: MessageType
  content: MessageContent
  status: MessageStatus
  sender: MessageSender
  timestamp: Date
  metadata?: Record<string, any>
}

export interface MessageContent {
  text?: string
  mediaUrl?: string
  mimeType?: string
  fileName?: string
  caption?: string
  latitude?: number
  longitude?: number
  contactCard?: ContactCard
}

export interface MessageSender {
  id: string
  name: string
  avatarUrl?: string
  isBot?: boolean
}

export interface ContactCard {
  name: string
  phone?: string
  email?: string
}

/**
 * Conversa unificada
 */
export interface Conversation {
  id: string
  channel: ChannelType
  contact: Contact
  status: ConversationStatus
  assignedTo?: string           // ID do atendente
  tags?: string[]
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  lastMessageAt: Date
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, any>
}

export type ConversationStatus =
  | 'open'
  | 'pending'
  | 'resolved'
  | 'archived'

// ============================================
// INTERFACE DO ADAPTER (PLUGIN)
// ============================================

/**
 * Configuração base para qualquer canal
 */
export interface ChannelConfig {
  enabled: boolean
  webhookSecret?: string
  [key: string]: any
}

/**
 * Payload do webhook (entrada)
 */
export interface WebhookPayload {
  raw: any                      // Payload original do canal
  channel: ChannelType
  timestamp: Date
}

/**
 * Resultado de envio de mensagem
 */
export interface SendResult {
  success: boolean
  messageId?: string
  externalId?: string
  error?: string
  timestamp: Date
}

/**
 * Interface que todo adapter de canal deve implementar
 */
export interface ChannelAdapter {
  // Identificação
  readonly type: ChannelType
  readonly name: string
  readonly icon: string
  
  // Configuração
  configure(config: ChannelConfig): Promise<void>
  validateConfig(config: ChannelConfig): Promise<boolean>
  
  // Webhook (receber mensagens)
  parseWebhook(payload: WebhookPayload): Promise<Message | null>
  verifyWebhook(payload: any, signature?: string): Promise<boolean>
  
  // Envio de mensagens
  sendText(to: string, text: string): Promise<SendResult>
  sendImage(to: string, url: string, caption?: string): Promise<SendResult>
  sendDocument(to: string, url: string, filename: string): Promise<SendResult>
  sendAudio(to: string, url: string): Promise<SendResult>
  sendVideo(to: string, url: string, caption?: string): Promise<SendResult>
  
  // Histórico (importação)
  fetchHistory?(contactId: string, limit?: number): Promise<Message[]>
  
  // Status e health
  healthCheck(): Promise<boolean>
  getStatus(): Promise<ChannelStatus>
}

export interface ChannelStatus {
  connected: boolean
  lastActivity?: Date
  error?: string
  details?: Record<string, any>
}

// ============================================
// EVENTOS
// ============================================

export type ChannelEvent = 
  | { type: 'message.received'; data: Message }
  | { type: 'message.sent'; data: Message }
  | { type: 'message.status'; data: { messageId: string; status: MessageStatus } }
  | { type: 'contact.created'; data: Contact }
  | { type: 'conversation.created'; data: Conversation }
  | { type: 'conversation.updated'; data: Conversation }
  | { type: 'channel.connected'; data: { channel: ChannelType } }
  | { type: 'channel.disconnected'; data: { channel: ChannelType; reason?: string } }

export type EventHandler = (event: ChannelEvent) => Promise<void>
