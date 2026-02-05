/**
 * CRMZap - Channel Status API
 * 
 * GET /api/channels/status
 * Retorna status de todos os canais configurados
 * Verifica status real da Evolution API
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
        instanceName: process.env.EVOLUTION_INSTANCE || 'crmzap',
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

/**
 * Verifica status real do WhatsApp na Evolution API
 */
async function getEvolutionRealStatus(): Promise<{
  connected: boolean
  state?: string
  phoneNumber?: string
  error?: string
}> {
  const evolutionUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '')
  const evolutionKey = process.env.EVOLUTION_API_KEY
  const instanceName = process.env.EVOLUTION_INSTANCE || 'crmzap'

  if (!evolutionUrl || !evolutionKey) {
    return { connected: false, error: 'Evolution API não configurada' }
  }

  try {
    // Buscar estado da conexão diretamente
    const response = await fetch(
      `${evolutionUrl}/instance/connectionState/${instanceName}`,
      {
        headers: {
          'apikey': evolutionKey,
          'Content-Type': 'application/json',
        },
        // Timeout de 10 segundos
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[API/channels/status] Evolution error:', response.status, errorText)
      return { 
        connected: false, 
        error: `Evolution API retornou ${response.status}`,
        state: 'error'
      }
    }

    const data = await response.json()
    
    // Evolution retorna: { instance: {...}, state: 'open' | 'close' | 'connecting' }
    const state = data.state || data.instance?.state || 'unknown'
    const isConnected = state === 'open'

    // Tentar pegar info adicional da instância
    let phoneNumber: string | undefined

    if (isConnected) {
      try {
        const infoResponse = await fetch(
          `${evolutionUrl}/instance/fetchInstances`,
          {
            headers: {
              'apikey': evolutionKey,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000),
          }
        )
        
        if (infoResponse.ok) {
          const instances = await infoResponse.json()
          const instance = Array.isArray(instances) 
            ? instances.find((i: any) => i.name === instanceName || i.instanceName === instanceName)
            : instances
            
          if (instance) {
            phoneNumber = instance.ownerJid?.replace('@s.whatsapp.net', '') ||
                         instance.owner?.replace('@s.whatsapp.net', '') ||
                         instance.profilePictureUrl ? 'conectado' : undefined
          }
        }
      } catch (infoErr) {
        // Não é crítico, continua sem o número
        console.warn('[API/channels/status] Could not fetch instance info:', infoErr)
      }
    }

    return {
      connected: isConnected,
      state,
      phoneNumber,
    }
  } catch (error: any) {
    console.error('[API/channels/status] Evolution fetch error:', error)
    return { 
      connected: false, 
      error: error.name === 'TimeoutError' 
        ? 'Timeout ao conectar com Evolution API' 
        : error.message,
      state: 'error'
    }
  }
}

export async function GET() {
  ensureInitialized()
  
  try {
    const adapters = channelManager.listAdapters()
    
    // Buscar status real do WhatsApp diretamente da Evolution API
    const whatsappRealStatus = await getEvolutionRealStatus()
    
    // Buscar status dos outros canais via manager
    const managerStatus = await channelManager.getStatus()
    
    const channels = adapters.map(adapter => {
      // Para WhatsApp, usar o status real da Evolution
      if (adapter.type === 'whatsapp') {
        return {
          type: adapter.type,
          name: adapter.name,
          icon: adapter.icon,
          enabled: channelManager.hasChannel(adapter.type),
          status: {
            connected: whatsappRealStatus.connected,
            state: whatsappRealStatus.state,
            phoneNumber: whatsappRealStatus.phoneNumber,
            error: whatsappRealStatus.error,
            details: {
              instance: process.env.EVOLUTION_INSTANCE || 'crmzap',
              apiUrl: process.env.EVOLUTION_API_URL ? 'configured' : 'missing',
            },
          },
        }
      }
      
      // Outros canais usam o status do manager
      return {
        type: adapter.type,
        name: adapter.name,
        icon: adapter.icon,
        enabled: channelManager.hasChannel(adapter.type),
        status: managerStatus[adapter.type] || { connected: false, error: 'Não configurado' },
      }
    })

    return NextResponse.json({
      success: true,
      channels,
      summary: {
        total: channels.length,
        connected: channels.filter(c => c.status.connected).length,
        enabled: channels.filter(c => c.enabled).length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[API/channels/status] Erro:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
