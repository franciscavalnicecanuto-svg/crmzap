import { NextRequest, NextResponse } from 'next/server'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api-production-d9c1.up.railway.app'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '066CC5A7-FBDD-4BCC-98C4-48567F198CF9'
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'crmzap'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const chatId = searchParams.get('chatId')
  const limit = parseInt(searchParams.get('limit') || '50')

  if (!chatId) {
    return NextResponse.json(
      { error: 'chatId é obrigatório' },
      { status: 400 }
    )
  }

  try {
    // Get messages from Evolution API
    const response = await fetch(
      `${EVOLUTION_API_URL}/chat/fetchMessages/${INSTANCE_NAME}`,
      {
        method: 'POST',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          where: {
            key: {
              remoteJid: chatId,
            },
          },
          limit,
        }),
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Evolution API error:', error)
      return NextResponse.json(
        { error: 'Falha ao buscar mensagens', details: error },
        { status: response.status }
      )
    }

    const messages = await response.json()
    
    // Transform to our format
    const formattedMessages = messages.map((msg: any) => ({
      id: msg.key?.id || msg.id,
      chatId: msg.key?.remoteJid || chatId,
      body: msg.message?.conversation || 
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption ||
            '[Mídia]',
      timestamp: msg.messageTimestamp ? new Date(msg.messageTimestamp * 1000).toISOString() : null,
      fromMe: msg.key?.fromMe || false,
      type: msg.message?.imageMessage ? 'image' :
            msg.message?.videoMessage ? 'video' :
            msg.message?.audioMessage ? 'audio' :
            msg.message?.documentMessage ? 'document' :
            'text',
      sender: msg.key?.fromMe ? 'me' : msg.pushName || msg.key?.remoteJid?.split('@')[0] || 'Desconhecido',
    }))

    // Sort by timestamp (oldest first for chat display)
    formattedMessages.sort((a: any, b: any) => {
      if (!a.timestamp) return -1
      if (!b.timestamp) return 1
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    })

    return NextResponse.json({
      messages: formattedMessages,
      total: formattedMessages.length,
    })
  } catch (error: any) {
    console.error('Messages error:', error)
    return NextResponse.json(
      { error: 'Erro ao conectar com Evolution API', details: error.message },
      { status: 500 }
    )
  }
}
