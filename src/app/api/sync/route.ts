import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api-production-d9c1.up.railway.app'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '066CC5A7-FBDD-4BCC-98C4-48567F198CF9'
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'crmzap'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    // Buscar todas mensagens da Evolution API
    const response = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        where: {},
        limit: 1000, // Máximo possível
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error: 'Failed to fetch from Evolution', details: error }, { status: 500 })
    }

    const data = await response.json()
    const messages = data.messages?.records || []

    let saved = 0
    let errors = 0

    for (const msg of messages) {
      try {
        const { error } = await supabase.from('messages').upsert({
          id: msg.key?.id,
          instance_id: INSTANCE_NAME,
          remote_jid: msg.key?.remoteJid,
          from_me: msg.key?.fromMe || false,
          message_type: msg.messageType || 'text',
          content: msg.message?.conversation || 
                   msg.message?.extendedTextMessage?.text ||
                   '[mídia]',
          push_name: msg.pushName,
          timestamp: msg.messageTimestamp 
            ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
            : new Date().toISOString(),
          raw_data: msg,
        }, { onConflict: 'id' })

        if (error) {
          console.error('Supabase upsert error:', error)
          errors++
        } else {
          saved++
        }
      } catch (e) {
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      total: messages.length,
      saved,
      errors,
    })
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/sync',
    method: 'POST',
    description: 'Sincroniza mensagens da Evolution API para o Supabase'
  })
}
