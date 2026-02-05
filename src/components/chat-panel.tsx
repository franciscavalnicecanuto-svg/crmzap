'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { X, Send, Loader2, Sparkles, RefreshCw, Maximize2, Minimize2, Image, FileText, Video, Mic, History, ChevronDown, ArrowLeft, Tag, Bell, MoreVertical, AlertCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'

// Message skeleton for loading state
const MessageSkeleton = ({ fromMe = false }: { fromMe?: boolean }) => (
  <div className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[80%] rounded-lg px-3 py-2 ${fromMe ? 'bg-green-100' : 'bg-muted'}`}>
      <Skeleton className={`h-4 ${fromMe ? 'w-32' : 'w-48'} mb-1`} />
      <Skeleton className={`h-4 ${fromMe ? 'w-24' : 'w-40'}`} />
      <Skeleton className="h-2 w-12 mt-2" />
    </div>
  </div>
)

interface Message {
  id: string
  text: string
  fromMe: boolean
  timestamp: string | null
}

interface ChatPanelProps {
  lead: {
    id: string
    name: string
    phone: string
    status?: string
    profilePicUrl?: string | null
    tags?: string[]
    reminderDate?: string
  } | null
  onClose: () => void
  isConnected?: boolean // Bug fix: check connection before polling
  onTagsUpdate?: (leadId: string, tags: string[]) => void // Callback to update lead tags from AI
  onOpenTags?: () => void // Open tags modal
  onOpenReminder?: () => void // Open reminder modal
}

// Helper to render media messages with icons
const renderMessageContent = (text: string, fromMe: boolean) => {
  const isMedia = text === '[mídia]' || text.startsWith('[')
  
  if (isMedia) {
    const iconClass = `h-4 w-4 inline mr-1 ${fromMe ? 'text-green-100' : 'text-muted-foreground'}`
    
    if (text.includes('imagem') || text.includes('foto') || text === '[mídia]') {
      return (
        <span className="flex items-center gap-1 italic opacity-80">
          <Image className={iconClass} />
          <span>Imagem</span>
        </span>
      )
    }
    if (text.includes('vídeo') || text.includes('video')) {
      return (
        <span className="flex items-center gap-1 italic opacity-80">
          <Video className={iconClass} />
          <span>Vídeo</span>
        </span>
      )
    }
    if (text.includes('áudio') || text.includes('audio') || text.includes('ptt')) {
      return (
        <span className="flex items-center gap-1 italic opacity-80">
          <Mic className={iconClass} />
          <span>Áudio</span>
        </span>
      )
    }
    if (text.includes('documento') || text.includes('arquivo')) {
      return (
        <span className="flex items-center gap-1 italic opacity-80">
          <FileText className={iconClass} />
          <span>Documento</span>
        </span>
      )
    }
    // Default media
    return (
      <span className="flex items-center gap-1 italic opacity-80">
        <Image className={iconClass} />
        <span>Mídia</span>
      </span>
    )
  }
  
  return <span className="whitespace-pre-wrap break-words">{text}</span>
}

export function ChatPanel({ lead, onClose, isConnected = true, onTagsUpdate, onOpenTags, onOpenReminder }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [expandedAnalysis, setExpandedAnalysis] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisStatus, setAnalysisStatus] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false) // Bug fix #22: Loading state for history
  const [sendError, setSendError] = useState<string | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null) // Bug fix #11: Mostrar erro de fetch
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<Message[]>([]) // Bug fix #14: Track messages for comparison
  const isSendingRef = useRef(false) // Bug fix #15: Prevent double sends
  const analysisAbortRef = useRef<AbortController | null>(null) // Bug fix #26: Abort analysis on unmount
  const analysisLeadIdRef = useRef<string | null>(null) // Bug fix #25: Track which lead analysis is for

  // Scroll to bottom using scrollIntoView
  const scrollToBottom = (smooth = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
    setShowScrollButton(false)
  }

  // Handle scroll to detect if user is at bottom
  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollButton(!isNearBottom)
  }

  // Mark conversation as read on server
  const markAsRead = async (phone: string) => {
    try {
      await fetch('/api/leads/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  // Bug fix #18: AbortController to cancel fetches on unmount
  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch messages when lead changes + polling every 10s
  useEffect(() => {
    // Cancel any pending fetch
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    if (lead) {
      fetchMessages(true)
      // Mark as read when opening conversation
      markAsRead(lead.phone)
      setAnalysis(null)
      setAnalysisError(null)
      setShowAnalysis(false)
      
      // BUG #9 FIX: Polling ajustado para 15s (era 5s - muito agressivo)
      if (isConnected) {
        const interval = setInterval(() => {
          fetchMessages(false)
        }, 15000) // 15 segundos - balanceado entre UX e recursos
        
        return () => {
          clearInterval(interval)
          abortControllerRef.current?.abort()
        }
      }
    } else {
      setMessages([])
    }
    
    return () => {
      abortControllerRef.current?.abort()
      analysisAbortRef.current?.abort() // Bug fix #26: Cancel analysis on unmount/lead change
    }
  }, [lead?.phone, isConnected])
  
  // Scroll to bottom when messages load or change
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      // On first load, scroll instantly. On new messages, scroll smooth
      scrollToBottom(!isFirstLoad)
      setTimeout(() => scrollToBottom(!isFirstLoad), 100)
      if (isFirstLoad) {
        setIsFirstLoad(false)
      }
    }
    // Bug fix #14: Keep ref in sync with state
    messagesRef.current = messages
  }, [messages, isLoading])

  // Reset first load when lead changes
  useEffect(() => {
    setIsFirstLoad(true)
    setShowScrollButton(false)
  }, [lead?.phone])

  const fetchMessages = async (showLoading: boolean) => {
    if (!lead) return
    
    if (showLoading) {
      setIsLoading(true)
      // Bug fix #30: Clear error immediately when starting fresh fetch
      setFetchError(null)
    }
    try {
      // Usa API de polling direto da Evolution (não depende de webhook)
      // Bug fix #21: Pass AbortController signal to cancel pending requests
      const res = await fetch('/api/messages/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: lead.phone, limit: 100 }),
        signal: abortControllerRef.current?.signal,
      })
      const data = await res.json()
      
      if (data.success && data.messages) {
        // Bug fix #14: Use ref to avoid stale closure comparison
        const newCount = data.messages.length
        const oldCount = messagesRef.current.length
        const lastNewId = data.messages[data.messages.length - 1]?.id
        const lastOldId = messagesRef.current[messagesRef.current.length - 1]?.id
        
        if (newCount !== oldCount || lastNewId !== lastOldId) {
          setMessages(data.messages)
        }
        // Bug fix #20: Clear error on successful main API fetch
        setFetchError(null)
      }
    } catch (err: any) {
      // Bug fix #21: Ignore abort errors (intentional cancellation)
      if (err?.name === 'AbortError') return
      console.error('Failed to fetch messages:', err)
      // Fallback: tentar API antiga
      try {
        const fallbackRes = await fetch('/api/whatsapp/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: lead.phone }),
          signal: abortControllerRef.current?.signal,
        })
        const fallbackData = await fallbackRes.json()
        if (fallbackData.success) {
          setMessages(fallbackData.messages || [])
          setFetchError(null)
        } else {
          setFetchError('Não foi possível carregar mensagens')
        }
      } catch (fallbackErr: any) {
        // Bug fix #21: Ignore abort errors (intentional cancellation)
        if (fallbackErr?.name === 'AbortError') return
        console.error('Fallback also failed:', fallbackErr)
        // Bug fix #11: Mostrar erro para o usuário
        setFetchError('Erro ao carregar mensagens. Verifique a conexão.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (messages.length === 0) {
      setAnalysisError('Nenhuma mensagem para analisar.')
      setShowAnalysis(true)
      return
    }

    // Bug fix #26: Cancel any previous analysis and track current lead
    analysisAbortRef.current?.abort()
    analysisAbortRef.current = new AbortController()
    const currentLeadId = lead?.id // Bug fix #25: Capture lead ID at start
    analysisLeadIdRef.current = currentLeadId || null

    setIsAnalyzing(true)
    setShowAnalysis(true)
    setShowHistory(false)
    setAnalysis(null)
    setAnalysisError(null)
    setAnalysisProgress(0)
    setAnalysisStatus('Iniciando análise...')

    // Convert messages to format expected
    const recentMessages = messages.slice(-50)
    const conversationMessages = recentMessages.map(m => ({
      role: (m.fromMe ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.text,
    }))

    const stage = lead?.status || 'negociando'

    try {
      // Use streaming API with abort signal
      const response = await fetch('/api/ai/analyze/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationMessages,
          stage,
          leadPhone: lead?.phone,
          leadName: lead?.name,
        }),
        signal: analysisAbortRef.current.signal, // Bug fix #26: Allow cancellation
      })

      if (!response.ok) {
        throw new Error('Falha ao conectar com a IA')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        // Bug fix #26: Check if aborted during read
        if (analysisAbortRef.current?.signal.aborted) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'progress') {
                setAnalysisProgress(data.percent)
                setAnalysisStatus(data.message)
              } else if (data.type === 'content') {
                fullContent += data.content
                setAnalysis(fullContent)
                setAnalysisProgress(data.percent)
              } else if (data.type === 'complete') {
                setAnalysisProgress(100)
                setAnalysisStatus('Concluído!')
                setAnalysis(data.analysis)
                
                // Bug fix #25: Only update tags if still on same lead
                if (data.analysis && onTagsUpdate && currentLeadId && analysisLeadIdRef.current === currentLeadId) {
                  try {
                    const tagsMatch = data.analysis.match(/TAGS_JSON:\s*```json\s*([\s\S]*?)```/)
                    if (tagsMatch) {
                      const tagsJson = JSON.parse(tagsMatch[1])
                      const newTags: string[] = []
                      
                      if (tagsJson.interesse) {
                        newTags.push(`Interesse: ${tagsJson.interesse}`)
                      }
                      if (tagsJson.objecao) {
                        newTags.push(`Objeção: ${tagsJson.objecao}`)
                      }
                      if (tagsJson.urgente === true) {
                        newTags.push('Urgente')
                      }
                      if (tagsJson.vip === true) {
                        newTags.push('VIP')
                      }
                      
                      if (newTags.length > 0) {
                        onTagsUpdate(currentLeadId, newTags)
                      }
                    }
                  } catch (tagErr) {
                    console.log('Could not extract tags from analysis')
                  }
                }
              } else if (data.type === 'error') {
                setAnalysisError(data.message)
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (err: any) {
      // Bug fix #26: Ignore abort errors
      if (err?.name === 'AbortError') return
      console.error('Analysis error:', err)
      setAnalysisError(err.message || 'Erro ao gerar análise')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const fetchHistory = async () => {
    if (!lead?.phone) return
    
    setIsLoadingHistory(true) // Bug fix #22: Show loading state
    try {
      const res = await fetch(`/api/ai/history?phone=${lead.phone}&limit=5`)
      const data = await res.json()
      if (data.success) {
        setAnalysisHistory(data.analyses || [])
        setShowHistory(true)
        setShowAnalysis(true)
      }
    } catch (err) {
      console.error('Failed to fetch history:', err)
    } finally {
      setIsLoadingHistory(false) // Bug fix #22: Clear loading state
    }
  }

  const sendMessage = async () => {
    // Bug fix #15: Prevent double sends from rapid key presses
    if (!lead || !newMessage.trim() || isSendingRef.current) return
    isSendingRef.current = true

    setIsSending(true)
    setSendError(null)
    
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: lead.phone, 
          message: newMessage.trim() 
        }),
      })
      const data = await res.json()
      
      if (data.success) {
        setMessages(prev => [...prev, {
          id: data.messageId || Date.now().toString(),
          text: newMessage.trim(),
          fromMe: true,
          timestamp: new Date().toISOString(),
        }])
        setNewMessage('')
      } else {
        setSendError(data.error || 'Falha ao enviar mensagem')
        // Clear error after 5 seconds
        setTimeout(() => setSendError(null), 5000)
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      setSendError('Erro de conexão. Verifique sua internet.')
      setTimeout(() => setSendError(null), 5000)
    } finally {
      setIsSending(false)
      isSendingRef.current = false // Bug fix #15: Reset ref
    }
  }

  // Bug fix: Use onKeyDown instead of deprecated onKeyPress
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  // Check if analysis should be available (not in final stages)
  const canAnalyze = lead && !['fechado', 'perdido'].includes(lead.status || '')

  if (!lead) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Selecione um lead para ver a conversa
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          {/* Mobile back button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 md:hidden -ml-1"
            onClick={onClose}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-8 w-8">
            {lead.profilePicUrl && (
              <AvatarImage src={lead.profilePicUrl} alt={lead.name} />
            )}
            <AvatarFallback className="bg-green-100 text-green-700 text-xs">
              {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium text-sm">{lead.name}</h3>
            <p className="text-xs text-muted-foreground">{lead.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Tags button */}
          {onOpenTags && (
            <Button 
              variant="outline"
              size="icon" 
              className="h-8 w-8"
              onClick={onOpenTags}
              title="Gerenciar tags"
            >
              <Tag className="h-4 w-4" />
            </Button>
          )}
          {/* Reminder button */}
          {onOpenReminder && !lead.reminderDate && (
            <Button 
              variant="outline"
              size="icon" 
              className="h-8 w-8"
              onClick={onOpenReminder}
              title="Criar lembrete"
            >
              <Bell className="h-4 w-4" />
            </Button>
          )}
          {lead.reminderDate && (
            <Button 
              variant="outline"
              size="icon" 
              className="h-8 w-8 border-amber-500 text-amber-600"
              onClick={onOpenReminder}
              title="Lembrete agendado"
            >
              <Bell className="h-4 w-4" />
            </Button>
          )}
          {canAnalyze && (
            <Button 
              variant="default"
              size="sm" 
              className="h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              title="Analisar conversa com IA"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="text-xs font-medium hidden sm:inline">Analisar</span>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 hidden md:flex" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Analysis Panel - Bug fix: larger panel with expand option */}
      {showAnalysis && (
        <div className={`border-b bg-purple-50 p-3 overflow-y-auto transition-all ${
          expandedAnalysis ? 'max-h-[70vh]' : 'max-h-80'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-purple-700">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium text-sm">Análise IA</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-xs text-purple-500 hover:text-purple-700"
                onClick={fetchHistory}
                disabled={isLoadingHistory}
                title="Ver histórico"
              >
                {isLoadingHistory ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <History className="h-3 w-3 mr-1" />
                )}
                Histórico
              </Button>
            </div>
            <div className="flex items-center gap-1">
              {analysis && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-purple-600 hover:text-purple-800"
                  onClick={() => setExpandedAnalysis(!expandedAnalysis)}
                  title={expandedAnalysis ? 'Minimizar' : 'Expandir'}
                >
                  {expandedAnalysis ? (
                    <Minimize2 className="h-3 w-3" />
                  ) : (
                    <Maximize2 className="h-3 w-3" />
                  )}
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-purple-600 hover:text-purple-800"
                onClick={() => setShowAnalysis(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {isAnalyzing ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-purple-600">{analysisStatus || 'Analisando...'}</span>
                <span className="text-purple-500 font-medium">{analysisProgress}%</span>
              </div>
              <Progress value={analysisProgress} className="h-2 bg-purple-100" />
              {analysis && (
                <div className="mt-3 text-sm text-purple-900 whitespace-pre-wrap opacity-80">
                  {analysis}
                </div>
              )}
            </div>
          ) : showHistory && analysisHistory.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-purple-700">Análises anteriores:</p>
              {analysisHistory.map((item, idx) => (
                <div key={item.id || idx} className="p-2 bg-white rounded border border-purple-200">
                  <div className="flex justify-between text-xs text-purple-500 mb-1">
                    <span>{new Date(item.created_at).toLocaleString('pt-BR')}</span>
                    <span>{item.stage}</span>
                  </div>
                  <p className="text-xs text-purple-800 line-clamp-3">{item.analysis?.slice(0, 200)}...</p>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 text-xs mt-1 text-purple-600"
                    onClick={() => {
                      setAnalysis(item.analysis)
                      setShowHistory(false)
                    }}
                  >
                    Ver completa
                  </Button>
                </div>
              ))}
            </div>
          ) : analysisError ? (
            // Bug fix: Show error with retry button
            <div className="text-sm">
              <p className="text-red-600 mb-2">{analysisError}</p>
              <Button 
                size="sm" 
                variant="outline"
                className="h-7 text-xs border-purple-300 text-purple-600"
                onClick={handleAnalyze}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Tentar novamente
              </Button>
            </div>
          ) : analysis ? (
            <div className="text-sm text-purple-900 whitespace-pre-wrap">
              {analysis.split('\n').map((line, i) => {
                // Section headers with emojis
                if (line.match(/^###?\s/)) {
                  return <p key={i} className="font-bold mt-3 mb-1 text-purple-800">{line.replace(/^###?\s/, '')}</p>
                }
                // Bold headers (markdown style)
                if (line.match(/^\*\*.*\*\*:?$/)) {
                  return <p key={i} className="font-semibold mt-2 mb-1">{line.replace(/\*\*/g, '')}</p>
                }
                // Headers with numbers
                if (line.match(/^\d+\.\s*\*\*/)) {
                  return <p key={i} className="font-semibold mt-2 mb-1">{line.replace(/\*\*/g, '')}</p>
                }
                // Bullet points
                if (line.match(/^[-•]\s/)) {
                  return <p key={i} className="ml-3 my-0.5">{line}</p>
                }
                // Checkbox items
                if (line.match(/^-\s*\[\s*\]/)) {
                  return <p key={i} className="ml-3 my-0.5 text-purple-700">{line}</p>
                }
                // Table rows (simple rendering)
                if (line.includes('|')) {
                  return <p key={i} className="font-mono text-xs my-0.5 overflow-x-auto">{line}</p>
                }
                // Regular text
                return line.trim() ? <p key={i} className="my-1">{line.replace(/\*\*/g, '')}</p> : <br key={i} />
              })}
            </div>
          ) : null}
        </div>
      )}

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-3 relative" 
        ref={containerRef}
        onScroll={handleScroll}
      >
        {isLoading && isFirstLoad ? (
          // Skeleton loading - looks like real messages
          <div className="space-y-3 animate-pulse">
            <MessageSkeleton fromMe={false} />
            <MessageSkeleton fromMe={true} />
            <MessageSkeleton fromMe={false} />
            <MessageSkeleton fromMe={false} />
            <MessageSkeleton fromMe={true} />
            <MessageSkeleton fromMe={false} />
          </div>
        ) : fetchError ? (
          // Bug fix #11: Mostrar erro de fetch
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">{fetchError}</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => { setFetchError(null); fetchMessages(true) }}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Tentar novamente
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Nenhuma mensagem ainda. Envie a primeira!
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} animate-in fade-in-0 slide-in-from-bottom-2 duration-200`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.fromMe
                      ? 'bg-green-500 text-white'
                      : 'bg-muted'
                  }`}
                >
                  {renderMessageContent(msg.text, msg.fromMe)}
                  <p className={`text-[10px] mt-1 ${msg.fromMe ? 'text-green-100' : 'text-muted-foreground'}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Scroll to bottom button */}
        {showScrollButton && messages.length > 0 && (
          <Button
            size="icon"
            className="absolute bottom-4 right-4 h-8 w-8 rounded-full bg-white shadow-lg border hover:bg-gray-50 animate-in fade-in-0 zoom-in-75 duration-200"
            onClick={() => scrollToBottom(true)}
          >
            <ChevronDown className="h-4 w-4 text-gray-600" />
          </Button>
        )}
      </div>

      {/* Quick Replies - Bug fix #23: Only show when connected */}
      {lead && messages.length > 0 && isConnected && (
        <div className="px-3 pt-2 border-t bg-gray-50/50">
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { emoji: '👋', text: 'Olá! Tudo bem?' },
              { emoji: '⏰', text: 'Um momento, por favor' },
              { emoji: '✅', text: 'Perfeito!' },
              { emoji: '📞', text: 'Posso te ligar?' },
              { emoji: '📅', text: 'Podemos agendar?' },
              { emoji: '💰', text: 'Vou verificar os valores' },
              { emoji: '🙏', text: 'Obrigado pelo contato!' },
            ].map((reply, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs whitespace-nowrap shrink-0 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
                onClick={() => {
                  setNewMessage(reply.text)
                }}
                disabled={isSending}
              >
                <span className="mr-1">{reply.emoji}</span>
                {reply.text}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t">
        {sendError && (
          <div className="mb-2 px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-600">
            {sendError}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="Digite uma mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 h-9 text-sm"
            disabled={isSending}
          />
          <Button 
            size="sm" 
            className="h-9 bg-green-500 hover:bg-green-600"
            onClick={sendMessage}
            disabled={isSending || !newMessage.trim()}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
