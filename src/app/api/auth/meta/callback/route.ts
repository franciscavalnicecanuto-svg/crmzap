/**
 * Meta OAuth Callback
 * GET /api/auth/meta/callback?code=...&state=...
 * 
 * Exchanges code for tokens, gets pages, returns to frontend
 */

import { NextRequest, NextResponse } from 'next/server'

const META_API_VERSION = 'v18.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

const APP_ID = process.env.META_APP_ID!
const APP_SECRET = process.env.META_APP_SECRET!
const REDIRECT_URI = process.env.NEXT_PUBLIC_URL 
  ? `${process.env.NEXT_PUBLIC_URL}/api/auth/meta/callback`
  : 'http://localhost:3000/api/auth/meta/callback'

interface PageData {
  id: string
  name: string
  access_token: string
  category?: string
  instagram_business_account?: {
    id: string
    username?: string
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const stateB64 = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    const errorDesc = searchParams.get('error_description') || 'Unknown error'
    return redirectWithError(errorDesc)
  }

  if (!code || !stateB64) {
    return redirectWithError('Missing code or state')
  }

  try {
    // Decode state
    const state = JSON.parse(Buffer.from(stateB64, 'base64').toString())
    const platform = state.platform || 'facebook'

    // Exchange code for access token
    const tokenResponse = await fetch(
      `${META_API_BASE}/oauth/access_token?` + new URLSearchParams({
        client_id: APP_ID,
        client_secret: APP_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
      })
    )

    if (!tokenResponse.ok) {
      const err = await tokenResponse.json()
      throw new Error(err.error?.message || 'Failed to get access token')
    }

    const { access_token: userToken } = await tokenResponse.json()

    // Exchange for long-lived token (60 days instead of 1 hour)
    const longLivedResponse = await fetch(
      `${META_API_BASE}/oauth/access_token?` + new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: APP_ID,
        client_secret: APP_SECRET,
        fb_exchange_token: userToken,
      })
    )

    const { access_token: longLivedToken } = await longLivedResponse.json()

    // Get user's pages with page tokens
    const pagesResponse = await fetch(
      `${META_API_BASE}/me/accounts?` + new URLSearchParams({
        access_token: longLivedToken,
        fields: 'id,name,access_token,category,instagram_business_account{id,username}',
      })
    )

    if (!pagesResponse.ok) {
      throw new Error('Failed to fetch pages')
    }

    const pagesData = await pagesResponse.json()
    const pages: PageData[] = pagesData.data || []

    if (pages.length === 0) {
      return redirectWithError('No Facebook Pages found. You need a Facebook Page to use this feature.')
    }

    // Return to frontend with page data
    const resultData = {
      success: true,
      platform,
      pages: pages.map(p => ({
        id: p.id,
        name: p.name,
        accessToken: p.access_token,
        category: p.category,
        instagramAccount: p.instagram_business_account ? {
          id: p.instagram_business_account.id,
          username: p.instagram_business_account.username,
        } : null,
      })),
    }

    // Redirect to frontend with data in URL (will be handled by frontend)
    const callbackUrl = new URL('/connect', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000')
    callbackUrl.searchParams.set('meta_auth', Buffer.from(JSON.stringify(resultData)).toString('base64'))

    return NextResponse.redirect(callbackUrl)

  } catch (error: any) {
    console.error('[Meta OAuth] Error:', error)
    return redirectWithError(error.message || 'OAuth failed')
  }
}

function redirectWithError(message: string) {
  const callbackUrl = new URL('/connect', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000')
  callbackUrl.searchParams.set('meta_error', encodeURIComponent(message))
  return NextResponse.redirect(callbackUrl)
}
