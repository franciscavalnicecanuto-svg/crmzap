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
  const msgId = message.key?.id || `gen_${Date.now()}_${Math.random().toString(36).slice(2)}`
  
  // Extrair conteúdo da mensagem
  let content = '[mídia]'
  if (message.message) {
    content = message.message.conversation ||
              message.message.extendedTextMessage?.text ||
              message.message.imageMessage?.caption ||
              message.message.videoMessage?.caption ||
              message.message.documentMessage?.caption ||
              '[mídia]'
  }
  
  // Tentar salvar no Supabase
  if (supabase) {
    try {
      const record = {
        id: msgId,
        instance_id: message.instanceId || 'crmzap',
        remote_jid: chatId,
        from_me: message.key?.fromMe || false,
        message_type: message.messageType || 'text',
        content: content,
        push_name: message.pushName || null,
        timestamp: message.messageTimestamp 
          ? new Date(Number(message.messageTimestamp) * 1000).toISOString()
          : new Date().toISOString(),
        raw_data: message,
      }
      
      const { error } = await supabase.from('messages').upsert(record, { onConflict: 'id' })
      
      if (error) {
        console.error('[Webhook] Supabase error:', JSON.stringify(error))
        console.error('[Webhook] Record was:', JSON.stringify(record).slice(0, 500))
      } else {
        console.log(`[Webhook] Saved message ${msgId} to Supabase`)
        return true
      }
    } catch (err: any) {
      console.error('[Webhook] Supabase exception:', err?.message || err)
    }
  } else {
    console.log('[Webhook] Supabase not configured, using memory')
  }
  
  // Fallback: in-memory
  if (!inMemoryMessages.has(chatId)) {
    inMemoryMessages.set(chatId, [])
  }
  inMemoryMessages.get(chatId)!.push(message)
  console.log(`[Webhook] Saved message ${msgId} to memory (chat: ${chatId})`)
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

// Endpoint para verificar status e forçar dump
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  
  // Debug: ver uma mensagem e tentar salvar com detalhes do erro
  if (action === 'debug' && supabase) {
    const firstChat = Array.from(inMemoryMessages.entries())[0]
    if (!firstChat) {
      return NextResponse.json({ error: 'No messages in memory' })
    }
    
    const [chatId, messages] = firstChat
    const msg = messages[0]
    
    // Extrair conteúdo
    let content = '[mídia]'
    if (msg.message) {
      content = msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                '[mídia]'
    }
    
    const record = {
      id: msg.key?.id || `debug_${Date.now()}`,
      instance_id: 'crmzap',
      remote_jid: msg.key?.remoteJid || chatId,
      from_me: msg.key?.fromMe || false,
      message_type: 'text',
      content: content.slice(0, 10000), // Limitar tamanho
      push_name: msg.pushName || null,
      timestamp: msg.messageTimestamp 
        ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
        : new Date().toISOString(),
    }
    
    // Remover raw_data para debug (pode ser muito grande)
    const { data, error } = await supabase.from('messages').upsert(record, { onConflict: 'id' }).select()
    
    return NextResponse.json({
      record,
      supabaseError: error,
      supabaseData: data,
      originalMsgKeys: Object.keys(msg),
      originalMsgSample: JSON.stringify(msg).slice(0, 2000)
    })
  }
  
  // Forçar dump da memória pro banco
  if (action === 'dump' && supabase) {
    let saved = 0
    let errors = 0
    let lastError: any = null
    
    for (const [chatId, messages] of inMemoryMessages.entries()) {
      for (const msg of messages) {
        try {
          // Extrair conteúdo
          let content = '[mídia]'
          if (msg.message) {
            content = msg.message.conversation ||
                      msg.message.extendedTextMessage?.text ||
                      '[mídia]'
          }
          
          const record = {
            id: msg.key?.id || `mem_${Date.now()}_${Math.random()}`,
            instance_id: 'crmzap',
            remote_jid: msg.key?.remoteJid || chatId,
            from_me: msg.key?.fromMe || false,
            message_type: 'text',
            content: content.slice(0, 10000),
            push_name: msg.pushName || null,
            timestamp: msg.messageTimestamp 
              ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
              : new Date().toISOString(),
          }
          
          const { error } = await supabase.from('messages').upsert(record, { onConflict: 'id' })
          
          if (error) {
            lastError = error
            errors++
          } else {
            saved++
          }
        } catch (e: any) {
          lastError = e?.message || e
          errors++
        }
      }
    }
    
    // Limpar memória após dump se salvou algo
    if (saved > 0) {
      inMemoryMessages.clear()
    }
    
    return NextResponse.json({ 
      action: 'dump',
      saved, 
      errors,
      lastError,
      message: `Dumped ${saved} messages to Supabase`
    })
  }
  
  const stats = {
    supabaseConnected: !!supabase,
    supabaseUrl: supabaseUrl ? 'configured' : 'missing',
    supabaseKey: supabaseKey ? 'configured' : 'missing',
    inMemoryChats: inMemoryMessages.size,
    totalInMemoryMessages: Array.from(inMemoryMessages.values()).reduce((a, b) => a + b.length, 0),
  }
  return NextResponse.json(stats)
}
