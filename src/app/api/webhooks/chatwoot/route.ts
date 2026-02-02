/**
 * Chatwoot Webhook Handler
 * 
 * Recebe eventos do Chatwoot e integra com o CRMZap
 * 
 * Eventos suportados:
 * - message_created: Nova mensagem
 * - message_updated: Mensagem atualizada
 * - conversation_created: Nova conversa
 * - conversation_status_changed: Status mudou (open/resolved/pending)
 * - conversation_updated: Conversa atualizada
 */

import { NextRequest, NextResponse } from 'next/server'

// Tipos do Chatwoot
interface ChatwootMessage {
  id: number
  content: string
  content_type: string
  content_attributes: Record<string, any>
  message_type: 'incoming' | 'outgoing' | 'activity' | 'template'
  created_at: number
  private: boolean
  source_id: string | null
  sender: {
    id: number
    name: string
    email?: string
    phone_number?: string
    type: 'contact' | 'user'
  }
  conversation: {
    id: number
  }
}

interface ChatwootConversation {
  id: number
  inbox_id: number
  status: 'open' | 'resolved' | 'pending' | 'snoozed'
  agent_last_seen_at: number
  contact_last_seen_at: number
  timestamp: number
  account_id: number
  additional_attributes: Record<string, any>
  contact: {
    id: number
    name: string
    email?: string
    phone_number?: string
  }
  inbox: {
    id: number
    name: string
    channel_type: string
  }
  messages: ChatwootMessage[]
}

interface ChatwootWebhookEvent {
  event: string
  id?: number
  account?: {
    id: number
    name: string
  }
  inbox?: {
    id: number
    name: string
  }
  conversation?: ChatwootConversation
  message?: ChatwootMessage
  sender?: {
    id: number
    name: string
    type: string
  }
}

// POST - Recebe eventos do Chatwoot
export async function POST(request: NextRequest) {
  try {
    const event: ChatwootWebhookEvent = await request.json()
    
    console.log(`[Chatwoot Webhook] Event: ${event.event}`)
    console.log(`[Chatwoot Webhook] Data:`, JSON.stringify(event, null, 2))

    switch (event.event) {
      case 'message_created':
        await handleMessageCreated(event)
        break
      
      case 'message_updated':
        await handleMessageUpdated(event)
        break
      
      case 'conversation_created':
        await handleConversationCreated(event)
        break
      
      case 'conversation_status_changed':
        await handleConversationStatusChanged(event)
        break
      
      case 'conversation_updated':
        await handleConversationUpdated(event)
        break
      
      default:
        console.log(`[Chatwoot Webhook] Unknown event: ${event.event}`)
    }

    return NextResponse.json({ status: 'ok' })

  } catch (error) {
    console.error('[Chatwoot Webhook] Error:', error)
    // Retorna 200 para evitar retentativas infinitas
    return NextResponse.json({ status: 'error', message: String(error) })
  }
}

// GET - Health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'chatwoot-webhook',
    timestamp: new Date().toISOString()
  })
}

// Handlers para cada tipo de evento

async function handleMessageCreated(event: ChatwootWebhookEvent) {
  const message = event.message
  if (!message) return

  // Ignora mensagens de saída (enviadas pelo agente)
  if (message.message_type === 'outgoing') {
    console.log('[Chatwoot] Ignoring outgoing message')
    return
  }

  // Ignora mensagens privadas (notas internas)
  if (message.private) {
    console.log('[Chatwoot] Ignoring private message')
    return
  }

  const normalizedMessage = {
    id: `chatwoot_${message.id}`,
    source: 'chatwoot',
    channel: event.inbox?.name || 'unknown',
    channelType: getChannelType(event.conversation?.inbox?.channel_type),
    conversationId: message.conversation?.id,
    senderId: message.sender?.id,
    senderName: message.sender?.name,
    senderPhone: message.sender?.phone_number,
    senderEmail: message.sender?.email,
    content: message.content,
    contentType: message.content_type,
    timestamp: new Date(message.created_at * 1000),
    raw: event
  }

  console.log('[Chatwoot] Normalized message:', normalizedMessage)

  // TODO: Salvar no banco de dados do CRMZap
  // TODO: Notificar frontend via WebSocket/SSE
}

async function handleMessageUpdated(event: ChatwootWebhookEvent) {
  console.log('[Chatwoot] Message updated:', event.message?.id)
  // TODO: Atualizar mensagem no banco
}

async function handleConversationCreated(event: ChatwootWebhookEvent) {
  const conversation = event.conversation
  if (!conversation) return

  const normalizedConversation = {
    id: `chatwoot_conv_${conversation.id}`,
    source: 'chatwoot',
    inboxId: conversation.inbox_id,
    inboxName: conversation.inbox?.name,
    channelType: getChannelType(conversation.inbox?.channel_type),
    status: conversation.status,
    contact: {
      id: conversation.contact?.id,
      name: conversation.contact?.name,
      email: conversation.contact?.email,
      phone: conversation.contact?.phone_number
    },
    createdAt: new Date(conversation.timestamp * 1000)
  }

  console.log('[Chatwoot] New conversation:', normalizedConversation)

  // TODO: Criar lead/contato no CRMZap
}

async function handleConversationStatusChanged(event: ChatwootWebhookEvent) {
  const conversation = event.conversation
  if (!conversation) return

  console.log(`[Chatwoot] Conversation ${conversation.id} status: ${conversation.status}`)

  // TODO: Atualizar status no CRMZap (ex: mover no Kanban)
}

async function handleConversationUpdated(event: ChatwootWebhookEvent) {
  console.log('[Chatwoot] Conversation updated:', event.conversation?.id)
  // TODO: Sincronizar atualizações
}

// Helpers

function getChannelType(chatwootChannel?: string): string {
  if (!chatwootChannel) return 'unknown'
  
  const channelMap: Record<string, string> = {
    'Channel::FacebookPage': 'facebook',
    'Channel::Instagram': 'instagram',
    'Channel::TwitterProfile': 'twitter',
    'Channel::WebWidget': 'webchat',
    'Channel::Email': 'email',
    'Channel::Api': 'api',
    'Channel::Whatsapp': 'whatsapp',
    'Channel::TiktokPage': 'tiktok'
  }

  return channelMap[chatwootChannel] || chatwootChannel.toLowerCase()
}
