import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    // Buscar contatos únicos que têm mensagens, com última mensagem
    const { data: messages, error } = await supabase
      .from('messages')
      .select('remote_jid, push_name, content, from_me, timestamp')
      .order('timestamp', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Agrupar por contato e pegar info mais recente
    const contactsMap = new Map<string, {
      id: string
      phone: string
      name: string
      lastMessage: string
      lastMessageAt: string
      unreadCount: number
    }>()

    for (const msg of messages || []) {
      const jid = msg.remote_jid
      if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') continue // Ignorar grupos e status
      
      const phone = jid.replace('@s.whatsapp.net', '')
      
      if (!contactsMap.has(jid)) {
        contactsMap.set(jid, {
          id: jid,
          phone: phone,
          name: msg.push_name || phone,
          lastMessage: msg.content || '',
          lastMessageAt: msg.timestamp,
          unreadCount: msg.from_me ? 0 : 1
        })
      } else if (!msg.from_me) {
        // Incrementar unread se não for mensagem enviada
        const contact = contactsMap.get(jid)!
        contact.unreadCount++
      }
    }

    const contacts = Array.from(contactsMap.values())
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

    return NextResponse.json({
      success: true,
      contacts,
      total: contacts.length
    })
  } catch (error: any) {
    console.error('Error fetching leads:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
