import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

interface EvolutionWebhookPayload {
  event: string
  instance: string
  data: any
  sender?: string
  apikey?: string
}

// In-memory fallback se não tiver Supabase
const inMemoryMessages: Map<string, any[]> = new Map()

async function saveMessage(message: any) {
  const chatId = message.key?.remoteJid || 'unknown'
  
  // Tentar salvar no Supabase
  if (supabase) {
    try {
      const { error } = await supabase.from('messages').upsert({
        id: message.key?.id,
        instance_id: message.instanceId,
        remote_jid: chatId,
        from_me: message.key?.fromMe || false,
        message_type: message.messageType || 'unknown',
        content: message.message?.conversation || 
                 message.message?.extendedTextMessage?.text ||
                 JSON.stringify(message.message),
        push_name: message.pushName,
        timestamp: message.messageTimestamp 
          ? new Date(Number(message.messageTimestamp) * 1000).toISOString()
          : new Date().toISOString(),
        raw_data: message,
      }, { onConflict: 'id' })
      
      if (error) {
        console.error('[Webhook] Supabase error:', error)
      } else {
        console.log(`[Webhook] Saved message ${message.key?.id} to Supabase`)
        return true
      }
    } catch (err) {
      console.error('[Webhook] Supabase exception:', err)
    }
  }
  
  // Fallback: in-memory
  if (!inMemoryMessages.has(chatId)) {
    inMemoryMessages.set(chatId, [])
  }
  inMemoryMessages.get(chatId)!.push(message)
  console.log(`[Webhook] Saved message ${message.key?.id} to memory (chat: ${chatId})`)
  return true
}

async function saveChat(chat: any) {
  if (!supabase) return
  
  try {
    await supabase.from('chats').upsert({
      id: chat.id,
      instance_id: chat.instanceId,
      remote_jid: chat.remoteJid,
      name: chat.name || chat.pushName,
      unread_count: chat.unreadCount || 0,
      last_message_at: chat.lastMsgTimestamp 
        ? new Date(Number(chat.lastMsgTimestamp) * 1000).toISOString()
        : null,
      raw_data: chat,
    }, { onConflict: 'id' })
  } catch (err) {
    console.error('[Webhook] Failed to save chat:', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload: EvolutionWebhookPayload = await request.json()
    
    console.log(`[Webhook] Received event: ${payload.event} from instance: ${payload.instance}`)
    
    switch (payload.event) {
      // Mensagens recebidas/enviadas
      case 'messages.upsert':
      case 'MESSAGES_UPSERT':
        if (Array.isArray(payload.data)) {
          for (const msg of payload.data) {
            await saveMessage(msg)
          }
          console.log(`[Webhook] Processed ${payload.data.length} messages`)
        } else if (payload.data) {
          await saveMessage(payload.data)
        }
        break
      
      // Histórico sincronizado (bulk)
      case 'messages.set':
      case 'MESSAGES_SET':
        const messages = payload.data?.messages || payload.data || []
        if (Array.isArray(messages)) {
          console.log(`[Webhook] Syncing ${messages.length} historical messages...`)
          let saved = 0
          for (const msg of messages) {
            await saveMessage(msg)
            saved++
          }
          console.log(`[Webhook] Synced ${saved} historical messages`)
        }
        break
      
      // Chats sincronizados
      case 'chats.set':
      case 'CHATS_SET':
        const chats = payload.data?.chats || payload.data || []
        if (Array.isArray(chats)) {
          console.log(`[Webhook] Syncing ${chats.length} chats...`)
          for (const chat of chats) {
            await saveChat(chat)
          }
        }
        break
      
      // Atualização de mensagem (lido, entregue, etc)
      case 'messages.update':
      case 'MESSAGES_UPDATE':
        // Atualizar status da mensagem
        console.log(`[Webhook] Message update:`, payload.data?.key?.id)
        break
      
      // Conexão
      case 'connection.update':
      case 'CONNECTION_UPDATE':
        console.log(`[Webhook] Connection update:`, payload.data?.state)
        break
      
      default:
        console.log(`[Webhook] Unhandled event: ${payload.event}`)
    }
    
    return NextResponse.json({ success: true, event: payload.event })
  } catch (error: any) {
    console.error('[Webhook] Error processing:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// Endpoint para verificar status
export async function GET() {
  const stats = {
    supabaseConnected: !!supabase,
    inMemoryChats: inMemoryMessages.size,
    totalInMemoryMessages: Array.from(inMemoryMessages.values()).reduce((a, b) => a + b.length, 0),
  }
  return NextResponse.json(stats)
}
