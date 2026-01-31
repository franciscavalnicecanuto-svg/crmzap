import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import axios from 'axios'
import { ChannelManager } from './channels/index.js'
import { createApiRoutes } from './api/routes.js'
import type { UnifiedMessage, ChannelStatus, Contact, WebhookConfig } from './types.js'

const PORT = process.env.PORT || 3001
const WEBHOOK_URL = process.env.WEBHOOK_URL // URL to send events to
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

// Initialize Express
const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Create HTTP server for Socket.io
const httpServer = createServer(app)

// Initialize channel manager
const channelManager = new ChannelManager()
channelManager.setHttpServer(httpServer)

// Webhook delivery
async function deliverWebhook(event: { type: string; data: any }): Promise<void> {
  if (!WEBHOOK_URL) return
  
  try {
    await axios.post(WEBHOOK_URL, event, {
      headers: {
        'Content-Type': 'application/json',
        ...(WEBHOOK_SECRET && { 'X-Webhook-Secret': WEBHOOK_SECRET }),
      },
      timeout: 10000,
    })
  } catch (error: any) {
    console.error(`[Webhook] Failed to deliver: ${error.message}`)
  }
}

// Forward channel events
channelManager.on('message', (msg: UnifiedMessage) => {
  console.log(`[${msg.channel}:${msg.accountId}] Message from ${msg.senderName || msg.senderId}: ${msg.text?.slice(0, 50)}...`)
  deliverWebhook({ type: 'message', data: msg })
})

channelManager.on('status', (status: ChannelStatus) => {
  console.log(`[${status.type}:${status.accountId}] Status: ${status.connected ? 'connected' : 'disconnected'}`)
  deliverWebhook({ type: 'connection', data: status })
})

channelManager.on('contact', (contact: Contact) => {
  console.log(`[${contact.channel}:${contact.accountId}] Contact: ${contact.name || contact.chatId}`)
  deliverWebhook({ type: 'contact', data: contact })
})

// Mount API routes
app.use('/api', createApiRoutes(channelManager))

// Server-Sent Events for real-time updates
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const sendEvent = (type: string, data: any) => {
    res.write(`event: ${type}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  // Forward events to SSE
  const onMessage = (msg: UnifiedMessage) => sendEvent('message', msg)
  const onStatus = (status: ChannelStatus) => sendEvent('status', status)
  const onContact = (contact: Contact) => sendEvent('contact', contact)

  channelManager.on('message', onMessage)
  channelManager.on('status', onStatus)
  channelManager.on('contact', onContact)

  // Cleanup on disconnect
  req.on('close', () => {
    channelManager.off('message', onMessage)
    channelManager.off('status', onStatus)
    channelManager.off('contact', onContact)
  })
})

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'WhatsZap Messaging Service',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      channels: 'GET /api/channels',
      addChannel: 'POST /api/channels',
      channelStatus: 'GET /api/channels/:type/:accountId',
      connect: 'POST /api/channels/:type/:accountId/connect',
      disconnect: 'POST /api/channels/:type/:accountId/disconnect',
      qrCode: 'GET /api/channels/whatsapp/:accountId/qr',
      sendMessage: 'POST /api/messages/send',
      events: 'GET /api/events (SSE)',
    },
    supportedChannels: ['whatsapp', 'telegram', 'webchat'],
  })
})

// Start server
httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 WhatsZap Messaging Service                          ║
║                                                           ║
║   Server running on http://localhost:${PORT}               ║
║                                                           ║
║   Endpoints:                                              ║
║   • GET  /api/health              - Health check          ║
║   • GET  /api/channels            - List channels         ║
║   • POST /api/channels            - Add channel           ║
║   • POST /api/channels/:t/:a/connect    - Connect         ║
║   • GET  /api/channels/whatsapp/:a/qr   - Get QR          ║
║   • POST /api/messages/send       - Send message          ║
║   • GET  /api/events              - SSE stream            ║
║                                                           ║
║   Supported: WhatsApp, Telegram, Facebook, Instagram,     ║
║              Webchat                                      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...')
  httpServer.close()
  process.exit(0)
})
