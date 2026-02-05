import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api-production-d9c1.up.railway.app'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'evolution-api-key-123'
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE || 'crmzap'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// Busca mensagens de AMBAS as fontes e faz merge
// Evolution API (mensagens recentes) + Supabase (histórico)
// BUG #12 FIX: Adicionado suporte a paginação (offset)
export async function POST(request: NextRequest) {
  try {
    const { phone, limit = 100, offset = 0 } = await request.json()

    if (!phone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\D/g, '')
    const remoteJid = `${cleanPhone}@s.whatsapp.net`

    // Map para deduplicar por ID
    const messagesMap = new Map<string, {
      id: string
      text: string
      fromMe: boolean
      timestamp: string
    }>()

    // 1. Buscar do Supabase (mensagens mais recentes primeiro, depois reverter)
    if (supabase) {
      const { data: supabaseMessages, error } = await supabase
        .from('messages')
        .select('id, content, from_me, timestamp')
        .eq('remote_jid', remoteJid)
        .order('timestamp', { ascending: false }) // Mais recentes primeiro
        .limit(limit)
      
      if (!error && supabaseMessages) {
        // Reverter para ordem cronológica
        const chronological = [...supabaseMessages].reverse()
        for (const m of chronological) {
          messagesMap.set(m.id, {
            id: m.id,
            text: m.content || '[mídia]',
            fromMe: m.from_me,
            timestamp: m.timestamp
          })
        }
      }
    }

    // 2. Buscar da Evolution API (mensagens mais recentes)
    try {
      const evolutionResponse = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${INSTANCE_NAME}`, {
        method: 'POST',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          where: {
            key: {
              remoteJid: remoteJid
            }
          },
          limit: limit,
        }),
      })

      if (evolutionResponse.ok) {
        const data = await evolutionResponse.json()
        const rawMessages = data.messages?.records || data || []

        // Processar e adicionar/atualizar no map
        for (const msg of rawMessages) {
          const content = msg.message?.conversation ||
                         msg.message?.extendedTextMessage?.text ||
                         msg.message?.imageMessage?.caption ||
                         msg.message?.videoMessage?.caption ||
                         '[mídia]'
          
          let timestamp: string
          const ts = msg.messageTimestamp
          if (typeof ts === 'number') {
            timestamp = ts > 9999999999 
              ? new Date(ts).toISOString() 
              : new Date(ts * 1000).toISOString()
          } else if (typeof ts === 'object' && ts?.low) {
            const num = (ts.high >>> 0) * 4294967296 + (ts.low >>> 0)
            timestamp = new Date(num * 1000).toISOString()
          } else {
            timestamp = new Date().toISOString()
          }

          const msgId = msg.key?.id || `gen_${Date.now()}_${Math.random().toString(36).slice(2)}`
          
          // Evolution sobrescreve Supabase (dados mais frescos)
          messagesMap.set(msgId, {
            id: msgId,
            text: content,
            fromMe: msg.key?.fromMe || false,
            timestamp: timestamp
          })

          // Salvar no Supabase em background
          if (supabase) {
            supabase.from('messages').upsert({
              id: msgId,
              instance_id: INSTANCE_NAME,
              remote_jid: msg.key?.remoteJid || remoteJid,
              from_me: msg.key?.fromMe || false,
              message_type: msg.messageType || 'text',
              content: content,
              push_name: msg.pushName || null,
              timestamp: timestamp,
            }, { onConflict: 'id' })
              .then(({ error }) => {
                if (error) console.error('[Poll] Supabase save error:', error)
              })
          }
        }
      }
    } catch (evolutionError) {
      console.error('[Poll] Evolution API error:', evolutionError)
      // Continua com mensagens do Supabase
    }

    // 3. Converter map para array ordenado por timestamp
    const allMessages = Array.from(messagesMap.values())
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    
    // Aplicar paginação no resultado final (se offset > 0 e não foi aplicado no Supabase)
    const messages = offset > 0 ? allMessages.slice(offset) : allMessages
    const hasMore = allMessages.length >= limit

    return NextResponse.json({
      success: true,
      messages: messages.slice(0, limit),
      source: 'merged',
      total: messages.length,
      // Metadados de paginação (BUG #12 FIX)
      pagination: {
        offset,
        limit,
        hasMore,
        nextOffset: hasMore ? offset + limit : null
      }
    })
  } catch (error: any) {
    console.error('[Poll] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
