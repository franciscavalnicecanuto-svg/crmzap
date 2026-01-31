import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
  downloadMediaMessage,
  getContentType,
} from 'baileys'
import { Boom } from '@hapi/boom'
import * as QRCode from 'qrcode'
import path from 'path'
import fs from 'fs'
import { EventEmitter } from 'events'
import type { UnifiedMessage, ChannelStatus, Contact, MediaAttachment } from '../types.js'

export class WhatsAppChannel extends EventEmitter {
  private socket: WASocket | null = null
  private accountId: string
  private authDir: string
  private qrCode: string | null = null
  private connected = false

  constructor(accountId: string, authDir?: string) {
    super()
    this.accountId = accountId
    this.authDir = authDir || path.join(process.cwd(), 'auth', 'whatsapp', accountId)
  }

  async connect(): Promise<void> {
    // Ensure auth directory exists
    fs.mkdirSync(this.authDir, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(this.authDir)

    this.socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      // Reduce logging
      logger: {
        level: 'silent',
        child: () => ({ level: 'silent' } as any),
      } as any,
    })

    // Handle connection updates
    this.socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        // Generate QR code as data URL
        this.qrCode = await QRCode.toDataURL(qr)
        this.emitStatus()
      }

      if (connection === 'close') {
        this.connected = false
        const reason = (lastDisconnect?.error as Boom)?.output?.statusCode

        if (reason === DisconnectReason.loggedOut) {
          // Logged out, need to re-authenticate
          this.qrCode = null
          this.emitStatus()
        } else {
          // Reconnect
          setTimeout(() => this.connect(), 3000)
        }
      } else if (connection === 'open') {
        this.connected = true
        this.qrCode = null
        this.emitStatus()
        
        // Fetch contacts
        this.fetchContacts()
      }
    })

    // Save credentials
    this.socket.ev.on('creds.update', saveCreds)

    // Handle incoming messages
    this.socket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return

      for (const msg of messages) {
        // Skip status/broadcast
        if (msg.key.remoteJid?.endsWith('@broadcast') || 
            msg.key.remoteJid === 'status@broadcast') {
          continue
        }

        const unified = await this.toUnifiedMessage(msg)
        if (unified) {
          this.emit('message', unified)
        }
      }
    })
  }

  private async toUnifiedMessage(msg: proto.IWebMessageInfo): Promise<UnifiedMessage | null> {
    if (!msg.key.remoteJid || !msg.message) return null

    const chatId = msg.key.remoteJid
    const fromMe = msg.key.fromMe || false
    const senderId = fromMe 
      ? this.socket?.user?.id.split(':')[0] + '@s.whatsapp.net'
      : (msg.key.participant || chatId)

    // Extract text content
    let text: string | undefined
    const contentType = getContentType(msg.message)
    
    if (contentType === 'conversation') {
      text = msg.message.conversation || undefined
    } else if (contentType === 'extendedTextMessage') {
      text = msg.message.extendedTextMessage?.text || undefined
    } else if (contentType === 'imageMessage') {
      text = msg.message.imageMessage?.caption || undefined
    } else if (contentType === 'videoMessage') {
      text = msg.message.videoMessage?.caption || undefined
    }

    // Extract media
    const media: MediaAttachment[] = []
    if (contentType && ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'].includes(contentType)) {
      const mediaType = contentType.replace('Message', '') as MediaAttachment['type']
      media.push({
        type: mediaType === 'image' ? 'image' : 
              mediaType === 'video' ? 'video' :
              mediaType === 'audio' ? 'audio' :
              mediaType === 'sticker' ? 'sticker' : 'document',
        mimeType: (msg.message as any)[contentType]?.mimetype,
      })
    }

    // Extract reply context
    let replyTo: UnifiedMessage['replyTo']
    const contextInfo = (msg.message as any)[contentType!]?.contextInfo
    if (contextInfo?.quotedMessage) {
      const quotedType = getContentType(contextInfo.quotedMessage)
      replyTo = {
        id: contextInfo.stanzaId,
        text: quotedType === 'conversation' 
          ? contextInfo.quotedMessage.conversation
          : contextInfo.quotedMessage[quotedType!]?.text || contextInfo.quotedMessage[quotedType!]?.caption,
        senderId: contextInfo.participant,
      }
    }

    // Get sender name from contacts
    const senderName = msg.pushName || senderId.split('@')[0]

    return {
      id: msg.key.id!,
      channel: 'whatsapp',
      accountId: this.accountId,
      chatId,
      senderId,
      senderName,
      text,
      media: media.length > 0 ? media : undefined,
      timestamp: new Date((msg.messageTimestamp as number) * 1000),
      fromMe,
      replyTo,
      raw: msg,
    }
  }

  async sendMessage(chatId: string, text?: string, media?: MediaAttachment[], replyTo?: string): Promise<string> {
    if (!this.socket || !this.connected) {
      throw new Error('WhatsApp not connected')
    }

    let messageContent: any = {}

    if (media && media.length > 0) {
      const m = media[0]
      if (m.type === 'image') {
        messageContent = { image: m.buffer || { url: m.url }, caption: text }
      } else if (m.type === 'video') {
        messageContent = { video: m.buffer || { url: m.url }, caption: text }
      } else if (m.type === 'audio') {
        messageContent = { audio: m.buffer || { url: m.url }, ptt: true }
      } else if (m.type === 'document') {
        messageContent = { document: m.buffer || { url: m.url }, fileName: m.filename, caption: text }
      }
    } else if (text) {
      messageContent = { text }
    }

    // Add reply context
    if (replyTo) {
      messageContent.quoted = { key: { id: replyTo, remoteJid: chatId } }
    }

    const result = await this.socket.sendMessage(chatId, messageContent)
    return result?.key.id || ''
  }

  async fetchContacts(): Promise<Contact[]> {
    if (!this.socket) return []

    const contacts: Contact[] = []
    
    // Get chats
    const chats = await this.socket.groupFetchAllParticipating()
    
    for (const [jid, group] of Object.entries(chats)) {
      contacts.push({
        id: jid,
        channel: 'whatsapp',
        accountId: this.accountId,
        chatId: jid,
        name: group.subject,
      })
    }

    return contacts
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      await this.socket.logout()
      this.socket = null
      this.connected = false
      this.qrCode = null
      this.emitStatus()
    }
  }

  getStatus(): ChannelStatus {
    return {
      type: 'whatsapp',
      accountId: this.accountId,
      connected: this.connected,
      qrCode: this.qrCode || undefined,
    }
  }

  private emitStatus(): void {
    this.emit('status', this.getStatus())
  }

  isConnected(): boolean {
    return this.connected
  }

  getQRCode(): string | null {
    return this.qrCode
  }
}
