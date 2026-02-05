import { NextRequest, NextResponse } from 'next/server'

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api-production-d9c1.up.railway.app'
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || 'evolution-api-key-123'
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE || 'crmzap'

// BUG #1 FIX: Create /api/channels route
// BUG #7 FIX: Check real Evolution API status

async function checkEvolutionStatus(): Promise<{
  connected: boolean
  state: string
  error?: string
}> {
  try {
    const response = await fetch(
      `${EVOLUTION_URL}/instance/connectionState/${INSTANCE_NAME}`,
      {
        headers: { 'apikey': EVOLUTION_KEY },
        // Short timeout to avoid blocking
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!response.ok) {
      return {
        connected: false,
        state: 'error',
        error: `HTTP ${response.status}`,
      }
    }

    const data = await response.json()
    const state = data.instance?.state || data.state || 'unknown'
    const connected = state === 'open' || state === 'connected'

    return { connected, state }
  } catch (error: any) {
    return {
      connected: false,
      state: 'error',
      error: error?.message || 'Connection failed',
    }
  }
}

export async function GET(request: NextRequest) {
  // Check Evolution API status
  const evolutionStatus = await checkEvolutionStatus()

  const channels = [
    {
      type: 'evolution',
      name: 'WhatsApp (Evolution)',
      icon: '💬',
      enabled: true,
      status: {
        connected: evolutionStatus.connected,
        state: evolutionStatus.state,
        error: evolutionStatus.error || null,
      },
    },
    {
      type: 'telegram',
      name: 'Telegram',
      icon: '✈️',
      enabled: false,
      status: {
        connected: false,
        error: 'Não configurado',
      },
    },
    {
      type: 'instagram',
      name: 'Instagram',
      icon: '📸',
      enabled: false,
      status: {
        connected: false,
        error: 'Não configurado',
      },
    },
  ]

  const connectedCount = channels.filter(c => c.status.connected).length
  const enabledCount = channels.filter(c => c.enabled).length

  return NextResponse.json({
    success: true,
    channels,
    summary: {
      total: channels.length,
      connected: connectedCount,
      enabled: enabledCount,
    },
  })
}
