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

// ============ BUG #10 FIX: Retry with exponential backoff ============
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 100, maxDelayMs = 2000 } = options
  let lastError: any
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      // Don't retry on client errors (4xx) - only on server/network errors
      if (error?.status >= 400 && error?.status < 500) {
        throw error
      }
      
      if (attempt < maxAttempts) {
        // Exponential backoff with jitter
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs)
        const jitter = delay * 0.2 * Math.random() // Add 0-20% jitter
        console.log(`[Webhook] Retry attempt ${attempt}/${maxAttempts} after ${Math.round(delay + jitter)}ms`)
        await new Promise(resolve => setTimeout(resolve, delay + jitter))
      }
    }
  }
  
  throw lastError
}

// Helper para parsear timestamp
function parseTimestamp(ts: any): string {
  if (!ts) return new Date().toISOString()
  
  // Se for número (unix timestamp em segundos)
  if (typeof ts === 'number') {
    // Se for muito grande, provavelmente está em milissegundos
    if (ts > 9999999999) {
      return new Date(ts).toISOString()
    }
    return new Date(ts * 1000).toISOString()
  }
  
  // Se for string numérica
  if (typeof ts === 'string' && /^\d+$/.test(ts)) {
    const num = parseInt(ts, 10)
    if (num > 9999999999) {
      return new Date(num).toISOString()
    }
    return new Date(num * 1000).toISOString()
  }
  
  // Se for objeto com low/high (protobuf Long)
  if (typeof ts === 'object' && ts !== null) {
    if ('low' in ts) {
      // Converter Long para número
      const low = ts.low >>> 0
      const high = ts.high >>> 0
      const num = high * 4294967296 + low
      return new Date(num * 1000).toISOString()
    }
  }
  
  // Tentar parsear como string ISO
  try {
    const date = new Date(ts)
    if (!isNaN(date.getTime())) {
      return date.toISOString()
    }
  } catch (e) {}
  
  // Fallback
  return new Date().toISOString()
}

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
  
  // Parsear timestamp com função robusta
  const timestamp = parseTimestamp(message.messageTimestamp)
  
  // Tentar salvar no Supabase com retry (BUG #10 fix)
  if (supabase) {
    const record = {
      id: msgId,
      instance_id: message.instanceId || 'crmzap',
      remote_jid: chatId,
      from_me: message.key?.fromMe || false,
      message_type: message.messageType || 'text',
      content: content,
      push_name: message.pushName || null,
      timestamp: timestamp,
      raw_data: message,
    }
    
    try {
      await withRetry(async () => {
        const { error } = await supabase.from('messages').upsert(record, { onConflict: 'id' })
        
        if (error) {
          console.error('[Webhook] Supabase error:', JSON.stringify(error))
          // Throw to trigger retry on specific error codes
          if (error.code === 'PGRST503' || error.code === '57P01' || error.message?.includes('connection')) {
            throw { ...error, status: 503 } // Server error - will retry
          }
          // Don't retry on other errors (constraint violations, etc)
          console.error('[Webhook] Record was:', JSON.stringify(record).slice(0, 500))
          return // Exit without throwing - won't retry
        }
        
        console.log(`[Webhook] Saved message ${msgId} to Supabase`)
      }, { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 2000 })
      
      return true
    } catch (err: any) {
      console.error('[Webhook] Supabase failed after retries:', err?.message || err)
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
    
    // Validar payload básico
    if (!payload || typeof payload !== 'object') {
      console.warn('[Webhook] Invalid payload: not an object')
      return NextResponse.json(
        { success: false, error: 'Invalid payload' },
        { status: 400 }
      )
    }
    
    // Validar presença do campo event
    if (!payload.event || typeof payload.event !== 'string') {
      console.warn('[Webhook] Missing or invalid event field:', payload)
      return NextResponse.json(
        { success: false, error: 'Missing or invalid event field' },
        { status: 400 }
      )
    }
    
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
      timestamp: parseTimestamp(msg.messageTimestamp),
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
            timestamp: parseTimestamp(msg.messageTimestamp),
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
