'use client'

import { useState, useRef, useEffect } from 'react'
import { useLeadsStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  Send, 
  Phone, 
  MoreVertical, 
  X,
  Image as ImageIcon,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Clock
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ChatPanelProps {
  onClose?: () => void
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const { getSelectedLead, selectedLeadId, addMessage, connectionState } = useLeadsStore()
  const lead = getSelectedLead()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lead?.messages])
  
  if (!lead) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
        <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Send className="w-10 h-10" />
        </div>
        <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
        <p className="text-sm text-center">
          Clique em um lead no Kanban para ver e enviar mensagens
        </p>
      </div>
    )
  }
  
  const handleSend = async () => {
    if (!message.trim() || sending) return
    
    setSending(true)
    
    // Add message locally
    addMessage(lead.id, {
      text: message,
      timestamp: new Date(),
      fromMe: true,
    })
    
    // TODO: Send via Evolution API
    // await evolutionApi.sendText(lead.phone, message)
    
    setMessage('')
    setSending(false)
  }
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  const openWhatsApp = () => {
    const cleanPhone = lead.phone.replace(/\D/g, '')
    window.open(`https://wa.me/${cleanPhone}`, '_blank')
  }

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{lead.name}</h3>
            <p className="text-xs text-muted-foreground">
              {connectionState === 'connected' ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Online
                </span>
              ) : (
                lead.phone
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={openWhatsApp} title="Abrir no WhatsApp">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-4 h-4" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {/* Connection notice */}
          {connectionState !== 'connected' && (
            <div className="flex justify-center">
              <Badge variant="secondary" className="text-xs">
                Conecte seu WhatsApp para enviar mensagens
              </Badge>
            </div>
          )}
          
          {/* Messages */}
          {lead.messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>Nenhuma mensagem ainda</p>
              {lead.lastMessage && (
                <div className="mt-4 p-3 rounded-lg bg-muted/50 max-w-[80%] mx-auto">
                  <p className="text-xs text-muted-foreground mb-1">Última mensagem registrada:</p>
                  <p className="text-sm">{lead.lastMessage}</p>
                </div>
              )}
            </div>
          ) : (
            lead.messages.map((msg, index) => (
              <div
                key={msg.id || index}
                className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    msg.fromMe
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  <div className={`flex items-center justify-end gap-1 mt-1 ${
                    msg.fromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    <span className="text-[10px]">
                      {format(new Date(msg.timestamp), 'HH:mm', { locale: ptBR })}
                    </span>
                    {msg.fromMe && (
                      <CheckCheck className="w-3 h-3" />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      
      {/* Input */}
      <div className="p-4 border-t bg-card">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="shrink-0">
            <Smile className="w-5 h-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0">
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          </Button>
          <Input
            placeholder="Digite uma mensagem..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={connectionState !== 'connected'}
          />
          <Button 
            size="icon" 
            className="shrink-0 whatsapp-gradient text-white"
            onClick={handleSend}
            disabled={!message.trim() || sending || connectionState !== 'connected'}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {connectionState !== 'connected' && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            <a href="/connect" className="text-primary hover:underline">
              Conecte seu WhatsApp
            </a>
            {' '}para enviar mensagens
          </p>
        )}
      </div>
    </div>
  )
}
