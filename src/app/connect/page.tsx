'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  MessageCircle, 
  ChevronLeft,
  Smartphone,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Plus,
  Settings,
  ExternalLink
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useLeadsStore } from '@/lib/store'
import messagingApi, { ChannelType, ChannelStatus } from '@/lib/messaging-api'

// Channel icons and colors
const channelConfig: Record<ChannelType, { name: string; icon: string; color: string; description: string; hasOAuth?: boolean }> = {
  whatsapp: { name: 'WhatsApp', icon: '💬', color: 'bg-green-500', description: 'Via QR Code' },
  telegram: { name: 'Telegram', icon: '✈️', color: 'bg-blue-500', description: 'Via Bot Token' },
  facebook: { name: 'Facebook', icon: '📘', color: 'bg-blue-600', description: 'Messenger da Página', hasOAuth: true },
  instagram: { name: 'Instagram', icon: '📸', color: 'bg-pink-500', description: 'DMs do perfil Business', hasOAuth: true },
  discord: { name: 'Discord', icon: '🎮', color: 'bg-indigo-500', description: 'Via Bot Token' },
  webchat: { name: 'Webchat', icon: '🌐', color: 'bg-gray-500', description: 'Widget pro seu site' },
}

interface MetaPage {
  id: string
  name: string
  accessToken: string
  category?: string
  instagramAccount?: {
    id: string
    username?: string
  } | null
}

interface MetaAuthResult {
  success: boolean
  platform: 'facebook' | 'instagram'
  pages: MetaPage[]
}

