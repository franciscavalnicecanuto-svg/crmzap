/**
 * CRMZap - WhatsApp Webhook (Evolution API)
 * 
 * POST /api/webhooks/whatsapp
 * Recebe eventos da Evolution API
 */

import { NextRequest, NextResponse } from 'next/server'
import { channelManager, initializeChannels } from '@/lib/channels'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Inicializar channels na primeira requisição
let initialized = false
function ensureInitialized() {
  if (!initialized) {
    initializeChannels()
    
    // Configurar WhatsApp se as env vars existirem
    if (process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY) {
      channelManager.configureChannel('whatsapp', {
        enabled: true,
        evolutionApiUrl: process.env.EVOLUTION_API_URL,
        evolutionApiKey: process.env.EVOLUTION_API_KEY,
        instanceName: process.env.EVOLUTION_INSTANCE || 'crmzap',
        webhookSecret: process.env.EVOLUTION_WEBHOOK_SECRET,
      })
    }
    
    initialized = true
  }
}

export async function POST(request: NextRequest) {
  ensureInitialized()
  
  try {
    const payload = await request.json()
    
    console.log('[Webhook/WhatsApp] Evento recebido:', payload.event)

    // Verificar header de autenticação se configurado
    const signature = request.headers.get('x-webhook-secret') || undefined

    // Processar via ChannelManager
    const message = await channelManager.handleWebhook('whatsapp', payload, signature)

    if (message) {
      console.log('[Webhook/WhatsApp] Mensagem processada:', {
        id: message.id,
        from: message.sender.name,
        type: message.type,
        content: message.content.text?.substring(0, 50),
      })

      // TODO: Salvar no banco de dados
      // TODO: Enviar para Chatwoot
      // TODO: Notificar frontend via WebSocket
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Webhook/WhatsApp] Erro:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// GET para verificação de webhook (alguns serviços usam)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('challenge') || searchParams.get('hub.challenge')
  
  if (challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  
  return NextResponse.json({ 
    status: 'ok', 
    channel: 'whatsapp',
    message: 'Webhook endpoint ativo' 
  })
}
