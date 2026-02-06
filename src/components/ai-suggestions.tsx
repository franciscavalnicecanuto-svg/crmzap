'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, Loader2, RefreshCw, AlertCircle, MessageCircle, DollarSign, HelpCircle, ThumbsUp, ShoppingCart, Hand, Zap, WifiOff, X, Clock } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AISuggestionsProps {
  messages: Message[]
  leadName?: string
  onSelectSuggestion: (text: string) => void
}

const INTENT_ICONS: Record<string, React.ElementType> = {
  preço: DollarSign,
  dúvida: HelpCircle,
  objeção: AlertCircle,
  interesse: ThumbsUp,
  fechamento: ShoppingCart,
  saudação: Hand,
  outro: MessageCircle
}

const INTENT_COLORS: Record<string, string> = {
  preço: 'bg-green-100 text-green-700 border-green-200',
  dúvida: 'bg-blue-100 text-blue-700 border-blue-200',
  objeção: 'bg-red-100 text-red-700 border-red-200',
  interesse: 'bg-purple-100 text-purple-700 border-purple-200',
  fechamento: 'bg-amber-100 text-amber-700 border-amber-200',
  saudação: 'bg-gray-100 text-gray-700 border-gray-200',
  outro: 'bg-gray-100 text-gray-700 border-gray-200'
}

// UX #140: Smart local fallback suggestions based on conversation patterns
const LOCAL_FALLBACK_SUGGESTIONS: Record<string, { suggestions: string[], intent: string, intentLabel: string }> = {
  greeting: {
    suggestions: ['Olá! Tudo bem?', 'Oi! Posso ajudar?', 'Bom dia! Em que posso ajudar?'],
    intent: 'saudação',
    intentLabel: 'Saudação'
  },
  price: {
    suggestions: ['O valor é R$ [valor]', 'Posso parcelar em até 12x', 'Temos condições especiais hoje!'],
    intent: 'preço',
    intentLabel: 'Pergunta sobre preço'
  },
  question: {
    suggestions: ['Boa pergunta! Deixa eu explicar...', 'Claro, vou te explicar melhor', 'Vou te mandar mais detalhes'],
    intent: 'dúvida',
    intentLabel: 'Dúvida do cliente'
  },
  objection: {
    suggestions: ['Entendo sua preocupação', 'Posso te dar um desconto especial', 'Vamos encontrar uma solução'],
    intent: 'objeção',
    intentLabel: 'Objeção'
  },
  closing: {
    suggestions: ['Perfeito! Vou enviar os dados', 'Quer pagar por Pix ou cartão?', 'Fechado! Vou te mandar o link'],
    intent: 'fechamento',
    intentLabel: 'Momento de fechar'
  },
  default: {
    suggestions: ['Entendi!', 'Posso te ajudar com mais algo?', 'Vou verificar e te retorno'],
    intent: 'outro',
    intentLabel: 'Conversa geral'
  }
}

// UX #140: Detect intent from last message for local fallback
function detectLocalIntent(lastMessage: string): keyof typeof LOCAL_FALLBACK_SUGGESTIONS {
  const text = lastMessage.toLowerCase()
  
  if (/quanto|preço|valor|custa|pagar|parcel/i.test(text)) return 'price'
  if (/oi|olá|bom dia|boa tarde|boa noite|hey|hello/i.test(text)) return 'greeting'
  if (/como|onde|quando|qual|porque|por que|\?/i.test(text)) return 'question'
  if (/caro|não sei|vou pensar|depois|talvez|difícil/i.test(text)) return 'objection'
  if (/quero|fechado|pode ser|aceito|combinado|vamos|ok/i.test(text)) return 'closing'
  
  return 'default'
}

// UX #61: Skeleton for loading state
const SuggestionSkeleton = () => (
  <div className="flex flex-wrap gap-1.5">
    <Skeleton className="h-7 w-32 rounded-lg" />
    <Skeleton className="h-7 w-40 rounded-lg" />
    <Skeleton className="h-7 w-28 rounded-lg" />
  </div>
)

