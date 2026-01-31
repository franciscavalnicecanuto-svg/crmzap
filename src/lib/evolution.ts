// Evolution API Integration
// Docs: https://doc.evolution-api.com

import axios from 'axios'

export interface EvolutionConfig {
  baseUrl: string
  apiKey: string
  instanceName: string
}

export interface Message {
  id: string
  from: string
  to: string
  body: string
  timestamp: number
  fromMe: boolean
  type: 'text' | 'image' | 'audio' | 'video' | 'document'
}

export interface Contact {
  id: string
  name: string
  phone: string
  profilePicUrl?: string
}

export interface ConnectionState {
  state: 'open' | 'connecting' | 'close'
  qrcode?: string
}

class EvolutionAPI {
  private config: EvolutionConfig | null = null
  
  configure(config: EvolutionConfig) {
    this.config = config
  }
  
  private get headers() {
    return {
      'Content-Type': 'application/json',
      'apikey': this.config?.apiKey || '',
    }
  }
  
  private get baseUrl() {
    return `${this.config?.baseUrl}/instance`
  }
  
  // Create instance
  async createInstance(instanceName: string): Promise<{ qrcode: string }> {
    const response = await axios.post(
      `${this.config?.baseUrl}/instance/create`,
      {
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      },
      { headers: this.headers }
    )
    return response.data
  }
  
  // Get QR Code
  async getQRCode(): Promise<{ qrcode: string } | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/connect/${this.config?.instanceName}`,
        { headers: this.headers }
      )
      return response.data
    } catch {
      return null
    }
  }
  
  // Check connection state
  async getConnectionState(): Promise<ConnectionState> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/connectionState/${this.config?.instanceName}`,
        { headers: this.headers }
      )
      return response.data
    } catch {
      return { state: 'close' }
    }
  }
  
  // Send text message
  async sendText(to: string, text: string): Promise<Message> {
    const response = await axios.post(
      `${this.config?.baseUrl}/message/sendText/${this.config?.instanceName}`,
      {
        number: to,
        text,
      },
      { headers: this.headers }
    )
    return response.data
  }
  
  // Fetch messages from a chat
  async fetchMessages(chatId: string, limit = 50): Promise<Message[]> {
    try {
      const response = await axios.post(
        `${this.config?.baseUrl}/chat/fetchMessages/${this.config?.instanceName}`,
        {
          where: {
            key: {
              remoteJid: chatId,
            },
          },
          limit,
        },
        { headers: this.headers }
      )
      return response.data
    } catch {
      return []
    }
  }
  
  // Get all chats
  async fetchChats(): Promise<Contact[]> {
    try {
      const response = await axios.get(
        `${this.config?.baseUrl}/chat/findChats/${this.config?.instanceName}`,
        { headers: this.headers }
      )
      return response.data.map((chat: any) => ({
        id: chat.id,
        name: chat.name || chat.id.split('@')[0],
        phone: chat.id.split('@')[0],
        profilePicUrl: chat.profilePicUrl,
      }))
    } catch {
      return []
    }
  }
  
  // Get profile picture
  async getProfilePic(number: string): Promise<string | null> {
    try {
      const response = await axios.post(
        `${this.config?.baseUrl}/chat/fetchProfilePictureUrl/${this.config?.instanceName}`,
        { number },
        { headers: this.headers }
      )
      return response.data.profilePictureUrl
    } catch {
      return null
    }
  }
  
  // Logout/disconnect
  async logout(): Promise<void> {
    await axios.delete(
      `${this.baseUrl}/logout/${this.config?.instanceName}`,
      { headers: this.headers }
    )
  }
}

export const evolutionApi = new EvolutionAPI()

// Store config in localStorage
export function saveEvolutionConfig(config: EvolutionConfig) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('evolution-config', JSON.stringify(config))
    evolutionApi.configure(config)
  }
}

export function loadEvolutionConfig(): EvolutionConfig | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('evolution-config')
    if (stored) {
      const config = JSON.parse(stored)
      evolutionApi.configure(config)
      return config
    }
  }
  return null
}
