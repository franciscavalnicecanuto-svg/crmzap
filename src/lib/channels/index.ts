/**
 * CRMZap - Channels Module
 * 
 * Exporta todos os tipos, manager e adapters
 */

// Tipos
export * from './types'

// Manager
export { channelManager, default as ChannelManager } from './manager'

// Adapters
export { WhatsAppAdapter } from './adapters/whatsapp'
export type { WhatsAppConfig } from './adapters/whatsapp'

export { TelegramAdapter } from './adapters/telegram'
export type { TelegramConfig } from './adapters/telegram'

// Inicialização dos adapters
import { channelManager } from './manager'
import { WhatsAppAdapter } from './adapters/whatsapp'
import { TelegramAdapter } from './adapters/telegram'

/**
 * Inicializa e registra todos os adapters disponíveis
 */
export function initializeChannels(): void {
  // Registrar WhatsApp (Evolution API)
  channelManager.registerAdapter(new WhatsAppAdapter())
  
  // Registrar Telegram
  channelManager.registerAdapter(new TelegramAdapter())
  
  // Futuros adapters:
  // channelManager.registerAdapter(new FacebookAdapter())
  // channelManager.registerAdapter(new InstagramAdapter())
  // channelManager.registerAdapter(new WebChatAdapter())
  
  console.log('[Channels] Adapters inicializados:', 
    channelManager.listAdapters().map(a => a.name).join(', ')
  )
}