export default function ConnectPage() {
  const searchParams = useSearchParams()
  const { setConnectionState } = useLeadsStore()
  const [channels, setChannels] = useState<ChannelStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [addingChannel, setAddingChannel] = useState<ChannelType | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  
  // Meta OAuth state
  const [metaPages, setMetaPages] = useState<MetaPage[]>([])
  const [metaPlatform, setMetaPlatform] = useState<'facebook' | 'instagram'>('facebook')
  const [showPageSelector, setShowPageSelector] = useState(false)
  
  const [newChannelConfig, setNewChannelConfig] = useState({
    accountId: '',
    botToken: '',
  })

  // Handle Meta OAuth callback
  useEffect(() => {
    const metaAuth = searchParams.get('meta_auth')
    const metaError = searchParams.get('meta_error')

    if (metaError) {
      setError(decodeURIComponent(metaError))
      // Clean URL
      window.history.replaceState({}, '', '/connect')
    }

    if (metaAuth) {
      try {
        const data: MetaAuthResult = JSON.parse(atob(metaAuth))
        if (data.success && data.pages?.length > 0) {
          setMetaPages(data.pages)
          setMetaPlatform(data.platform)
          setShowPageSelector(true)
        }
      } catch (e) {
        setError('Failed to parse Meta auth data')
      }
      // Clean URL
      window.history.replaceState({}, '', '/connect')
    }
  }, [searchParams])

  // Fetch channels on mount
  useEffect(() => {
    fetchChannels()
    
    // Subscribe to real-time updates
    const unsubscribe = messagingApi.subscribe({
      onStatus: (status) => {
        setChannels(prev => {
          const idx = prev.findIndex(c => c.type === status.type && c.accountId === status.accountId)
          if (idx >= 0) {
            const updated = [...prev]
            updated[idx] = status
            return updated
          }
          return [...prev, status]
        })
        
        if (status.type === 'whatsapp' && status.connected) {
          setConnectionState('connected')
        }
        
        if (status.qrCode) {
          setQrCode(status.qrCode)
        }
      },
    })
    
    return () => unsubscribe()
  }, [])

  const fetchChannels = async () => {
    try {
      setLoading(true)
      const { channels } = await messagingApi.getChannels()
      setChannels(channels)
    } catch (err: any) {
      // Service might not be running, that's ok
      console.log('Service not available')
    } finally {
      setLoading(false)
    }
  }

  // Start Meta OAuth flow
  const handleMetaConnect = (platform: 'facebook' | 'instagram') => {
    window.location.href = `/api/auth/meta?platform=${platform}`
  }

  // Save selected Meta page
  const handleSelectMetaPage = async (page: MetaPage) => {
    try {
      setLoading(true)
      
      // Save to local storage for now (later: save to DB)
      const savedChannels = JSON.parse(localStorage.getItem('crmzap_channels') || '[]')
      
      const newChannel = {
        type: metaPlatform,
        accountId: page.id,
        name: page.name,
        accessToken: page.accessToken,
        instagramAccountId: page.instagramAccount?.id,
        instagramUsername: page.instagramAccount?.username,
        connected: true,
        connectedAt: new Date().toISOString(),
      }
      
      // Check if already exists
      const existingIdx = savedChannels.findIndex(
        (c: any) => c.type === metaPlatform && c.accountId === page.id
      )
      
      if (existingIdx >= 0) {
        savedChannels[existingIdx] = newChannel
      } else {
        savedChannels.push(newChannel)
      }
      
      localStorage.setItem('crmzap_channels', JSON.stringify(savedChannels))
      
      setSuccess(`${metaPlatform === 'facebook' ? 'Facebook' : 'Instagram'} conectado com sucesso!`)
      setShowPageSelector(false)
      setMetaPages([])
      
      // Update local state
      setChannels(prev => [...prev.filter(c => !(c.type === metaPlatform && c.accountId === page.id)), {
        type: metaPlatform,
        accountId: page.id,
        connected: true,
      }])
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddChannel = async (type: ChannelType) => {
    if (!newChannelConfig.accountId) {
      setError('Preencha o ID da conta')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const config: any = {
        type,
        accountId: newChannelConfig.accountId,
        enabled: true,
      }

      if (type === 'telegram' && newChannelConfig.botToken) {
        config.telegram = { botToken: newChannelConfig.botToken }
      }

      await messagingApi.addChannel(config)
      
      if (type === 'whatsapp') {
        const qrResult = await messagingApi.getWhatsAppQR(newChannelConfig.accountId)
        if (qrResult?.qrCode) {
          setQrCode(qrResult.qrCode)
        }
      }

      setAddingChannel(null)
      setNewChannelConfig({ accountId: '', botToken: '' })
      fetchChannels()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (type: ChannelType, accountId: string) => {
    try {
      await messagingApi.connect(type, accountId)
      
      if (type === 'whatsapp') {
        const qrResult = await messagingApi.getWhatsAppQR(accountId)
        if (qrResult?.qrCode) {
          setQrCode(qrResult.qrCode)
        }
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDisconnect = async (type: ChannelType, accountId: string) => {
    try {
      await messagingApi.disconnect(type, accountId)
      if (type === 'whatsapp') {
        setConnectionState('disconnected')
        setQrCode(null)
      }
      fetchChannels()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Load saved channels from localStorage
  useEffect(() => {
    const savedChannels = JSON.parse(localStorage.getItem('crmzap_channels') || '[]')
    if (savedChannels.length > 0) {
      const localChannels = savedChannels.map((c: any) => ({
        type: c.type,
        accountId: c.accountId,
        connected: c.connected,
      }))
      setChannels(prev => {
        // Merge with API channels
        const merged = [...prev]
        for (const lc of localChannels) {
          if (!merged.find(m => m.type === lc.type && m.accountId === lc.accountId)) {
            merged.push(lc)
          }
        }
        return merged
      })
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition">
              <ChevronLeft className="w-4 h-4" />
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold">CRMZap</span>
            </Link>
          </div>
          
          <Button variant="outline" size="sm" onClick={fetchChannels} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Canais de Comunicação</h1>
            <p className="text-muted-foreground">
              Conecte seus canais para centralizar todas as conversas
            </p>
          </div>

          {/* Success message */}
          {success && (
            <Card className="p-4 mb-6 border-green-500/50 bg-green-500/10">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>{success}</span>
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSuccess(null)}>
                  ✕
                </Button>
              </div>
            </Card>
          )}

          {/* Error message */}
          {error && (
            <Card className="p-4 mb-6 border-destructive/50 bg-destructive/10">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError(null)}>
                  ✕
                </Button>
              </div>
            </Card>
          )}

          {/* Meta Page Selector Modal */}
          {showPageSelector && metaPages.length > 0 && (
            <Card className="p-6 mb-6">
              <h3 className="font-semibold mb-4">
                Selecione a página para conectar ao {metaPlatform === 'facebook' ? 'Facebook Messenger' : 'Instagram'}
              </h3>
              <div className="space-y-3">
                {metaPages.map((page) => (
                  <div 
                    key={page.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/50 cursor-pointer transition"
                    onClick={() => handleSelectMetaPage(page)}
                  >
                    <div>
                      <div className="font-medium">{page.name}</div>
                      {page.instagramAccount && (
                        <div className="text-sm text-muted-foreground">
                          @{page.instagramAccount.username || page.instagramAccount.id}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">{page.category}</div>
                    </div>
                    <Button size="sm">Conectar</Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" onClick={() => setShowPageSelector(false)}>
                Cancelar
              </Button>
            </Card>
          )}

          {/* QR Code Modal */}
          {qrCode && (
            <Card className="p-6 mb-6 text-center">
              <h3 className="font-semibold mb-4">Escaneie o QR Code com seu WhatsApp</h3>
              <div className="inline-block p-4 bg-white rounded-xl mb-4">
                <QRCodeSVG value={qrCode.replace('data:image/png;base64,', '')} size={200} />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Abra o WhatsApp → Configurações → Dispositivos conectados → Conectar dispositivo
              </p>
              <Button variant="outline" onClick={() => setQrCode(null)}>
                Fechar
              </Button>
            </Card>
          )}

          {/* Connected Channels */}
          <div className="space-y-4 mb-8">
            <h2 className="font-semibold text-lg">Canais Conectados</h2>
            
            {loading && channels.length === 0 ? (
              <Card className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Carregando canais...</p>
              </Card>
            ) : channels.length === 0 ? (
              <Card className="p-8 text-center">
                <WifiOff className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum canal conectado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Adicione um canal abaixo para começar
                </p>
              </Card>
            ) : (
              channels.map((channel) => {
                const config = channelConfig[channel.type]
                if (!config) return null
                
                // Get saved channel data for name
                const savedChannels = JSON.parse(localStorage.getItem('crmzap_channels') || '[]')
                const savedChannel = savedChannels.find((c: any) => c.type === channel.type && c.accountId === channel.accountId)
                
                return (
                  <Card key={`${channel.type}-${channel.accountId}`} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center text-xl`}>
                          {config.icon}
                        </div>
                        <div>
                          <div className="font-medium">{savedChannel?.name || config.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {savedChannel?.instagramUsername ? `@${savedChannel.instagramUsername}` : channel.accountId}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={channel.connected ? 'default' : 'secondary'}>
                          {channel.connected ? (
                            <>
                              <Wifi className="w-3 h-3 mr-1" />
                              Conectado
                            </>
                          ) : (
                            <>
                              <WifiOff className="w-3 h-3 mr-1" />
                              Desconectado
                            </>
                          )}
                        </Badge>
                        
                        {channel.connected ? (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDisconnect(channel.type, channel.accountId)}
                          >
                            Desconectar
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleConnect(channel.type, channel.accountId)}
                          >
                            Conectar
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>

          {/* Add Channel */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Adicionar Canal</h2>
            
            {addingChannel ? (
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg ${channelConfig[addingChannel].color} flex items-center justify-center text-xl`}>
                    {channelConfig[addingChannel].icon}
                  </div>
                  <h3 className="font-medium">{channelConfig[addingChannel].name}</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">ID da Conta</label>
                    <Input 
                      placeholder="minha-conta"
                      value={newChannelConfig.accountId}
                      onChange={(e) => setNewChannelConfig({ ...newChannelConfig, accountId: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Identificador único para esta conexão
                    </p>
                  </div>
                  
                  {addingChannel === 'telegram' && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">Bot Token</label>
                      <Input 
                        placeholder="123456:ABC-DEF..."
                        value={newChannelConfig.botToken}
                        onChange={(e) => setNewChannelConfig({ ...newChannelConfig, botToken: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Obtenha com @BotFather no Telegram
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1"
                      onClick={() => handleAddChannel(addingChannel)}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Adicionar
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setAddingChannel(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {(['whatsapp', 'telegram', 'facebook', 'instagram', 'webchat'] as ChannelType[]).map((type) => {
                  const config = channelConfig[type]
                  const hasOAuth = config.hasOAuth
                  
                  return (
                    <Card 
                      key={type}
                      className="p-4 cursor-pointer hover:border-primary/50 transition"
                      onClick={() => {
                        if (hasOAuth) {
                          handleMetaConnect(type as 'facebook' | 'instagram')
                        } else {
                          setAddingChannel(type)
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center text-xl`}>
                          {config.icon}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{config.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {config.description}
                          </div>
                        </div>
                        {hasOAuth ? (
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Info Card */}
          <Card className="mt-8 p-4 bg-muted/50">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="font-medium text-sm">Sobre as integrações</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Facebook/Instagram:</strong> Clique no botão e autorize o acesso à sua página. Tudo automático!<br/>
                  <strong>WhatsApp:</strong> Escaneie o QR Code com seu celular.<br/>
                  <strong>Telegram:</strong> Crie um bot com @BotFather e cole o token.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
