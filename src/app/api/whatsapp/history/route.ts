import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone is required' },
        { status: 400 }
      )
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    // Clean phone number and format as WhatsApp JID
    const cleanPhone = phone.replace(/\D/g, '')
    const remoteJid = `${cleanPhone}@s.whatsapp.net`

    // Fetch from Supabase - ordered by timestamp ASC (oldest first, newest at bottom)
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, content, from_me, timestamp, push_name')
      .eq('remote_jid', remoteJid)
      .order('timestamp', { ascending: true })
      .limit(100)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: error.message },
        { status: 500 }
      )
    }

    // Transform to expected format
    const formattedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      text: msg.content || '[mídia]',
      fromMe: msg.from_me || false,
      timestamp: msg.timestamp,
    }))

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      total: formattedMessages.length,
    })
  } catch (error: any) {
    console.error('Fetch history error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error.message },
      { status: 500 }
    )
  }
}
