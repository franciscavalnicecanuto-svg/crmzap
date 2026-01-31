import { Router, Request, Response } from 'express'
import { ChannelManager, WhatsAppChannel, MetaChannel, getOAuthUrl } from '../channels/index.js'
import type { ChannelConfig, SendMessageRequest, ChannelType } from '../types.js'

export function createApiRoutes(channelManager: ChannelManager): Router {
  const router = Router()

  // Health check
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Get all channel statuses
  router.get('/channels', (req, res) => {
    const statuses = channelManager.getAllStatus()
    res.json({ channels: statuses })
  })

  // Get specific channel status
  router.get('/channels/:type/:accountId', (req, res) => {
    const { type, accountId } = req.params
    const status = channelManager.getStatus(type as ChannelType, accountId)
    
    if (!status) {
      return res.status(404).json({ error: 'Channel not found' })
    }
    
    res.json(status)
  })

  // Add new channel
  router.post('/channels', async (req, res) => {
    try {
      const config: ChannelConfig = req.body
      await channelManager.addChannel(config)
      res.json({ success: true, message: 'Channel added' })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  })

  // Connect channel
  router.post('/channels/:type/:accountId/connect', async (req, res) => {
    try {
      const { type, accountId } = req.params
      await channelManager.connect(type as ChannelType, accountId)
      res.json({ success: true, message: 'Connection initiated' })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  })

  // Disconnect channel
  router.post('/channels/:type/:accountId/disconnect', async (req, res) => {
    try {
      const { type, accountId } = req.params
      await channelManager.disconnect(type as ChannelType, accountId)
      res.json({ success: true, message: 'Disconnected' })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  })

  // Remove channel
  router.delete('/channels/:type/:accountId', async (req, res) => {
    try {
      const { type, accountId } = req.params
      await channelManager.removeChannel(type as ChannelType, accountId)
      res.json({ success: true, message: 'Channel removed' })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  })

  // Get QR code for WhatsApp
  router.get('/channels/whatsapp/:accountId/qr', (req, res) => {
    const { accountId } = req.params
    const channel = channelManager.getChannel('whatsapp', accountId) as WhatsAppChannel | null
    
    if (!channel) {
      return res.status(404).json({ error: 'WhatsApp channel not found' })
    }
    
    const qrCode = channel.getQRCode()
    
    if (!qrCode) {
      return res.status(404).json({ error: 'QR code not available (already connected or not initialized)' })
    }
    
    res.json({ qrCode })
  })

  // Send message
  router.post('/messages/send', async (req, res) => {
    try {
      const request: SendMessageRequest = req.body
      
      if (!request.channel || !request.accountId || !request.chatId) {
        return res.status(400).json({ error: 'Missing required fields: channel, accountId, chatId' })
      }
      
      if (!request.text && !request.media?.length) {
        return res.status(400).json({ error: 'Message must have text or media' })
      }
      
      const messageId = await channelManager.sendMessage(request)
      res.json({ success: true, messageId })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  })

  // Meta (Facebook/Instagram) webhook verification
  router.get('/webhooks/meta', (req, res) => {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    const verifyToken = process.env.META_VERIFY_TOKEN || 'whatszap-verify'

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[Meta] Webhook verified')
      res.status(200).send(challenge)
    } else {
      res.sendStatus(403)
    }
  })

  // Meta webhook events
  router.post('/webhooks/meta', async (req, res) => {
    try {
      const body = req.body

      // Find the appropriate channel and forward the webhook
      // For now, broadcast to all Meta channels
      const statuses = channelManager.getAllStatus()
      
      for (const status of statuses) {
        if (status.type === 'facebook' || status.type === 'instagram') {
          const channel = channelManager.getChannel(status.type, status.accountId) as MetaChannel | null
          if (channel) {
            await channel.processWebhook(body)
          }
        }
      }

      res.sendStatus(200)
    } catch (error) {
      console.error('[Meta] Webhook error:', error)
      res.sendStatus(500)
    }
  })

  // Meta OAuth URL generator
  router.get('/oauth/meta/url', (req, res) => {
    const appId = process.env.META_APP_ID
    const redirectUri = req.query.redirect_uri as string || `${req.protocol}://${req.get('host')}/api/oauth/meta/callback`
    const state = req.query.state as string

    if (!appId) {
      return res.status(400).json({ error: 'META_APP_ID not configured' })
    }

    const url = getOAuthUrl(appId, redirectUri, state)
    res.json({ url })
  })

  // Meta OAuth callback (for reference - actual implementation depends on frontend)
  router.get('/oauth/meta/callback', (req, res) => {
    const code = req.query.code
    const state = req.query.state

    // In practice, exchange code for token and redirect to frontend
    res.json({ 
      message: 'OAuth callback received',
      code,
      state,
      next: 'Exchange code for access token using POST /oauth/meta/token'
    })
  })

  return router
}
