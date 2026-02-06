'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { X, Send, Loader2, Sparkles, RefreshCw, Maximize2, Minimize2, Image, FileText, Video, Mic, History, ChevronDown, ArrowLeft, Tag, Bell, MoreVertical, AlertCircle, MessageCircle, Copy, Check, Share2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { TemplateButton } from '@/components/message-templates'
import { AISuggestions } from '@/components/ai-suggestions'
import { logAction } from '@/components/action-history'

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
// Bug fix #32: Only treat known media markers as media (not arbitrary text starting with [)
// Bug fix #45: Added English variants (location, image, document, etc.) for Evolution API compatibility
// Bug fix #47: Added viewOnce variants for disappearing media messages
const renderMessageContent = (text: string, fromMe: boolean) => {
  const mediaPatterns = /^\[(mídia|media|imagem|image|foto|photo|vídeo|video|áudio|audio|ptt|voice|documento|document|arquivo|file|sticker|figurinha|gif|localização|location|contato|contact|viewonce|view once|visualização única)\]$/i
  const isMedia = mediaPatterns.test(text)
  
  if (isMedia) {
    const iconClass = `h-4 w-4 inline mr-1 ${fromMe ? 'text-green-100' : 'text-muted-foreground'}`
    const lowerText = text.toLowerCase()
    
    // Bug fix #45: Include English variants for Evolution API compatibility
    if (lowerText.includes('imagem') || lowerText.includes('image') || lowerText.includes('foto') || lowerText.includes('photo') || text === '[mídia]' || text === '[media]') {
      return (
        <span className="flex items-center gap-1 italic opacity-80">
          <Image className={iconClass} />
          <span>Imagem</span>
        </span>
      )
    }
    if (lowerText.includes('vídeo') || lowerText.includes('video')) {
      return (
        <span className="flex items-center gap-1 italic opacity-80">
          <Video className={iconClass} />
          <span>Vídeo</span>
        </span>
      )
    }
    if (lowerText.includes('áudio') || lowerText.includes('audio') || lowerText.includes('ptt') || lowerText.includes('voice')) {
      return (
        <span className="flex items-center gap-1 italic opacity-80">
          <Mic className={iconClass} />
          <span>Áudio</span>
        </span>
      )
    }
    if (lowerText.includes('documento') || lowerText.includes('document') || lowerText.includes('arquivo') || lowerText.includes('file')) {
      return (
        <span className="flex items-center gap-1 italic opacity-80">
          <FileText className={iconClass} />
          <span>Documento</span>
        </span>
      )
    }
    if (lowerText.includes('localização') || lowerText.includes('location')) {
      return (
        <span className="flex items-center gap-1 italic opacity-80">
          <Image className={iconClass} />
          <span>Localização</span>
        </span>
      )
    }
    if (lowerText.includes('contato') || lowerText.includes('contact')) {
      return (
        <span className="flex items-center gap-1 italic opacity-80">
          <FileText className={iconClass} />
          <span>Contato</span>
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
  const [newMessageIndicator, setNewMessageIndicator] = useState(0) // UX #142: Count of new messages while scrolled up
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null) // Bug fix #11: Mostrar erro de fetch
  const [retryCount, setRetryCount] = useState(0) // Bug fix #107: Track retry attempts
  const [analysisCopied, setAnalysisCopied] = useState(false) // UX #141: Copy analysis button state
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<Message[]>([]) // Bug fix #14: Track messages for comparison
  const isSendingRef = useRef(false) // Bug fix #15: Prevent double sends
  const analysisAbortRef = useRef<AbortController | null>(null) // Bug fix #26: Abort analysis on unmount
  const analysisLeadIdRef = useRef<string | null>(null) // Bug fix #25: Track which lead analysis is for
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Bug fix #107: Retry timeout reference

  // Scroll to bottom using scrollIntoView - UX #106: Improved reliability on mobile
  const scrollToBottom = (smooth = false) => {
    // Use requestAnimationFrame for more reliable scrolling
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'end' })
      setShowScrollButton(false)
    })
  }

  // Handle scroll to detect if user is at bottom
  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollButton(!isNearBottom)
    // UX #142: Clear new message indicator when user scrolls to bottom
    if (isNearBottom && newMessageIndicator > 0) {
      setNewMessageIndicator(0)
    }
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
      // Bug fix #107: Clear retry timeout on cleanup
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }
  }, [lead?.phone, isConnected])
  
  // Scroll to bottom when messages load or change
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      // UX #142: Check if user is scrolled up and new messages arrived
      const prevCount = messagesRef.current.length
      const newCount = messages.length
      const isScrolledUp = containerRef.current && 
        (containerRef.current.scrollHeight - containerRef.current.scrollTop - containerRef.current.clientHeight > 100)
      
      if (newCount > prevCount && isScrolledUp && !isFirstLoad) {
        // User is scrolled up and new messages arrived - show indicator
        const newMessagesCount = newCount - prevCount
        const lastNewMessage = messages[messages.length - 1]
        // Only count incoming messages (not from me)
        if (lastNewMessage && !lastNewMessage.fromMe) {
          setNewMessageIndicator(prev => prev + newMessagesCount)
          // Haptic feedback for new message
          if ('vibrate' in navigator) navigator.vibrate([5, 30, 5])
        }
      } else {
        // On first load or when at bottom, scroll instantly. On new messages, scroll smooth
        scrollToBottom(!isFirstLoad)
        setTimeout(() => scrollToBottom(!isFirstLoad), 100)
        setNewMessageIndicator(0)
      }
      
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

  // Bug fix #92: Keyboard shortcuts for quick replies (Alt+1 through Alt+7)
  // UX #123: Added Ctrl+R to refresh messages, Ctrl+Shift+A to analyze
  // UX #134: Added Escape to blur input when focused
  useEffect(() => {
    if (!lead || !isConnected) return
    
    const quickReplies = [
      'Olá! Tudo bem?',
      'Um momento, por favor',
      'Perfeito!',
      'Posso te ligar?',
      'Podemos agendar?',
      'Vou verificar os valores',
      'Obrigado pelo contato!',
    ]
    
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // Alt+1-7 for quick replies
      if (e.altKey && e.key >= '1' && e.key <= '7') {
        e.preventDefault()
        const idx = parseInt(e.key) - 1
        if (quickReplies[idx]) {
          setNewMessage(quickReplies[idx])
          // Haptic feedback
          if ('vibrate' in navigator) navigator.vibrate(10)
        }
        return
      }
      
      // Ctrl+R to refresh messages (without browser reload)
      if ((e.ctrlKey || e.metaKey) && e.key === 'r' && !e.shiftKey) {
        e.preventDefault()
        fetchMessages(true)
        if ('vibrate' in navigator) navigator.vibrate(10)
        return
      }
      
      // Ctrl+Shift+A to trigger AI analysis (computed inline to avoid dependency issue)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault()
        const canAnalyzeNow = lead && !['fechado', 'perdido'].includes(lead.status || '')
        if (canAnalyzeNow && !isAnalyzing) {
          handleAnalyze()
        }
        return
      }
      
      // UX #134: Escape to blur input when focused
      if (e.key === 'Escape' && document.activeElement?.tagName === 'TEXTAREA') {
        ;(document.activeElement as HTMLElement).blur()
        return
      }
    }
    
    window.addEventListener('keydown', handleKeyboardShortcuts)
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts)
  }, [lead?.phone, lead?.status, isConnected, isAnalyzing])

  const fetchMessages = async (showLoading: boolean, isRetry: boolean = false) => {
    if (!lead) return
    
    // Clear any pending retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    
    if (showLoading) {
      setIsLoading(true)
      // Bug fix #30: Clear error immediately when starting fresh fetch
      setFetchError(null)
    }
    
    // Bug fix #107: Reset retry count on explicit (non-auto) refresh
    if (!isRetry) {
      setRetryCount(0)
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
        setRetryCount(0) // Reset retry count on success
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
          setRetryCount(0)
        } else {
          // Bug fix #107: Auto-retry with exponential backoff (max 3 retries)
          handleFetchError('Não foi possível carregar mensagens')
        }
      } catch (fallbackErr: any) {
        // Bug fix #21: Ignore abort errors (intentional cancellation)
        if (fallbackErr?.name === 'AbortError') return
        console.error('Fallback also failed:', fallbackErr)
        // Bug fix #107: Auto-retry with exponential backoff
        handleFetchError('Erro ao carregar mensagens. Verifique a conexão.')
      }
    } finally {
      setIsLoading(false)
    }
  }
  
  // Bug fix #107: Handle fetch errors with auto-retry
  const handleFetchError = (errorMessage: string) => {
    const maxRetries = 3
    
    if (retryCount < maxRetries) {
      // Calculate backoff delay: 2s, 4s, 8s
      const backoffDelay = Math.pow(2, retryCount + 1) * 1000
      
      setRetryCount(prev => prev + 1)
      setFetchError(`${errorMessage} Tentando novamente em ${backoffDelay / 1000}s... (${retryCount + 1}/${maxRetries})`)
      
      // Schedule retry
      retryTimeoutRef.current = setTimeout(() => {
        fetchMessages(false, true)
      }, backoffDelay)
    } else {
      // Max retries reached
      setFetchError(`${errorMessage} (${maxRetries} tentativas falharam)`)
      setRetryCount(0)
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
                // Bug fix #31: Don't update if lead changed during analysis
                if (currentLeadId !== analysisLeadIdRef.current) return
                
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
      // Bug fix #44: Must still reset isAnalyzing on abort, otherwise button stays disabled
      if (err?.name === 'AbortError') {
        setIsAnalyzing(false)
        return
      }
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
      // Bug fix #91: URL encode phone to handle special characters (+, spaces)
      const res = await fetch(`/api/ai/history?phone=${encodeURIComponent(lead.phone)}&limit=5`)
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
        const sentMessageId = data.messageId || Date.now().toString()
        setMessages(prev => [...prev, {
          id: sentMessageId,
          text: newMessage.trim(),
          fromMe: true,
          timestamp: new Date().toISOString(),
        }])
        setNewMessage('')
        
        // UX #124: Visual success feedback - scroll to bottom with animation
        setTimeout(() => {
          scrollToBottom(true)
          // Flash effect on the sent message
          const msgElement = document.querySelector(`[data-message-id="${sentMessageId}"]`)
          if (msgElement) {
            msgElement.classList.add('message-sent-flash')
            setTimeout(() => msgElement.classList.remove('message-sent-flash'), 500)
          }
        }, 100)
        
        // Haptic feedback on success
        if ('vibrate' in navigator) navigator.vibrate([10, 50, 10])
        
        // Log action
        if (lead) {
          logAction({
            type: 'message_sent',
            leadId: lead.id,
            leadName: lead.name,
            details: { messagePreview: newMessage.trim().slice(0, 50) }
          })
        }
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

  // UX #158: Enhanced time formatting with relative time for recent messages
  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    // For very recent messages (< 1h), show relative time
    if (diffMs >= 0 && diffMins < 60) {
      if (diffMins < 1) return 'agora'
      return `há ${diffMins}min`
    }
    
    // For today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
    
    // For older messages, show date + time
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  
  // UX #77: Format date for day separators
  const formatDateSeparator = (timestamp: string) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoje'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem'
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      })
    }
  }
  
  // UX #77: Group messages by date
  // Bug fix #93: Handle messages without timestamp by grouping with previous message's date
  // Bug fix #96: Don't create new group for consecutive messages without timestamps
  // Bug fix #111: Improved logic to handle edge cases with null timestamps at start of conversation
  const getMessagesByDate = (messages: Message[]) => {
    if (messages.length === 0) return []
    
    const groups: { date: string; messages: Message[] }[] = []
    let currentDate = ''
    let lastValidTimestamp = ''
    
    // First pass: find any valid timestamp to use as fallback for leading null timestamps
    const firstValidTimestamp = messages.find(m => m.timestamp)?.timestamp || new Date().toISOString()
    
    for (const msg of messages) {
      // Use last valid timestamp if current message has none
      // If we haven't seen any valid timestamp yet, use the first valid one we found (or now)
      const effectiveTimestamp = msg.timestamp || lastValidTimestamp || firstValidTimestamp
      if (msg.timestamp) {
        lastValidTimestamp = msg.timestamp
      }
      
      const msgDate = new Date(effectiveTimestamp).toDateString()
      
      // Create new group only if:
      // 1. First message (no groups yet)
      // 2. Date is different from current group
      // Bug fix #111: Always have a valid date now, so comparison is simpler
      if (groups.length === 0 || msgDate !== currentDate) {
        currentDate = msgDate
        groups.push({ date: effectiveTimestamp, messages: [msg] })
      } else {
        groups[groups.length - 1].messages.push(msg)
      }
    }
    
    return groups
  }

  // Check if analysis should be available (not in final stages)
  const canAnalyze = lead && !['fechado', 'perdido'].includes(lead.status || '')

  // UX #110: Improved empty state with helpful tips when no lead is selected
  // UX #171: Enhanced accessibility with ARIA live regions
  if (!lead) {
    return (
      <div 
        className="h-full flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-transparent to-green-50/20"
        role="status"
        aria-live="polite"
      >
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4 empty-state-glow">
          <MessageCircle className="w-10 h-10 text-green-500" />
        </div>
        <h3 className="font-semibold text-base mb-2">Selecione uma conversa</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-[220px]">
          Clique em um lead no kanban para ver a conversa e enviar mensagens
        </p>
        <div className="space-y-2 text-xs text-muted-foreground max-w-[200px]">
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
            <span className="text-lg" aria-hidden="true">💡</span>
            <span>Arraste cards para mudar o status do lead</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
            <span className="text-lg" aria-hidden="true">🔔</span>
            <span>Crie lembretes para não esquecer follow-ups</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
            <span className="text-lg" aria-hidden="true">🤖</span>
            <span>Use a IA para analisar conversas</span>
          </div>
        </div>
        <p className="mt-6 text-[10px] text-muted-foreground/50">
          Atalho: <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Ctrl+K</kbd> para buscar leads
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - UX #98: Improved with connection indicator and last seen */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          {/* Mobile back button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 md:hidden -ml-1"
            onClick={onClose}
            aria-label="Voltar para lista de leads"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="relative">
            <Avatar className="h-8 w-8">
              {lead.profilePicUrl && (
                <AvatarImage src={lead.profilePicUrl} alt={lead.name} />
              )}
              <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* UX #98: Connection indicator dot */}
            {isConnected && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full" aria-label="Conectado" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-sm">{lead.name}</h3>
            {/* UX #155: Phone with copy button */}
            <p className="text-xs text-muted-foreground flex items-center gap-1 group">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(lead.phone.replace(/\D/g, ''))
                  // Show feedback
                  const btn = document.activeElement as HTMLButtonElement
                  if (btn) {
                    const originalTitle = btn.title
                    btn.title = 'Copiado!'
                    setTimeout(() => { btn.title = originalTitle }, 1500)
                  }
                  // Haptic
                  if ('vibrate' in navigator) navigator.vibrate(10)
                }}
                className="hover:text-foreground hover:underline underline-offset-2 transition-colors cursor-pointer"
                title="Clique para copiar"
              >
                {lead.phone}
              </button>
              <Copy 
                className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity cursor-pointer hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  navigator.clipboard.writeText(lead.phone.replace(/\D/g, ''))
                  if ('vibrate' in navigator) navigator.vibrate(10)
                }}
              />
              {/* UX #98: Show last message time if available */}
              {messages.length > 0 && messages[messages.length - 1]?.timestamp && (
                <span className="text-[10px] opacity-60">
                  · {(() => {
                    const lastTs = new Date(messages[messages.length - 1].timestamp!)
                    const now = new Date()
                    const diffMins = Math.floor((now.getTime() - lastTs.getTime()) / 60000)
                    if (diffMins < 1) return 'agora'
                    if (diffMins < 60) return `${diffMins}m atrás`
                    const diffHours = Math.floor(diffMins / 60)
                    if (diffHours < 24) return `${diffHours}h atrás`
                    return lastTs.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                  })()}
                </span>
              )}
            </p>
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
              {/* UX #141: Copy analysis button */}
              {analysis && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-6 w-6 transition-colors ${analysisCopied ? 'text-green-600' : 'text-purple-600 hover:text-purple-800'}`}
                  onClick={() => {
                    navigator.clipboard.writeText(analysis.replace(/\*\*/g, '').replace(/###?\s/g, ''))
                    setAnalysisCopied(true)
                    if ('vibrate' in navigator) navigator.vibrate(10)
                    setTimeout(() => setAnalysisCopied(false), 2000)
                  }}
                  title={analysisCopied ? 'Copiado!' : 'Copiar análise'}
                >
                  {analysisCopied ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              )}
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
          // UX #69 + UX #135: Improved empty state with conversation starters and contextual tips
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mb-4 shadow-sm">
              <Send className="w-7 h-7 text-green-500" />
            </div>
            <h3 className="font-medium text-base mb-1">Iniciar conversa</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-[200px]">
              Seja o primeiro a enviar uma mensagem para {lead?.name?.split(' ')[0] || 'este contato'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-[280px] mb-4">
              {[
                '👋 Olá! Tudo bem?',
                '📞 Posso te ligar?',
                '❓ Posso ajudar?'
              ].map((starter, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setNewMessage(starter)
                    // Haptic feedback
                    if ('vibrate' in navigator) navigator.vibrate(10)
                  }}
                  className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-full text-xs transition-all border border-green-200 hover:shadow-sm active:scale-95"
                >
                  {starter}
                </button>
              ))}
            </div>
            {/* UX #135: Contextual tips */}
            <div className="text-[10px] text-muted-foreground/70 space-y-1 max-w-[220px]">
              <p>💡 Dica: Use <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Alt+1-7</kbd> para respostas rápidas</p>
              <p>⌨️ <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Enter</kbd> envia, <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Shift+Enter</kbd> nova linha</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* UX #77: Messages grouped by date with separators */}
            {getMessagesByDate(messages).map((group, groupIdx) => (
              <div key={group.date || groupIdx}>
                {/* Date separator */}
                {group.date && (
                  <div className="flex items-center justify-center my-3">
                    <div className="px-3 py-1 bg-muted/60 rounded-full text-[10px] text-muted-foreground font-medium">
                      {formatDateSeparator(group.date)}
                    </div>
                  </div>
                )}
                {/* Messages for this date */}
                <div className="space-y-2">
                  {group.messages.map((msg) => (
                    <div
                      key={msg.id}
                      data-message-id={msg.id}
                      className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} animate-in fade-in-0 slide-in-from-bottom-2 duration-200`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm transition-colors ${
                          msg.fromMe
                            ? 'bg-green-500 text-white'
                            : 'bg-muted'
                        }`}
                      >
                        {renderMessageContent(msg.text, msg.fromMe)}
                        <p className={`text-[10px] mt-1 flex items-center gap-1 ${msg.fromMe ? 'text-green-100' : 'text-muted-foreground'}`}>
                          {formatTime(msg.timestamp)}
                          {/* UX #125: Show sent indicator for own messages */}
                          {msg.fromMe && (
                            <svg className="w-3 h-3 inline-block" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M12.354 5.354a.5.5 0 0 0-.708-.708L6.5 9.793 4.354 7.646a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l5.5-5.5z"/>
                            </svg>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Scroll to bottom button - UX #142: Shows new message count when scrolled up */}
        {showScrollButton && messages.length > 0 && (
          <Button
            size="icon"
            className={`absolute bottom-4 right-4 h-8 w-8 rounded-full shadow-lg border animate-in fade-in-0 zoom-in-75 duration-200 ${
              newMessageIndicator > 0 
                ? 'bg-green-500 hover:bg-green-600 border-green-400' 
                : 'bg-white hover:bg-gray-50'
            }`}
            onClick={() => {
              scrollToBottom(true)
              setNewMessageIndicator(0)
            }}
          >
            {newMessageIndicator > 0 ? (
              <div className="flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">
                  {newMessageIndicator > 9 ? '9+' : newMessageIndicator}
                </span>
              </div>
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-600" />
            )}
          </Button>
        )}
        
        {/* UX #142: Floating new message toast when scrolled up */}
        {newMessageIndicator > 0 && showScrollButton && (
          <div 
            className="absolute bottom-14 right-4 bg-green-500 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-medium animate-in slide-in-from-bottom-2 cursor-pointer hover:bg-green-600 transition-colors"
            onClick={() => {
              scrollToBottom(true)
              setNewMessageIndicator(0)
            }}
          >
            {newMessageIndicator} nova{newMessageIndicator > 1 ? 's' : ''} mensagem{newMessageIndicator > 1 ? 's' : ''} ↓
          </div>
        )}
      </div>

      {/* Quick Replies - Bug fix #23: Only show when connected */}
      {/* UX #70/#102: Improved quick replies with better mobile scrolling and compact mode */}
      {lead && messages.length > 0 && isConnected && (
        <div className="px-2 pt-2 border-t bg-gradient-to-r from-gray-50/80 to-green-50/30">
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory -mx-2 px-2">
            {[
              { emoji: '👋', text: 'Olá! Tudo bem?', short: 'Olá!', shortcut: '1' },
              { emoji: '⏰', text: 'Um momento, por favor', short: 'Um momento', shortcut: '2' },
              { emoji: '✅', text: 'Perfeito!', short: 'Perfeito!', shortcut: '3' },
              { emoji: '📞', text: 'Posso te ligar?', short: 'Ligar?', shortcut: '4' },
              { emoji: '📅', text: 'Podemos agendar?', short: 'Agendar?', shortcut: '5' },
              { emoji: '💰', text: 'Vou verificar os valores', short: 'Ver valores', shortcut: '6' },
              { emoji: '🙏', text: 'Obrigado pelo contato!', short: 'Obrigado!', shortcut: '7' },
            ].map((reply, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs whitespace-nowrap shrink-0 hover:bg-green-100 hover:border-green-400 hover:text-green-800 hover:shadow-sm active:scale-95 transition-all focus:ring-2 focus:ring-green-300 focus:ring-offset-1 snap-start touch-manipulation min-w-[60px]"
                onClick={() => {
                  setNewMessage(reply.text)
                  // UX: Haptic feedback
                  if ('vibrate' in navigator) navigator.vibrate(10)
                }}
                disabled={isSending}
                title={`${reply.text} (Alt+${reply.shortcut})`}
                aria-label={`Resposta rápida: ${reply.text}`}
              >
                <span className="mr-0.5">{reply.emoji}</span>
                <span className="hidden sm:inline">{reply.text}</span>
                <span className="sm:hidden">{reply.short}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      {messages.length > 0 && (
        <AISuggestions
          messages={messages.map(m => ({ role: m.fromMe ? 'assistant' : 'user', content: m.text }))}
          leadName={lead?.name}
          onSelectSuggestion={(text) => setNewMessage(text)}
        />
      )}

      {/* Input - UX #67: Improved with multiline support and character counter */}
      {/* UX #132: Show offline warning when not connected */}
      {/* UX #172: Enhanced offline state with reconnection info */}
      {!isConnected && (
        <div className="px-3 py-2 bg-amber-50 border-t border-amber-200 flex items-center gap-2 text-amber-700 text-xs animate-in fade-in-0 duration-200">
          <div className="relative">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
          </div>
          <span className="flex-1">
            Modo offline. Mensagens serão enviadas quando reconectar.
            <a href="/connect" className="ml-1 underline hover:text-amber-900 font-medium">
              Reconectar →
            </a>
          </span>
        </div>
      )}
      <div className="p-3 border-t">
        {sendError && (
          <div className="mb-2 px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-600 animate-in fade-in-0 duration-200">
            {sendError}
          </div>
        )}
        {/* UX #84: Sending indicator above input */}
        {isSending && (
          <div className="mb-2 flex items-center gap-2 text-xs text-green-600 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Enviando mensagem...</span>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <TemplateButton onSelect={(content) => setNewMessage(content)} />
          <div className="flex-1 relative">
            <textarea
              placeholder="Mensagem... ⏎ enviar · ⇧⏎ nova linha"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`w-full min-h-[36px] max-h-32 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                isSending ? 'bg-green-50/50 border-green-300' : ''
              }`}
              style={{ height: Math.min(Math.max(36, newMessage.split('\n').length * 20 + 16), 128) }}
              disabled={isSending}
              rows={1}
              aria-label="Campo de mensagem. Enter para enviar, Shift+Enter para nova linha"
            />
            {/* UX #68: Character counter when message is getting long */}
            {newMessage.length > 100 && !isSending && (
              <span className={`absolute bottom-1 right-2 text-[10px] ${
                newMessage.length > 1000 ? 'text-amber-500' : 'text-muted-foreground'
              }`}>
                {newMessage.length}
              </span>
            )}
          </div>
          <Button 
            size="sm" 
            className={`h-9 shrink-0 transition-all ${
              isSending 
                ? 'bg-green-400 cursor-not-allowed' 
                : 'bg-green-500 hover:bg-green-600'
            }`}
            onClick={sendMessage}
            disabled={isSending || !newMessage.trim()}
            title="Enviar mensagem (Enter)"
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
