/**
 * CRMZap - Channel Manager
 * 
 * Gerencia todos os canais/plugins registrados.
 * Singleton que roteia mensagens para o adapter correto.
 */

import { 
  ChannelAdapter, 
  ChannelType, 
  ChannelConfig,
  ChannelEvent,
  EventHandler,
  Message,
  SendResult,
  WebhookPayload,
  ChannelStatus
} from './types'

class ChannelManager {
  private static instance: ChannelManager
  private adapters: Map<ChannelType, ChannelAdapter> = new Map()
  private configs: Map<ChannelType, ChannelConfig> = new Map()
  private eventHandlers: EventHandler[] = []

  private constructor() {}

  static getInstance(): ChannelManager {
    if (!ChannelManager.instance) {
      ChannelManager.instance = new ChannelManager()
    }
    return ChannelManager.instance
  }

  // ============================================
  // REGISTRO DE ADAPTERS
  // ============================================

  /**
   * Registra um novo adapter de canal
   */
  registerAdapter(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.type, adapter)
    console.log(`[ChannelManager] Adapter registrado: ${adapter.name} (${adapter.type})`)
  }

  /**
   * Remove um adapter
   */
  unregisterAdapter(type: ChannelType): void {
    this.adapters.delete(type)
    this.configs.delete(type)
    console.log(`[ChannelManager] Adapter removido: ${type}`)
  }

  /**
   * Obtém um adapter específico
   */
  getAdapter(type: ChannelType): ChannelAdapter | undefined {
    return this.adapters.get(type)
  }

  /**
   * Lista todos os adapters registrados
   */
  listAdapters(): ChannelAdapter[] {
    return Array.from(this.adapters.values())
  }

  /**
   * Verifica se um canal está disponível
   */
  hasChannel(type: ChannelType): boolean {
    return this.adapters.has(type) && (this.configs.get(type)?.enabled ?? false)
  }

  // ============================================
  // CONFIGURAÇÃO
  // ============================================

  /**
   * Configura um canal
   */
  async configureChannel(type: ChannelType, config: ChannelConfig): Promise<boolean> {
    const adapter = this.adapters.get(type)
    if (!adapter) {
      console.error(`[ChannelManager] Adapter não encontrado: ${type}`)
      return false
    }

    try {
      const valid = await adapter.validateConfig(config)
      if (!valid) {
        console.error(`[ChannelManager] Configuração inválida para: ${type}`)
        return false
      }

      await adapter.configure(config)
      this.configs.set(type, config)
      console.log(`[ChannelManager] Canal configurado: ${type}`)
      return true
    } catch (error) {
      console.error(`[ChannelManager] Erro ao configurar ${type}:`, error)
      return false
    }
  }

  /**
   * Obtém configuração de um canal
   */
  getConfig(type: ChannelType): ChannelConfig | undefined {
    return this.configs.get(type)
  }

  // ============================================
  // WEBHOOKS (ENTRADA)
  // ============================================

  /**
   * Processa webhook de qualquer canal
   */
  async handleWebhook(type: ChannelType, payload: any, signature?: string): Promise<Message | null> {
    const adapter = this.adapters.get(type)
    if (!adapter) {
      console.error(`[ChannelManager] Webhook recebido para canal não registrado: ${type}`)
      return null
    }

    try {
      // Verificar autenticidade
      const valid = await adapter.verifyWebhook(payload, signature)
      if (!valid) {
        console.warn(`[ChannelManager] Webhook inválido para: ${type}`)
        return null
      }

      // Parsear mensagem
      const webhookPayload: WebhookPayload = {
        raw: payload,
        channel: type,
        timestamp: new Date()
      }

      const message = await adapter.parseWebhook(webhookPayload)
      
      if (message) {
        // Emitir evento
        await this.emit({ type: 'message.received', data: message })
      }

      return message
    } catch (error) {
      console.error(`[ChannelManager] Erro ao processar webhook ${type}:`, error)
      return null
    }
  }

  // ============================================
  // ENVIO DE MENSAGENS
  // ============================================

  /**
   * Envia mensagem de texto por qualquer canal
   */
  async sendText(channel: ChannelType, to: string, text: string): Promise<SendResult> {
    const adapter = this.adapters.get(channel)
    if (!adapter) {
      return { success: false, error: `Canal não disponível: ${channel}`, timestamp: new Date() }
    }

    try {
      const result = await adapter.sendText(to, text)
      
      if (result.success) {
        // Emitir evento (criar mensagem para tracking)
        // await this.emit({ type: 'message.sent', data: ... })
      }

      return result
    } catch (error: any) {
      return { success: false, error: error.message, timestamp: new Date() }
    }
  }

  /**
   * Envia imagem por qualquer canal
   */
  async sendImage(channel: ChannelType, to: string, url: string, caption?: string): Promise<SendResult> {
    const adapter = this.adapters.get(channel)
    if (!adapter) {
      return { success: false, error: `Canal não disponível: ${channel}`, timestamp: new Date() }
    }

    return adapter.sendImage(to, url, caption)
  }

  /**
   * Envia documento por qualquer canal
   */
  async sendDocument(channel: ChannelType, to: string, url: string, filename: string): Promise<SendResult> {
    const adapter = this.adapters.get(channel)
    if (!adapter) {
      return { success: false, error: `Canal não disponível: ${channel}`, timestamp: new Date() }
    }

    return adapter.sendDocument(to, url, filename)
  }

  // ============================================
  // IMPORTAÇÃO DE HISTÓRICO
  // ============================================

  /**
   * Importa histórico de conversas de um canal
   */
  async importHistory(channel: ChannelType, contactId: string, limit?: number): Promise<Message[]> {
    const adapter = this.adapters.get(channel)
    if (!adapter || !adapter.fetchHistory) {
      console.warn(`[ChannelManager] Canal ${channel} não suporta importação de histórico`)
      return []
    }

    try {
      return await adapter.fetchHistory(contactId, limit)
    } catch (error) {
      console.error(`[ChannelManager] Erro ao importar histórico de ${channel}:`, error)
      return []
    }
  }

  // ============================================
  // STATUS E HEALTH
  // ============================================

  /**
   * Verifica status de todos os canais
   */
  async getStatus(): Promise<Record<ChannelType, ChannelStatus>> {
    const status: Partial<Record<ChannelType, ChannelStatus>> = {}

    for (const [type, adapter] of this.adapters) {
      try {
        status[type] = await adapter.getStatus()
      } catch (error: any) {
        status[type] = { connected: false, error: error.message }
      }
    }

    return status as Record<ChannelType, ChannelStatus>
  }

  /**
   * Health check de um canal específico
   */
  async healthCheck(type: ChannelType): Promise<boolean> {
    const adapter = this.adapters.get(type)
    if (!adapter) return false
    return adapter.healthCheck()
  }

  // ============================================
  // EVENTOS
  // ============================================

  /**
   * Registra handler de eventos
   */
  onEvent(handler: EventHandler): void {
    this.eventHandlers.push(handler)
  }

  /**
   * Remove handler de eventos
   */
  offEvent(handler: EventHandler): void {
    const index = this.eventHandlers.indexOf(handler)
    if (index > -1) {
      this.eventHandlers.splice(index, 1)
    }
  }

  /**
   * Emite evento para todos os handlers
   */
  private async emit(event: ChannelEvent): Promise<void> {
    for (const handler of this.eventHandlers) {
      try {
        await handler(event)
      } catch (error) {
        console.error('[ChannelManager] Erro em event handler:', error)
      }
    }
  }
}

// Exporta singleton
export const channelManager = ChannelManager.getInstance()
export default channelManager
