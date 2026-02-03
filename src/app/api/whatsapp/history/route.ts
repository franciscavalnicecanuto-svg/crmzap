import { NextRequest, NextResponse } from 'next/server'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api-production-d9c1.up.railway.app'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '066CC5A7-FBDD-4BCC-98C4-48567F198CF9'
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'crmzap'

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone is required' },
        { status: 400 }
      )
    }

    // Clean phone number and format as WhatsApp JID
    const cleanPhone = phone.replace(/\D/g, '')
    const remoteJid = `${cleanPhone}@s.whatsapp.net`

    const response = await fetch(
      `${EVOLUTION_API_URL}/chat/findMessages/${INSTANCE_NAME}`,
      {
        method: 'POST',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          where: {
            key: {
              remoteJid: remoteJid,
            },
          },
          page: 1,
          limit: 50,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: error },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Transform messages to simpler format
    const messages = (data.messages?.records || []).map((msg: any) => ({
      id: msg.key?.id || msg.id,
      text: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '[mídia]',
      fromMe: msg.key?.fromMe || false,
      timestamp: msg.messageTimestamp ? new Date(msg.messageTimestamp * 1000).toISOString() : null,
    }))

    return NextResponse.json({
      success: true,
      messages,
      total: data.messages?.total || 0,
    })
  } catch (error: any) {
    console.error('Fetch history error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error.message },
      { status: 500 }
    )
  }
}
