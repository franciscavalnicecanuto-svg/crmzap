/**
 * CRMZap - Channel Status API
 * 
 * GET /api/channels/status
 * Retorna status de todos os canais configurados
 */

import { NextResponse } from 'next/server'
import { channelManager, initializeChannels } from '@/lib/channels'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Inicializar channels
let initialized = false
function ensureInitialized() {
  if (!initialized) {
    initializeChannels()
    
    // Configurar canais disponíveis
    if (process.env.EVOLUTION_API_URL) {
      channelManager.configureChannel('whatsapp', {
        enabled: true,
        evolutionApiUrl: process.env.EVOLUTION_API_URL,
        evolutionApiKey: process.env.EVOLUTION_API_KEY!,
        instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'crmzap',
      })
    }
    
    if (process.env.TELEGRAM_BOT_TOKEN) {
      channelManager.configureChannel('telegram', {
        enabled: true,
        botToken: process.env.TELEGRAM_BOT_TOKEN,
      })
    }

    // Meta (Facebook/Instagram) - já configurado em outro lugar
    // WebChat - futuro
    
    initialized = true
  }
}

export async function GET() {
  ensureInitialized()
  
  try {
    const adapters = channelManager.listAdapters()
    const status = await channelManager.getStatus()
    
    const channels = adapters.map(adapter => ({
      type: adapter.type,
      name: adapter.name,
      icon: adapter.icon,
      enabled: channelManager.hasChannel(adapter.type),
      status: status[adapter.type] || { connected: false, error: 'Não configurado' },
    }))

    return NextResponse.json({
      success: true,
      channels,
      summary: {
        total: channels.length,
        connected: channels.filter(c => c.status.connected).length,
        enabled: channels.filter(c => c.enabled).length,
      }
    })
  } catch (error: any) {
    console.error('[API/channels/status] Erro:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