// Bug fix #86: Debounce hook to prevent excessive API calls
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  
  return debouncedValue
}

export function AISuggestions({ messages, leadName, onSelectSuggestion }: AISuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [intent, setIntent] = useState<string | null>(null)
  const [intentLabel, setIntentLabel] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null) // Bug fix #62: Track API errors
  const [lastMessageCount, setLastMessageCount] = useState(0)
  const [isMinimized, setIsMinimized] = useState(false) // UX #63: Collapsible panel
  const [cooldown, setCooldown] = useState(0) // Bug fix #86: Rate limit cooldown
  const abortControllerRef = useRef<AbortController | null>(null)
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Bug fix #86: Debounce message changes to prevent rapid API calls
  const debouncedMessages = useDebounce(messages, 500)

  const fetchSuggestions = useCallback(async () => {
    if (!messages || messages.length === 0) return
    
    // Bug fix #86: Respect cooldown period
    if (cooldown > 0) {
      setError(`Aguarde ${cooldown}s para novas sugestões`)
      return
    }
    
    // Cancel any pending request
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages.slice(-20), leadName }), // Bug fix #64: Limit messages sent
        signal: abortControllerRef.current.signal
      })
      
      if (!response.ok) {
        if (response.status === 429) {
          // Bug fix #86: Set cooldown on rate limit
          // Bug fix #110: Ensure previous interval is cleared before creating new one
          if (cooldownIntervalRef.current) {
            clearInterval(cooldownIntervalRef.current)
            cooldownIntervalRef.current = null
          }
          setCooldown(30)
          cooldownIntervalRef.current = setInterval(() => {
            setCooldown(prev => {
              if (prev <= 1) {
                // Bug fix #110: Clear interval when cooldown reaches 0
                if (cooldownIntervalRef.current) {
                  clearInterval(cooldownIntervalRef.current)
                  cooldownIntervalRef.current = null
                }
                return 0
              }
              return prev - 1
            })
          }, 1000)
          throw new Error('Muitas requisições. Aguarde 30s.')
        }
        throw new Error('Erro ao gerar sugestões')
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setSuggestions(data.suggestions || [])
      setIntent(data.intent)
      setIntentLabel(data.intentLabel)
      setError(null)
    } catch (err: any) {
      // Bug fix #65: Ignore abort errors
      if (err?.name === 'AbortError') return
      
      console.error('Failed to fetch suggestions:', err)
      
      // UX #140: Use local fallback suggestions when API fails
      const lastUserMessage = messages.filter(m => m.role === 'user').pop()
      if (lastUserMessage) {
        const detectedIntent = detectLocalIntent(lastUserMessage.content)
        const fallback = LOCAL_FALLBACK_SUGGESTIONS[detectedIntent]
        setSuggestions(fallback.suggestions)
        setIntent(fallback.intent)
        setIntentLabel(`${fallback.intentLabel} (offline)`)
        setError(null) // Clear error since we have fallback
      } else {
        setError(err.message || 'Erro ao gerar sugestões')
        setSuggestions([])
      }
    } finally {
      setIsLoading(false)
    }
  }, [messages, leadName, cooldown])

  // Bug fix #129: Proper cleanup on unmount - clear all intervals and abort controllers
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current)
        cooldownIntervalRef.current = null
      }
    }
  }, [])
  
  // Bug fix #130: Reset cooldown and suggestions when lead changes (detected via messages reset)
  // Bug fix #133: Fixed dependency - use actual boolean, not expression result
  const messagesEmpty = messages.length === 0
  useEffect(() => {
    if (messagesEmpty) {
      setSuggestions([])
      setIntent(null)
      setIntentLabel(null)
      setError(null)
      setCooldown(0)
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current)
        cooldownIntervalRef.current = null
      }
    }
  }, [messagesEmpty])

  // Bug fix #86: Auto-fetch with debounce when new message from client arrives
  useEffect(() => {
    if (debouncedMessages.length > lastMessageCount) {
      const lastMessage = debouncedMessages[debouncedMessages.length - 1]
      // Only auto-fetch if last message is from client and not in cooldown
      if (lastMessage?.role === 'user' && cooldown === 0) {
        fetchSuggestions()
      }
      setLastMessageCount(debouncedMessages.length)
    }
  }, [debouncedMessages.length, lastMessageCount, fetchSuggestions, cooldown])

  // UX #66: Don't show anything if minimized
  // UX #97: Show minimized state with unread indicator if new suggestions available
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="border-t bg-gradient-to-r from-purple-50/50 to-blue-50/50 p-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-purple-50 transition-colors w-full group"
        aria-label="Mostrar sugestões de resposta da IA"
      >
        <Sparkles className="w-3 h-3 group-hover:animate-pulse" />
        <span>Mostrar sugestões IA</span>
        {suggestions.length > 0 && (
          <span className="px-1.5 py-0.5 bg-purple-500 text-white text-[10px] font-medium rounded-full">
            {suggestions.length}
          </span>
        )}
      </button>
    )
  }

  if (suggestions.length === 0 && !isLoading && !intent && !error) {
    return null
  }

  const IntentIcon = intent ? INTENT_ICONS[intent] || MessageCircle : Sparkles
  const intentColor = intent ? INTENT_COLORS[intent] || INTENT_COLORS.outro : ''

  return (
    <div className="border-t bg-gradient-to-r from-purple-50/50 to-blue-50/50 p-3 animate-in slide-in-from-bottom-2 duration-200">
      {/* Header with minimize */}
      <div className="flex items-center justify-between mb-2">
        {/* Intent Badge */}
        {intent && intentLabel ? (
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${intentColor}`}>
            <IntentIcon className="w-3 h-3" />
            {intentLabel}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3" />
            Sugestões IA
          </div>
        )}
        
        <div className="flex items-center gap-1">
          <button
            onClick={fetchSuggestions}
            disabled={isLoading}
            className="p-1 hover:bg-white/50 rounded transition-colors"
            title="Atualizar sugestões"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {/* UX #63: Minimize button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-white/50 rounded transition-colors"
            title="Minimizar"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Loading State - UX #61: Skeleton loading */}
      {isLoading && suggestions.length === 0 && (
        <SuggestionSkeleton />
      )}

      {/* Bug fix #62 & #86: Error State with cooldown indicator */}
      {error && !isLoading && (
        <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded ${
          cooldown > 0 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'
        }`}>
          {cooldown > 0 ? (
            <Clock className="w-3 h-3 shrink-0 animate-pulse" />
          ) : (
            <WifiOff className="w-3 h-3 shrink-0" />
          )}
          <span className="flex-1">
            {cooldown > 0 ? `Aguarde ${cooldown}s para novas sugestões` : error}
          </span>
          {cooldown === 0 && (
            <button
              onClick={fetchSuggestions}
              className="text-red-700 hover:text-red-800 underline"
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && !isLoading && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelectSuggestion(suggestion)
                // Haptic feedback
                if ('vibrate' in navigator) navigator.vibrate(10)
              }}
              className="text-xs px-2.5 py-1.5 bg-white border rounded-lg hover:bg-purple-50 hover:border-purple-200 hover:shadow-md active:scale-95 transition-all text-left max-w-[200px] truncate shadow-sm"
              title={suggestion}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Empty State with Refresh - UX #103: More prominent button */}
      {!isLoading && suggestions.length === 0 && messages.length > 0 && !error && (
        <button
          onClick={fetchSuggestions}
          className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-2 py-1.5 rounded-lg transition-all active:scale-95"
        >
          <Sparkles className="w-3 h-3" />
          <span>Gerar sugestões de resposta</span>
          <span className="text-[10px] text-purple-400 hidden sm:inline">(IA)</span>
        </button>
      )}
    </div>
  )
}
