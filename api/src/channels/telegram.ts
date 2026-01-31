import { Bot, Context, InputFile } from 'grammy'
import { EventEmitter } from 'events'
import type { UnifiedMessage, ChannelStatus, Contact, MediaAttachment } from '../types.js'

export class TelegramChannel extends EventEmitter {
  private bot: Bot | null = null
  private accountId: string
  private botToken: string
  private connected = false
  private botInfo: { id: number; username: string } | null = null

  constructor(accountId: string, botToken: string) {
    super()
    this.accountId = accountId
    this.botToken = botToken
  }

  async connect(): Promise<void> {
    this.bot = new Bot(this.botToken)

    // Get bot info
    const me = await this.bot.api.getMe()
    this.botInfo = { id: me.id, username: me.username || '' }

    // Handle incoming messages
    this.bot.on('message', async (ctx) => {
      const unified = this.toUnifiedMessage(ctx)
      if (unified) {
        this.emit('message', unified)
      }
    })

    // Start the bot
    this.bot.start({
      onStart: () => {
        this.connected = true
        this.emitStatus()
      },
    })

    // Handle errors
    this.bot.catch((err) => {
      console.error('Telegram bot error:', err)
      this.connected = false
      this.emitStatus()
    })
  }

  private toUnifiedMessage(ctx: Context): UnifiedMessage | null {
    const msg = ctx.message
    if (!msg) return null

    const chatId = msg.chat.id.toString()
    const fromMe = msg.from?.id === this.botInfo?.id
    const senderId = msg.from?.id.toString() || ''

    // Extract text
    let text: string | undefined
    if ('text' in msg) {
      text = msg.text
    } else if ('caption' in msg) {
      text = msg.caption
    }

    // Extract media
    const media: MediaAttachment[] = []
    if ('photo' in msg && msg.photo) {
      const photo = msg.photo[msg.photo.length - 1] // Get largest photo
      media.push({ type: 'image' })
    } else if ('video' in msg && msg.video) {
      media.push({ type: 'video', mimeType: msg.video.mime_type })
    } else if ('audio' in msg && msg.audio) {
      media.push({ type: 'audio', mimeType: msg.audio.mime_type })
    } else if ('voice' in msg && msg.voice) {
      media.push({ type: 'audio', mimeType: msg.voice.mime_type })
    } else if ('document' in msg && msg.document) {
      media.push({ 
        type: 'document', 
        mimeType: msg.document.mime_type,
        filename: msg.document.file_name,
      })
    } else if ('sticker' in msg && msg.sticker) {
      media.push({ type: 'sticker' })
    }

    // Extract reply context
    let replyTo: UnifiedMessage['replyTo']
    if ('reply_to_message' in msg && msg.reply_to_message) {
      const reply = msg.reply_to_message
      replyTo = {
        id: reply.message_id.toString(),
        text: 'text' in reply ? reply.text : ('caption' in reply ? reply.caption : undefined),
        senderId: reply.from?.id.toString(),
      }
    }

    // Sender name
    const senderName = msg.from 
      ? [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ')
      : undefined

    return {
      id: msg.message_id.toString(),
      channel: 'telegram',
      accountId: this.accountId,
      chatId,
      senderId,
      senderName,
      text,
      media: media.length > 0 ? media : undefined,
      timestamp: new Date(msg.date * 1000),
      fromMe,
      replyTo,
      raw: msg,
    }
  }

  async sendMessage(chatId: string, text?: string, media?: MediaAttachment[], replyTo?: string): Promise<string> {
    if (!this.bot || !this.connected) {
      throw new Error('Telegram not connected')
    }

    const replyParams = replyTo ? { reply_to_message_id: parseInt(replyTo) } : {}

    let result: any

    if (media && media.length > 0) {
      const m = media[0]
      const file = m.buffer 
        ? new InputFile(m.buffer, m.filename)
        : m.url!

      if (m.type === 'image') {
        result = await this.bot.api.sendPhoto(chatId, file, {
          caption: text,
          ...replyParams,
        })
      } else if (m.type === 'video') {
        result = await this.bot.api.sendVideo(chatId, file, {
          caption: text,
          ...replyParams,
        })
      } else if (m.type === 'audio') {
        result = await this.bot.api.sendAudio(chatId, file, {
          caption: text,
          ...replyParams,
        })
      } else if (m.type === 'document') {
        result = await this.bot.api.sendDocument(chatId, file, {
          caption: text,
          ...replyParams,
        })
      }
    } else if (text) {
      result = await this.bot.api.sendMessage(chatId, text, replyParams)
    }

    return result?.message_id?.toString() || ''
  }

  async disconnect(): Promise<void> {
    if (this.bot) {
      await this.bot.stop()
      this.bot = null
      this.connected = false
      this.emitStatus()
    }
  }

  getStatus(): ChannelStatus {
    return {
      type: 'telegram',
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
