import { NextResponse } from 'next/server'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api-production-d9c1.up.railway.app'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '066CC5A7-FBDD-4BCC-98C4-48567F198CF9'
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'crmzap'

export async function POST() {
  try {
    // Get all chats from Evolution API (POST request)
    const response = await fetch(
      `${EVOLUTION_API_URL}/chat/findChats/${INSTANCE_NAME}`,
      {
        method: 'POST',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: 'Falha ao buscar conversas', details: error },
        { status: response.status }
      )
    }

    const chats = await response.json()
    
    // Filter only individual chats (not groups)
    const individualChats = chats.filter((chat: any) => 
      chat.id && !chat.id.includes('@g.us')
    )

    // Transform to leads format
    const leads = individualChats.map((chat: any) => {
      const phone = chat.id?.split('@')[0] || ''
      return {
        id: `wa_${phone}`,
        name: chat.name || phone,
        phone: phone,
        whatsappId: chat.id,
        lastMessage: chat.lastMessage?.body || '',
        lastMessageTime: chat.lastMessage?.timestamp ? 
          new Date(chat.lastMessage.timestamp * 1000).toISOString() : null,
        unreadCount: chat.unreadCount || 0,
        profilePicUrl: chat.profilePicUrl || null,
        source: 'whatsapp',
        status: 'novo',
        tags: ['whatsapp'],
        createdAt: new Date().toISOString(),
      }
    })

    // Sort by last message time (most recent first)
    leads.sort((a: any, b: any) => {
      if (!a.lastMessageTime) return 1
      if (!b.lastMessageTime) return -1
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    })

    return NextResponse.json({
      success: true,
      leads,
      total: leads.length,
      message: `${leads.length} conversas encontradas para importar`,
    })
  } catch (error: any) {
    console.error('Import chats error:', error)
    return NextResponse.json(
      { error: 'Erro ao importar conversas', details: error.message },
      { status: 500 }
    )
  }
}
