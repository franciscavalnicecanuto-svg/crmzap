'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatPanel } from '@/components/chat-panel'
import { 
  MessageCircle, 
  Search,
  Wifi,
  WifiOff,
  Download,
  Loader2,
  ExternalLink,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react'
import Link from 'next/link'

type LeadStatus = 'novo' | 'em_contato' | 'negociando' | 'fechado' | 'perdido'
type LeadSource = 'whatsapp' | 'telegram' | 'instagram' | 'facebook' | 'unknown'

interface Lead {
  id: string
  name: string
  phone: string
  status: LeadStatus
  source: LeadSource
  whatsappId?: string
}

// Ícones das plataformas
const SourceIcon = ({ source, className = "w-3.5 h-3.5" }: { source: LeadSource; className?: string }) => {
  switch (source) {
    case 'whatsapp':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#25D366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      )
    case 'telegram':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#0088cc">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      )
    case 'instagram':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#E4405F">
          <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
        </svg>
      )
    case 'facebook':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    default:
      return <MessageCircle className={className + " text-gray-400"} />
  }
}

const statusConfig: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
  novo: { label: 'Novo', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
  em_contato: { label: 'Em Contato', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
  negociando: { label: 'Negociando', color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200' },
  fechado: { label: 'Fechado', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' },
  perdido: { label: 'Perdido', color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-200' },
}

const statusOrder: LeadStatus[] = ['novo', 'em_contato', 'negociando', 'fechado', 'perdido']

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [search, setSearch] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showChat, setShowChat] = useState(true)

  // Load leads from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('whatszap-leads-v3')
    if (saved) {
      try {
        setLeads(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse leads:', e)
      }
    }
  }, [])

  // Save leads to localStorage when they change
  useEffect(() => {
    if (mounted && leads.length > 0) {
      localStorage.setItem('whatszap-leads-v3', JSON.stringify(leads))
    }
  }, [leads, mounted])

  // Check WhatsApp connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch('/api/whatsapp/status')
        const data = await res.json()
        setIsConnected(data.connected || data.state === 'open')
      } catch (err) {
        console.error('Failed to check WhatsApp status:', err)
      }
    }
    
    checkConnection()
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  // Import contacts from WhatsApp
  const importFromWhatsApp = async () => {
    setIsImporting(true)
    setImportError(null)
    try {
      const res = await fetch('/api/whatsapp/import-chats', { method: 'POST' })
      const data = await res.json()
      
      if (data.success && data.leads) {
        const newLeads: Lead[] = data.leads.slice(0, 200).map((lead: any) => ({
          id: `wa_${lead.phone}`,
          name: lead.name || lead.phone,
          phone: lead.phone,
          status: 'novo' as LeadStatus,
          source: 'whatsapp' as LeadSource,
          whatsappId: lead.whatsappId,
        }))
        
        setLeads(prev => {
          const existingIds = new Set(prev.map(l => l.id))
          const uniqueNew = newLeads.filter(l => !existingIds.has(l.id))
          return [...prev, ...uniqueNew]
        })
        
        console.log(`Imported ${newLeads.length} contacts`)
      } else {
        setImportError(data.error || 'Falha ao importar contatos')
      }
    } catch (err: any) {
      setImportError(err.message || 'Erro ao importar')
    } finally {
      setIsImporting(false)
    }
  }

  const moveLead = (id: string, newStatus: LeadStatus) => {
    setLeads(prev => prev.map(lead => 
      lead.id === id ? { ...lead, status: newStatus } : lead
    ))
  }

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    e.dataTransfer.setData('leadId', lead.id)
  }

  const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('leadId')
    moveLead(leadId, status)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleCardClick = (lead: Lead) => {
    setSelectedLead(lead)
    setShowChat(true)
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(search.toLowerCase()) ||
    lead.phone.includes(search)
  )

  const getLeadsByStatus = (status: LeadStatus) => 
    filteredLeads.filter(lead => lead.status === status)

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border/50">
          <div className="px-3 h-12 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-1.5 hover:opacity-80 transition">
                <div className="w-6 h-6 rounded-md bg-green-500 flex items-center justify-center">
                  <MessageCircle className="w-3 h-3 text-white" />
                </div>
                <span className="font-bold text-sm hidden sm:inline">WhatsZap</span>
              </Link>
            </div>
            
            <div className="flex-1 max-w-xs">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input 
                  placeholder="Buscar..." 
                  className="pl-7 h-7 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Link href="/connect">
                <Button 
                  variant={isConnected ? 'outline' : 'default'}
                  size="sm"
                  className={`h-7 text-xs px-2 ${isConnected ? 'border-green-500 text-green-600' : 'bg-green-500 text-white'}`}
                >
                  {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                </Button>
              </Link>
              
              {isConnected && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-7 text-xs px-2"
                  onClick={importFromWhatsApp}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                </Button>
              )}

              <Button 
                variant="ghost" 
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setShowChat(!showChat)}
              >
                {showChat ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </header>

        {/* Import Error */}
        {importError && (
          <div className="bg-red-50 border-b border-red-200 px-3 py-1 text-xs text-red-800">
            {importError}
          </div>
        )}

        {/* Stats Bar */}
        <div className="border-b border-border/50 bg-muted/30 px-3 py-1.5">
          <div className="flex items-center gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Total </span>
              <span className="font-bold">{leads.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Novos </span>
              <span className="font-bold text-blue-600">{getLeadsByStatus('novo').length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Negociando </span>
              <span className="font-bold text-purple-600">{getLeadsByStatus('negociando').length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Fechados </span>
              <span className="font-bold text-green-600">{getLeadsByStatus('fechado').length}</span>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {leads.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-xs">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
              </div>
              <h2 className="text-sm font-semibold mb-1">Nenhum lead</h2>
              <p className="text-muted-foreground text-xs mb-3">
                {isConnected ? 'Importe seus contatos.' : 'Conecte o WhatsApp.'}
              </p>
              {isConnected ? (
                <Button 
                  onClick={importFromWhatsApp}
                  disabled={isImporting}
                  size="sm"
                  className="h-7 text-xs bg-green-500 hover:bg-green-600 text-white"
                >
                  {isImporting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
                  Importar
                </Button>
              ) : (
                <Link href="/connect">
                  <Button size="sm" className="h-7 text-xs bg-green-500 hover:bg-green-600 text-white">
                    <Wifi className="w-3 h-3 mr-1" />
                    Conectar
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Kanban Board */}
        {leads.length > 0 && (
          <div className="flex-1 overflow-x-auto p-2 pb-4">
            <div className="flex gap-2 h-full" style={{ minWidth: 'max-content', paddingRight: '8px' }}>
              {statusOrder.map((status) => {
                const config = statusConfig[status]
                const statusLeads = getLeadsByStatus(status)
                
                return (
                  <div 
                    key={status}
                    className="flex-shrink-0 w-40 flex flex-col"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, status)}
                  >
                    <div className={`rounded-md border ${config.bgColor} p-1.5 mb-1`}>
                      <div className="flex items-center gap-1">
                        <span className={`font-semibold text-xs ${config.color}`}>{config.label}</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          {statusLeads.length}
                        </Badge>
                      </div>
                    </div>
                    
                    <ScrollArea className="flex-1 max-h-[70vh]">
                      <div className="space-y-1 pr-1">
                        {statusLeads.map((lead) => (
                          <Card 
                            key={lead.id}
                            className={`p-1.5 cursor-pointer hover:shadow-md transition ${
                              selectedLead?.id === lead.id ? 'ring-2 ring-green-500' : ''
                            }`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, lead)}
                            onClick={() => handleCardClick(lead)}
                          >
                            <div className="flex items-center gap-1.5">
                              <div className="relative shrink-0">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="bg-gray-100 text-gray-600 font-medium text-[9px]">
                                    {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5">
                                  <SourceIcon source={lead.source || 'whatsapp'} className="w-2.5 h-2.5" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-[11px] truncate leading-tight">{lead.name}</h3>
                                <p className="text-[9px] text-muted-foreground truncate">{lead.phone}</p>
                              </div>
                            </div>
                          </Card>
                        ))}
                        
                        {statusLeads.length === 0 && (
                          <div className="text-center py-4 text-muted-foreground text-[9px] border border-dashed rounded-md">
                            Arraste aqui
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="w-72 border-l bg-background flex-shrink-0 hidden md:block">
          <ChatPanel 
            lead={selectedLead} 
            onClose={() => {
              setSelectedLead(null)
            }} 
          />
        </div>
      )}
    </div>
  )
}
