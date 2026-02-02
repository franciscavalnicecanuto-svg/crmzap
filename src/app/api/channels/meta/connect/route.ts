/**
 * Meta Channel Connect - Create Chatwoot Inbox
 * POST /api/channels/meta/connect
 * 
 * Creates a Facebook/Instagram inbox in Chatwoot using the page access token
 */

import { NextRequest, NextResponse } from 'next/server'

const CHATWOOT_URL = process.env.CHATWOOT_URL || 'https://chatwoot-production-92d9.up.railway.app'
const CHATWOOT_API_KEY = process.env.CHATWOOT_API_KEY!
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || '1'

interface ConnectRequest {
  platform: 'facebook' | 'instagram'
  pageId: string
  pageName: string
  accessToken: string
  instagramAccountId?: string
  instagramUsername?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ConnectRequest = await request.json()
    const { platform, pageId, pageName, accessToken, instagramAccountId, instagramUsername } = body

    if (!pageId || !pageName || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields: pageId, pageName, accessToken' },
        { status: 400 }
      )
    }

    // For Instagram, we need the instagram account id
    if (platform === 'instagram' && !instagramAccountId) {
      return NextResponse.json(
        { error: 'Instagram requires instagramAccountId' },
        { status: 400 }
      )
    }

    // Create inbox in Chatwoot
    const inboxName = platform === 'instagram' 
      ? `Instagram - ${instagramUsername || pageName}`
      : `Messenger - ${pageName}`

    // Chatwoot API to create Facebook/Instagram inbox
    // Note: Chatwoot uses 'facebook' channel type for both Messenger and Instagram
    const chatwootResponse = await fetch(
      `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/inboxes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': CHATWOOT_API_KEY,
        },
        body: JSON.stringify({
          name: inboxName,
          channel: {
            type: 'facebook',
            page_id: pageId,
            page_access_token: accessToken,
            ...(platform === 'instagram' && instagramAccountId ? {
              instagram_id: instagramAccountId,
            } : {}),
          },
        }),
      }
    )

    if (!chatwootResponse.ok) {
      const error = await chatwootResponse.json().catch(() => ({}))
      console.error('[Chatwoot] Failed to create inbox:', error)
      
      // Check if it's a duplicate
      if (error.message?.includes('already') || error.error?.includes('already')) {
        return NextResponse.json({
          success: true,
          message: 'Channel already connected',
          existing: true,
        })
      }
      
      throw new Error(error.message || error.error || 'Failed to create Chatwoot inbox')
    }

    const inbox = await chatwootResponse.json()

    // Subscribe the page to webhooks (for receiving messages)
    // This is done automatically by Chatwoot when creating the inbox,
    // but we can verify it worked
    console.log('[Meta Connect] Created inbox:', inbox.id, inbox.name)

    return NextResponse.json({
      success: true,
      inbox: {
        id: inbox.id,
        name: inbox.name,
        channelId: inbox.channel_id,
      },
      message: `${platform === 'instagram' ? 'Instagram' : 'Facebook Messenger'} conectado com sucesso!`,
    })

  } catch (error: any) {
    console.error('[Meta Connect] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to connect channel' },
      { status: 500 }
    )
  }
}

// Get connected Meta channels from Chatwoot
export async function GET() {
  try {
    const response = await fetch(
      `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/inboxes`,
      {
        headers: {
          'api_access_token': CHATWOOT_API_KEY,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch inboxes')
    }

    const data = await response.json()
    
    // Filter for Facebook/Instagram channels
    const metaChannels = (data.payload || []).filter((inbox: any) => 
      inbox.channel_type === 'Channel::FacebookPage'
    ).map((inbox: any) => ({
      id: inbox.id,
      name: inbox.name,
      type: inbox.channel?.instagram_id ? 'instagram' : 'facebook',
      pageId: inbox.channel?.page_id,
      connected: true,
    }))

    return NextResponse.json({ channels: metaChannels })

  } catch (error: any) {
    console.error('[Meta Channels] Error:', error)
    return NextResponse.json(
      { error: error.message, channels: [] },
      { status: 500 }
    )
  }
}
