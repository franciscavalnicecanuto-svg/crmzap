'use client'

import { useEffect, useState } from 'react'
import { useLeadsStore, LeadStatus, Lead, demoLeads } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatPanel } from '@/components/chat-panel'
import { 
  MessageCircle, 
  Plus,
  Phone,
  Bell,
  Search,
  Clock,
  DollarSign,
  ExternalLink,
  Trash2,
  ChevronLeft,
  AlertCircle,
  Calendar,
  Tag,
  Wifi,
  WifiOff,
  MessageSquare,
  X,
  PanelRightClose,
  PanelRightOpen,
  Download,
  Loader2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

const statusConfig: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
  novo: { label: 'Novo', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
  em_contato: { label: 'Em Contato', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
  negociando: { label: 'Negociando', color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200' },
  fechado: { label: 'Fechado', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' },
  perdido: { label: 'Perdido', color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-200' },
}

const statusOrder: LeadStatus[] = ['novo', 'em_contato', 'negociando', 'fechado', 'perdido']

export default function Dashboard() {
  const { 
    leads, 
    addLead, 
    moveLead, 
    deleteLead, 
    updateLead, 
    getPendingFollowUps,
    selectedLeadId,
    selectLead,
    connectionState,
    setConnectionState,
    syncFromWhatsApp
  } = useLeadsStore()
  const [search, setSearch] = useState('')
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const [isAddingLead, setIsAddingLead] = useState(false)
  const [newLead, setNewLead] = useState({ name: '', phone: '', value: '' })
  const [mounted, setMounted] = useState(false)
  const [showChat, setShowChat] = useState(true)
  const [detailLead, setDetailLead] = useState<Lead | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  // Import contacts from WhatsApp
  const importFromWhatsApp = async () => {
    setIsImporting(true)
    setImportError(null)
    try {
      const res = await fetch('/api/whatsapp/import-chats', { method: 'POST' })
      const data = await res.json()
      
      if (data.success && data.leads) {
        // Transform to format expected by syncFromWhatsApp
        const contacts = data.leads.map((lead: any) => ({
          phone: lead.phone,
          name: lead.name,
          whatsappId: lead.whatsappId,
        }))
        syncFromWhatsApp(contacts)
        console.log(`Imported ${contacts.length} contacts from WhatsApp`)
        
        // Force page reload to ensure state is updated
        setTimeout(() => {
          window.location.reload()
        }, 500)
      } else {
        setImportError(data.error || 'Falha ao importar contatos')
      }
    } catch (err: any) {
      setImportError(err.message || 'Erro ao importar')
    } finally {
      setIsImporting(false)
    }
  }

  // Check WhatsApp connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch('/api/whatsapp/status')
        const data = await res.json()
        if (data.connected || data.state === 'open') {
          setConnectionState('connected')
        } else if (data.state === 'connecting') {
          setConnectionState('connecting')
        } else {
          setConnectionState('disconnected')
        }
      } catch (err) {
        console.error('Failed to check WhatsApp status:', err)
      }
    }
    
    checkConnection()
    const interval = setInterval(checkConnection, 30000) // Check every 30s
    return () => clearInterval(interval)
  }, [setConnectionState])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  const pendingFollowUps = getPendingFollowUps()
  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(search.toLowerCase()) ||
    lead.phone.includes(search)
  )

  const getLeadsByStatus = (status: LeadStatus) => 
    filteredLeads.filter(lead => lead.status === status)

  const getTotalValue = (status: LeadStatus) =>
    getLeadsByStatus(status).reduce((acc, lead) => acc + (lead.value || 0), 0)

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault()
    if (draggedLead && draggedLead.status !== status) {
      moveLead(draggedLead.id, status)
    }
    setDraggedLead(null)
  }

  const handleAddLead = () => {
    if (newLead.name && newLead.phone) {
      addLead({
        name: newLead.name,
        phone: newLead.phone,
        status: 'novo',
        tags: [],
        value: newLead.value ? parseFloat(newLead.value) : undefined,
      })
      setNewLead({ name: '', phone: '', value: '' })
      setIsAddingLead(false)
    }
  }

  const handleCardClick = (lead: Lead) => {
    selectLead(lead.id)
    if (!showChat) setShowChat(true)
  }

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    window.open(`https://wa.me/${cleanPhone}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border/50">
          <div className="px-4 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
                <div className="w-8 h-8 rounded-lg whatsapp-gradient flex items-center justify-center">
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
              {/* Connection Status */}
              <Link href="/connect">
                <Button 
                  variant={connectionState === 'connected' ? 'outline' : 'default'}
                  size="sm"
                  className={connectionState === 'connected' ? 'border-green-500 text-green-600' : 'whatsapp-gradient text-white'}
                >
                  {connectionState === 'connected' ? (
                    <>
                      <Wifi className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Conectado</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Conectar WhatsApp</span>
                    </>
                  )}
                </Button>
              </Link>
              
              {pendingFollowUps.length > 0 && (
                <Button variant="outline" size="sm" className="relative">
                  <Bell className="w-4 h-4" />
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-destructive">
                    {pendingFollowUps.length}
                  </Badge>
                </Button>
              )}
              
              {connectionState === 'connected' && (
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
                    {isImporting ? 'Importando...' : 'Importar Contatos'}
                  </span>
                </Button>
              )}
              
              <Dialog open={isAddingLead} onOpenChange={setIsAddingLead}>
                <DialogTrigger asChild>
                  <Button size="sm" className="whatsapp-gradient text-white hover:opacity-90">
                    <Plus className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Novo Lead</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Lead</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Nome</label>
                      <Input 
                        placeholder="Nome do cliente"
                        value={newLead.name}
                        onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Telefone</label>
                      <Input 
                        placeholder="+55 11 99999-9999"
                        value={newLead.phone}
                        onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Valor (opcional)</label>
                      <Input 
                        type="number"
                        placeholder="0.00"
                        value={newLead.value}
                        onChange={(e) => setNewLead({ ...newLead, value: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleAddLead} className="w-full whatsapp-gradient text-white">
                      Adicionar Lead
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowChat(!showChat)}
                className="hidden lg:flex"
              >
                {showChat ? (
                  <PanelRightClose className="w-4 h-4" />
                ) : (
                  <PanelRightOpen className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Pending Follow-ups Alert */}
        {pendingFollowUps.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-amber-800 font-medium">
                {pendingFollowUps.length} follow-up{pendingFollowUps.length > 1 ? 's' : ''} pendente{pendingFollowUps.length > 1 ? 's' : ''}
              </span>
              <div className="flex gap-1 overflow-x-auto">
                {pendingFollowUps.slice(0, 3).map(lead => (
                  <Badge 
                    key={lead.id} 
                    variant="outline" 
                    className="bg-white cursor-pointer hover:bg-amber-100 shrink-0" 
                    onClick={() => handleCardClick(lead)}
                  >
                    {lead.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stats Bar */}
        <div className="border-b border-border/50 bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-6 text-sm overflow-x-auto">
            <div>
              <div className="text-muted-foreground text-xs">Leads</div>
              <div className="font-bold">{leads.length}</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="text-muted-foreground text-xs">Negociando</div>
              <div className="font-bold text-purple-600">{getLeadsByStatus('negociando').length}</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="text-muted-foreground text-xs">Em Negociação</div>
              <div className="font-bold text-purple-600">R$ {getTotalValue('negociando').toLocaleString('pt-BR')}</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="text-muted-foreground text-xs">Fechados</div>
              <div className="font-bold text-green-600">R$ {getTotalValue('fechado').toLocaleString('pt-BR')}</div>
            </div>
          </div>
        </div>

        {/* Import Error Alert */}
        {importError && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="text-red-800">{importError}</span>
              <Button 
                variant="ghost" 
                size="sm"
                className="ml-auto text-red-600 hover:text-red-800"
                onClick={() => setImportError(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {leads.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Nenhum lead ainda</h2>
              <p className="text-muted-foreground mb-6">
                {connectionState === 'connected' 
                  ? 'Importe seus contatos do WhatsApp para começar a gerenciar seus leads.'
                  : 'Conecte seu WhatsApp primeiro para importar seus contatos.'}
              </p>
              {connectionState === 'connected' ? (
                <Button 
                  onClick={importFromWhatsApp}
                  disabled={isImporting}
                  className="whatsapp-gradient text-white"
                >
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {isImporting ? 'Importando...' : 'Importar Contatos do WhatsApp'}
                </Button>
              ) : (
                <Link href="/connect">
                  <Button className="whatsapp-gradient text-white">
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
                  className="flex-shrink-0 w-52 flex flex-col"
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
                      {status !== 'perdido' && getTotalValue(status) > 0 && (
                        <span className="text-xs text-muted-foreground">
                          R$ {getTotalValue(status).toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <ScrollArea className="flex-1">
                    <div className="space-y-2 pr-1">
                      {statusLeads.map((lead) => (
                        <Card 
                          key={lead.id}
                          className={`p-3 cursor-pointer hover:shadow-md transition group ${
                            draggedLead?.id === lead.id ? 'opacity-50' : ''
                          } ${selectedLeadId === lead.id ? 'ring-2 ring-primary' : ''}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead)}
                          onClick={() => handleCardClick(lead)}
                        >
                          <div className="flex items-start gap-2">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                                {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h3 className="font-medium text-sm truncate">{lead.name}</h3>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openWhatsApp(lead.phone)
                                  }}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
                            </div>
                          </div>
                          
                          {lead.lastMessage && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {lead.lastMessage}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                            <div className="flex items-center gap-1 flex-wrap">
                              {lead.value && (
                                <Badge variant="secondary" className="text-xs h-5 px-1">
                                  R${lead.value}
                                </Badge>
                              )}
                              {lead.followUpAt && new Date(lead.followUpAt) <= new Date() && (
                                <Badge variant="destructive" className="text-xs h-5 px-1">
                                  <Bell className="w-2.5 h-2.5" />
                                </Badge>
                              )}
                            </div>
                            {lead.lastMessageAt && (
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(lead.lastMessageAt), { 
                                  addSuffix: false, 
                                  locale: ptBR 
                                })}
                              </span>
                            )}
                          </div>
                        </Card>
                      ))}
                      
                      {statusLeads.length === 0 && (
                        <div className="text-center py-6 text-muted-foreground text-xs">
                          Nenhum lead
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
        <div className="w-96 border-l bg-background hidden lg:block">
          <ChatPanel onClose={() => setShowChat(false)} />
        </div>
      )}
      
      {/* Mobile Chat Panel */}
      {showChat && selectedLeadId && (
        <div className="fixed inset-0 z-50 bg-background lg:hidden">
          <ChatPanel onClose={() => {
            selectLead(null)
            setShowChat(false)
          }} />
        </div>
      )}
    </div>
  )
}
