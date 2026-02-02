/**
 * Meta Webhook Handler
 * 
 * GET  /api/webhooks/meta - Webhook verification (Meta calls this during setup)
 * POST /api/webhooks/meta - Receive messages/events from Meta
 */

import { NextRequest, NextResponse } from 'next/server'

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'crmzap_verify_token_2024'

// GET - Webhook verification (called by Meta during setup)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Meta Webhook] Verified successfully')
    return new NextResponse(challenge, { status: 200 })
  }

  console.log('[Meta Webhook] Verification failed')
  return new NextResponse('Forbidden', { status: 403 })
}

// POST - Receive incoming messages/events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('[Meta Webhook] Received:', JSON.stringify(body, null, 2))

    // Process each entry
    const entries = body.entry || []
    
    for (const entry of entries) {
      const pageId = entry.id
      
      // Facebook Messenger messages
      if (entry.messaging) {
        for (const event of entry.messaging) {
          await processMessengerEvent(pageId, event)
        }
      }

      // Instagram messages (via changes)
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            await processInstagramEvent(pageId, change.value)
          }
        }
      }
    }

    // Meta requires 200 response within 20 seconds
    return NextResponse.json({ status: 'ok' })

  } catch (error) {
    console.error('[Meta Webhook] Error:', error)
    // Still return 200 to prevent Meta from retrying
    return NextResponse.json({ status: 'error' })
  }
}

async function processMessengerEvent(pageId: string, event: any) {
  const senderId = event.sender?.id
  const recipientId = event.recipient?.id
  const timestamp = event.timestamp

  // Message received
  if (event.message) {
    const message = {
      id: event.message.mid,
      platform: 'facebook',
      pageId,
      senderId,
      text: event.message.text,
      attachments: event.message.attachments,
      timestamp: new Date(timestamp),
      isEcho: event.message.is_echo || false,
    }

    console.log('[Facebook] Message:', message)
    
    // TODO: Store in database and notify frontend via websocket/SSE
    // For now, just log
  }

  // Message delivered
  if (event.delivery) {
    console.log('[Facebook] Delivered:', event.delivery.mids)
  }

  // Message read
  if (event.read) {
    console.log('[Facebook] Read at:', event.read.watermark)
  }
}

async function processInstagramEvent(pageId: string, value: any) {
  const message = {
    id: value.id,
    platform: 'instagram',
    pageId,
    senderId: value.from?.id,
    text: value.text,
    timestamp: new Date(value.timestamp),
  }

  console.log('[Instagram] Message:', message)
  
  // TODO: Store in database and notify frontend
}
