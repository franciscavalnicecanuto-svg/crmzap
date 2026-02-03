'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  MessageCircle, 
  Plus,
  Search,
  Wifi,
  WifiOff,
  Download,
  Loader2,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'

type LeadStatus = 'novo' | 'em_contato' | 'negociando' | 'fechado' | 'perdido'

interface Lead {
  id: string
  name: string
  phone: string
  status: LeadStatus
  whatsappId?: string
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

  // Load leads from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('whatszap-leads-v2')
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
      localStorage.setItem('whatszap-leads-v2', JSON.stringify(leads))
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
        // Limit to 200 contacts
        const newLeads: Lead[] = data.leads.slice(0, 200).map((lead: any) => ({
          id: `wa_${lead.phone}`,
          name: lead.name || lead.phone,
          phone: lead.phone,
          status: 'novo' as LeadStatus,
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

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    window.open(`https://wa.me/${cleanPhone}`, '_blank')
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border/50">
        <div className="px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
              <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold hidden sm:inline">WhatsZap</span>
            </Link>
          </div>
          
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar lead..." 
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Link href="/connect">
              <Button 
                variant={isConnected ? 'outline' : 'default'}
                size="sm"
                className={isConnected ? 'border-green-500 text-green-600' : 'bg-green-500 text-white'}
              >
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Conectado</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Conectar</span>
                  </>
                )}
              </Button>
            </Link>
            
            {isConnected && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={importFromWhatsApp}
                disabled={isImporting}
              >
                {isImporting ? (
                  <Loader2 className="w-4 h-4 animate-spin sm:mr-1" />
                ) : (
                  <Download className="w-4 h-4 sm:mr-1" />
                )}
                <span className="hidden sm:inline">
                  {isImporting ? 'Importando...' : 'Importar'}
                </span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Import Error */}
      {importError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-800">
          {importError}
        </div>
      )}

      {/* Stats Bar */}
      <div className="border-b border-border/50 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Total</div>
            <div className="font-bold">{leads.length}</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="text-muted-foreground text-xs">Novos</div>
            <div className="font-bold text-blue-600">{getLeadsByStatus('novo').length}</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="text-muted-foreground text-xs">Negociando</div>
            <div className="font-bold text-purple-600">{getLeadsByStatus('negociando').length}</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="text-muted-foreground text-xs">Fechados</div>
            <div className="font-bold text-green-600">{getLeadsByStatus('fechado').length}</div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {leads.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-8 min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Nenhum lead ainda</h2>
            <p className="text-muted-foreground mb-6">
              {isConnected 
                ? 'Clique em "Importar" para trazer seus contatos do WhatsApp.'
                : 'Conecte seu WhatsApp primeiro.'}
            </p>
            {isConnected ? (
              <Button 
                onClick={importFromWhatsApp}
                disabled={isImporting}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {isImporting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {isImporting ? 'Importando...' : 'Importar Contatos'}
              </Button>
            ) : (
              <Link href="/connect">
                <Button className="bg-green-500 hover:bg-green-600 text-white">
                  <Wifi className="w-4 h-4 mr-2" />
                  Conectar WhatsApp
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {leads.length > 0 && (
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-3 h-full min-w-max">
            {statusOrder.map((status) => {
              const config = statusConfig[status]
              const statusLeads = getLeadsByStatus(status)
              
              return (
                <div 
                  key={status}
                  className="flex-shrink-0 w-64 flex flex-col"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  <div className={`rounded-lg border ${config.bgColor} p-2 mb-2`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-semibold text-sm ${config.color}`}>{config.label}</span>
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">
                          {statusLeads.length}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <ScrollArea className="flex-1 max-h-[70vh]">
                    <div className="space-y-2 pr-1">
                      {statusLeads.map((lead) => (
                        <Card 
                          key={lead.id}
                          className="p-3 cursor-grab hover:shadow-md transition group"
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead)}
                        >
                          <div className="flex items-start gap-2">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-green-100 text-green-700 font-medium text-xs">
                                {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h3 className="font-medium text-sm truncate">{lead.name}</h3>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition shrink-0"
                                  onClick={() => openWhatsApp(lead.phone)}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                      
                      {statusLeads.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-xs border-2 border-dashed rounded-lg">
                          Arraste leads aqui
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
  )
}
