/**
 * Send Message via Meta (Facebook/Instagram)
 * POST /api/channels/meta/send
 */

import { NextRequest, NextResponse } from 'next/server'

const META_API_VERSION = 'v18.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

interface SendRequest {
  platform: 'facebook' | 'instagram'
  pageAccessToken: string
  pageId: string
  recipientId: string
  message: {
    text?: string
    attachment?: {
      type: 'image' | 'video' | 'audio' | 'file'
      url: string
    }
  }
  instagramAccountId?: string // Required for Instagram
}

export async function POST(request: NextRequest) {
  try {
    const body: SendRequest = await request.json()
    const { platform, pageAccessToken, pageId, recipientId, message, instagramAccountId } = body

    if (!pageAccessToken || !recipientId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Build endpoint URL based on platform
    const endpoint = platform === 'instagram' && instagramAccountId
      ? `${META_API_BASE}/${instagramAccountId}/messages`
      : `${META_API_BASE}/${pageId}/messages`

    // Build message payload
    let messagePayload: any = {
      recipient: { id: recipientId },
    }

    if (message.attachment) {
      messagePayload.message = {
        attachment: {
          type: message.attachment.type,
          payload: {
            url: message.attachment.url,
            is_reusable: true,
          },
        },
      }
    } else if (message.text) {
      messagePayload.message = { text: message.text }
    }

    // Send to Meta API
    const response = await fetch(`${endpoint}?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messagePayload),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('[Meta Send] Error:', result)
      return NextResponse.json(
        { error: result.error?.message || 'Failed to send message' },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.message_id,
      recipientId: result.recipient_id,
    })

  } catch (error: any) {
    console.error('[Meta Send] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: 500 }
    )
  }
}
