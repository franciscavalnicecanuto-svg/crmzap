/**
 * Meta OAuth - Initiate Flow
 * GET /api/auth/meta?platform=facebook|instagram
 * 
 * Redirects user to Facebook OAuth dialog
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const META_API_VERSION = 'v18.0'

// These come from environment variables (set in Vercel)
const APP_ID = process.env.META_APP_ID!
const REDIRECT_URI = process.env.NEXT_PUBLIC_URL 
  ? `${process.env.NEXT_PUBLIC_URL}/api/auth/meta/callback`
  : 'http://localhost:3000/api/auth/meta/callback'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform') || 'facebook'
  
  // Scopes for Facebook Pages
  // Note: pages_messaging requires Messenger product to be enabled in Meta App
  // Note: instagram_* requires Instagram API product to be enabled
  const baseScopes = [
    'pages_show_list',           // List user's pages (always available)
    'pages_read_engagement',     // Read page data (always available)
  ]
  
  // These scopes require products to be enabled in Meta App Dashboard
  // Go to: App Dashboard → Add Products → Messenger/Instagram
  const messengerScopes = [
    'pages_messaging',           // Send/receive messages (requires Messenger product)
    'pages_manage_metadata',     // Manage page settings (requires Messenger product)
  ]
  
  const instagramScopes = [
    'instagram_basic',           // Basic Instagram access
    'instagram_manage_messages', // Instagram DMs
  ]
  
  // Build scope list based on platform
  // For now, include all - Meta will ignore unavailable ones in dev mode
  const scopes = [
    ...baseScopes,
    ...messengerScopes,
    ...(platform === 'instagram' ? instagramScopes : []),
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
