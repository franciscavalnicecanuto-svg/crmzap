import { Server as SocketServer, Socket } from 'socket.io'
import { Server as HttpServer } from 'http'
import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import type { UnifiedMessage, ChannelStatus, Contact, MediaAttachment } from '../types.js'

interface WebchatClient {
  socket: Socket
  userId: string
  userName?: string
  userAvatar?: string
  connectedAt: Date
}

export class WebchatChannel extends EventEmitter {
  private io: SocketServer | null = null
  private accountId: string
  private clients: Map<string, WebchatClient> = new Map()
  private connected = false

  constructor(accountId: string) {
    super()
    this.accountId = accountId
  }

  attach(httpServer: HttpServer): void {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      path: '/webchat',
    })

    this.io.on('connection', (socket) => {
      const userId = socket.handshake.query.userId as string || randomUUID()
      const userName = socket.handshake.query.userName as string
      const userAvatar = socket.handshake.query.userAvatar as string

      // Store client
      const client: WebchatClient = {
        socket,
        userId,
        userName,
        userAvatar,
        connectedAt: new Date(),
      }
      this.clients.set(socket.id, client)

      console.log(`[Webchat] Client connected: ${userId} (${userName || 'Anonymous'})`)

      // Emit contact
      this.emit('contact', {
        id: userId,
        channel: 'webchat',
        accountId: this.accountId,
        chatId: userId,
        name: userName,
      } as Contact)

      // Handle incoming messages
      socket.on('message', (data: { text?: string; media?: MediaAttachment[] }) => {
        const unified: UnifiedMessage = {
          id: randomUUID(),
          channel: 'webchat',
          accountId: this.accountId,
          chatId: userId,
          senderId: userId,
          senderName: userName,
          senderAvatar: userAvatar,
          text: data.text,
          media: data.media,
          timestamp: new Date(),
          fromMe: false,
        }

        this.emit('message', unified)
      })

      // Handle typing indicator
      socket.on('typing', (isTyping: boolean) => {
        this.emit('typing', {
          channel: 'webchat',
          accountId: this.accountId,
          chatId: userId,
          isTyping,
        })
      })

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`[Webchat] Client disconnected: ${userId}`)
        this.clients.delete(socket.id)
      })
    })

    this.connected = true
    this.emitStatus()
  }

  async sendMessage(chatId: string, text?: string, media?: MediaAttachment[], replyTo?: string): Promise<string> {
    if (!this.io) {
      throw new Error('Webchat not initialized')
    }

    const messageId = randomUUID()

    // Find client by userId (chatId)
    const client = Array.from(this.clients.values()).find(c => c.userId === chatId)
    
    if (client) {
      client.socket.emit('message', {
        id: messageId,
        text,
        media,
        replyTo,
        timestamp: new Date().toISOString(),
        fromMe: true,
      })
    } else {
      // Broadcast to room if using rooms, or emit to all (for demo)
      this.io.to(chatId).emit('message', {
        id: messageId,
        text,
        media,
        replyTo,
        timestamp: new Date().toISOString(),
        fromMe: true,
      })
    }

    return messageId
  }

  // Send typing indicator
  sendTyping(chatId: string, isTyping: boolean): void {
    const client = Array.from(this.clients.values()).find(c => c.userId === chatId)
    if (client) {
      client.socket.emit('typing', isTyping)
    }
  }

  getConnectedClients(): Contact[] {
    return Array.from(this.clients.values()).map(client => ({
      id: client.userId,
      channel: 'webchat' as const,
      accountId: this.accountId,
      chatId: client.userId,
      name: client.userName,
      avatar: client.userAvatar,
    }))
  }

  disconnect(): void {
    if (this.io) {
      this.io.close()
      this.io = null
      this.clients.clear()
      this.connected = false
      this.emitStatus()
    }
  }

  getStatus(): ChannelStatus {
    return {
      type: 'webchat',
      accountId: this.accountId,
      connected: this.connected,
    }
  }

  private emitStatus(): void {
    this.emit('status', this.getStatus())
  }

  isConnected(): boolean {
    return this.connected
  }
}
