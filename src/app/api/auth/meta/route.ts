/**
 * Meta OAuth - Initiate Flow
 * GET /api/auth/meta?platform=facebook|instagram
 * 
 * Redirects user to Facebook OAuth dialog
 */

import { NextRequest, NextResponse } from 'next/server'

const META_API_VERSION = 'v18.0'

// These come from environment variables (set in Vercel)
const APP_ID = process.env.META_APP_ID!
const REDIRECT_URI = process.env.NEXT_PUBLIC_URL 
  ? `${process.env.NEXT_PUBLIC_URL}/api/auth/meta/callback`
  : 'http://localhost:3000/api/auth/meta/callback'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform') || 'facebook'
  
  // Scopes needed for messaging
  const scopes = [
    'pages_messaging',           // Send/receive messages
    'pages_manage_metadata',     // Manage page settings
    'pages_read_engagement',     // Read page data
    'pages_show_list',           // List user's pages
    ...(platform === 'instagram' ? [
      'instagram_basic',
      'instagram_manage_messages',
    ] : []),
  ].join(',')

  // State to track which platform and prevent CSRF
  const state = JSON.stringify({
    platform,
    csrf: crypto.randomUUID(),
    timestamp: Date.now(),
  })

  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: REDIRECT_URI,
    scope: scopes,
    response_type: 'code',
    state: Buffer.from(state).toString('base64'),
  })

  const oauthUrl = `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params}`

  return NextResponse.redirect(oauthUrl)
}
