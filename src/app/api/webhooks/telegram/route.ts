/**
 * CRMZap - Telegram Webhook
 * 
 * POST /api/webhooks/telegram
 * Recebe updates do Telegram Bot API
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
    
    // Configurar Telegram se o token existir
    if (process.env.TELEGRAM_BOT_TOKEN) {
      channelManager.configureChannel('telegram', {
        enabled: true,
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
      })
    }
    
    initialized = true
  }
}

export async function POST(request: NextRequest) {
  ensureInitialized()
  
  try {
    const payload = await request.json()
    
    console.log('[Webhook/Telegram] Update recebido:', payload.update_id)

    // Verificar secret token se configurado
    const signature = request.headers.get('x-telegram-bot-api-secret-token') || undefined

    // Processar via ChannelManager
    const message = await channelManager.handleWebhook('telegram', payload, signature)

    if (message) {
      console.log('[Webhook/Telegram] Mensagem processada:', {
        id: message.id,
        from: message.sender.name,
        type: message.type,
        content: message.content.text?.substring(0, 50),
      })

      // TODO: Salvar no banco de dados
      // TODO: Enviar para Chatwoot
      // TODO: Notificar frontend via WebSocket
    }

    // Telegram espera 200 OK
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[Webhook/Telegram] Erro:', error)
    // Mesmo com erro, retorna 200 para o Telegram não reenviar
    return NextResponse.json({ ok: true })
  }
}

// GET para verificação
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    channel: 'telegram',
    message: 'Webhook endpoint ativo' 
  })
}
