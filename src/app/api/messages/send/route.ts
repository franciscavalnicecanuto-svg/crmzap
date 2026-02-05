/**
 * CRMZap - Unified Message Send API
 * 
 * POST /api/messages/send
 * Envia mensagem para qualquer canal de forma unificada
 */

import { NextRequest, NextResponse } from 'next/server'
import { channelManager, initializeChannels, ChannelType } from '@/lib/channels'

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
    
    initialized = true
  }
}

interface SendRequest {
  channel: ChannelType
  to: string                    // Destinatário (phone, chatId, etc)
  type: 'text' | 'image' | 'document' | 'audio' | 'video'
  content: {
    text?: string
    mediaUrl?: string
    caption?: string
    filename?: string
  }
}

export async function POST(request: NextRequest) {
  ensureInitialized()
  
  try {
    const body: SendRequest = await request.json()
    
    // Validar campos obrigatórios
    if (!body.channel || !body.to || !body.type) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: channel, to, type' },
        { status: 400 }
      )
    }

    // Verificar se canal está disponível
    if (!channelManager.hasChannel(body.channel)) {
      return NextResponse.json(
        { success: false, error: `Canal não disponível: ${body.channel}` },
        { status: 400 }
      )
    }

    let result

    switch (body.type) {
      case 'text':
        if (!body.content.text) {
          return NextResponse.json(
            { success: false, error: 'content.text é obrigatório para type=text' },
            { status: 400 }
          )
        }
        result = await channelManager.sendText(body.channel, body.to, body.content.text)
        break

      case 'image':
        if (!body.content.mediaUrl) {
          return NextResponse.json(
            { success: false, error: 'content.mediaUrl é obrigatório para type=image' },
            { status: 400 }
          )
        }
        result = await channelManager.sendImage(
          body.channel, 
          body.to, 
          body.content.mediaUrl, 
          body.content.caption
        )
        break

      case 'document':
        if (!body.content.mediaUrl || !body.content.filename) {
          return NextResponse.json(
            { success: false, error: 'content.mediaUrl e content.filename são obrigatórios' },
            { status: 400 }
          )
        }
        result = await channelManager.sendDocument(
          body.channel, 
          body.to, 
          body.content.mediaUrl, 
          body.content.filename
        )
        break

      case 'audio':
        if (!body.content.mediaUrl) {
          return NextResponse.json(
            { success: false, error: 'content.mediaUrl é obrigatório para type=audio' },
            { status: 400 }
          )
        }
        const adapter = channelManager.getAdapter(body.channel)
        if (adapter) {
          result = await adapter.sendAudio(body.to, body.content.mediaUrl)
        } else {
          result = { success: false, error: 'Adapter não encontrado', timestamp: new Date() }
        }
        break

      case 'video':
        if (!body.content.mediaUrl) {
          return NextResponse.json(
            { success: false, error: 'content.mediaUrl é obrigatório para type=video' },
            { status: 400 }
          )
        }
        const videoAdapter = channelManager.getAdapter(body.channel)
        if (videoAdapter) {
          result = await videoAdapter.sendVideo(body.to, body.content.mediaUrl, body.content.caption)
        } else {
          result = { success: false, error: 'Adapter não encontrado', timestamp: new Date() }
        }
        break

      default:
        return NextResponse.json(
          { success: false, error: `Tipo não suportado: ${body.type}` },
          { status: 400 }
        )
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[API/messages/send] Erro:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
