import { NextResponse } from 'next/server'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api-production-d9c1.up.railway.app'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '066CC5A7-FBDD-4BCC-98C4-48567F198CF9'
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'crmzap'

export async function GET() {
  try {
    // Get all chats from Evolution API
    const response = await fetch(
      `${EVOLUTION_API_URL}/chat/findChats/${INSTANCE_NAME}`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Evolution API error:', error)
      return NextResponse.json(
        { error: 'Falha ao buscar conversas', details: error },
        { status: response.status }
      )
    }

    const chats = await response.json()
    
    // Transform to our format
    const formattedChats = chats.map((chat: any) => ({
      id: chat.id,
      name: chat.name || chat.id?.split('@')[0] || 'Desconhecido',
      phone: chat.id?.split('@')[0] || '',
      lastMessage: chat.lastMessage?.body || '',
      lastMessageTime: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000).toISOString() : null,
      unreadCount: chat.unreadCount || 0,
      profilePicUrl: chat.profilePicUrl || null,
      isGroup: chat.id?.includes('@g.us') || false,
    }))

    // Sort by last message time (most recent first)
    formattedChats.sort((a: any, b: any) => {
      if (!a.lastMessageTime) return 1
      if (!b.lastMessageTime) return -1
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    })

    return NextResponse.json({
      chats: formattedChats,
      total: formattedChats.length,
    })
  } catch (error: any) {
    console.error('Chats error:', error)
    return NextResponse.json(
      { error: 'Erro ao conectar com Evolution API', details: error.message },
      { status: 500 }
    )
  }
}
