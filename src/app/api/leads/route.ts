import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api-production-d9c1.up.railway.app'
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || 'evolution-api-key-123'
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE || 'crmzap'

// Buscar contatos com nome e foto da Evolution API
async function getContactsFromEvolution(): Promise<Map<string, { name: string | null, photo: string | null }>> {
  const contactsMap = new Map<string, { name: string | null, photo: string | null }>()
  
  try {
    const res = await fetch(`${EVOLUTION_URL}/chat/findContacts/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })
    
    if (res.ok) {
      const contacts = await res.json()
      for (const contact of contacts) {
        if (contact.remoteJid) {
          const name = contact.pushName && contact.pushName !== 'Você' && !/^\d+$/.test(contact.pushName)
            ? contact.pushName 
            : null
          contactsMap.set(contact.remoteJid, {
            name,
            photo: contact.profilePicUrl || null
          })
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch contacts from Evolution:', err)
  }
  
  return contactsMap
}

// Buscar status de leitura de todos os contatos
async function getReadStatusMap(): Promise<Map<string, Date>> {
  const readStatusMap = new Map<string, Date>()
  
  if (!supabase) return readStatusMap
  
  try {
    const { data, error } = await supabase
      .from('read_status')
      .select('remote_jid, last_read_at')
    
    if (error) {
      // Se a tabela não existir, retorna mapa vazio (frontend usa localStorage)
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.log('read_status table not found, using empty map')
        return readStatusMap
      }
      console.error('Read status error:', error)
      return readStatusMap
    }
    
    if (data) {
      for (const row of data) {
        readStatusMap.set(row.remote_jid, new Date(row.last_read_at))
      }
    }
  } catch (err) {
    console.error('Failed to fetch read status:', err)
  }
  
  return readStatusMap
}

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    // Buscar todas as mensagens
    const { data: messages, error } = await supabase
      .from('messages')
      .select('remote_jid, push_name, content, from_me, timestamp')
      .order('timestamp', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Buscar dados auxiliares em paralelo
    const [evolutionContacts, readStatusMap] = await Promise.all([
      getContactsFromEvolution(),
      getReadStatusMap(),
    ])

    // Agrupar por contato
    const contactsMap = new Map<string, {
      id: string
      phone: string
      name: string
      lastMessage: string
      lastMessageAt: string
      unreadCount: number
      profilePicUrl: string | null
    }>()

    for (const msg of messages || []) {
      const jid = msg.remote_jid
      if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') continue
      if (jid.endsWith('@lid')) continue
      if (jid.includes('test@') || jid === '0' || jid.startsWith('0@') || !jid.includes('@')) continue
      
      const phoneNum = jid.replace('@s.whatsapp.net', '')
      if (phoneNum.length < 8) continue
      
      const phone = jid.replace('@s.whatsapp.net', '').replace('@lid', '')
      const msgTimestamp = new Date(msg.timestamp)
      const lastReadAt = readStatusMap.get(jid)
      
      // Verificar se mensagem é não lida (recebida após última leitura)
      const isUnread = !msg.from_me && (!lastReadAt || msgTimestamp > lastReadAt)
      
      if (!contactsMap.has(jid)) {
        const evolutionData = evolutionContacts.get(jid)
        let contactName = phone
        
        if (evolutionData?.name) {
          contactName = evolutionData.name
        } else if (!msg.from_me && msg.push_name && msg.push_name !== 'Você' && !/^\d+$/.test(msg.push_name)) {
          contactName = msg.push_name
        }
        
        contactsMap.set(jid, {
          id: jid,
          phone: phone,
          name: contactName,
          lastMessage: msg.content || '',
          lastMessageAt: msg.timestamp,
          unreadCount: isUnread ? 1 : 0,
          profilePicUrl: evolutionData?.photo || null
        })
      } else {
        const contact = contactsMap.get(jid)!
        
        // Atualizar nome se encontrar um nome real
        if (!msg.from_me && msg.push_name && msg.push_name !== 'Você' && !/^\d+$/.test(msg.push_name) && contact.name === contact.phone) {
          contact.name = msg.push_name
        }
        
        // Incrementar unread apenas se for mensagem não lida
        if (isUnread) {
          contact.unreadCount++
        }
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
