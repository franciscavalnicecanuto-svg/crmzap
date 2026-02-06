'use client'

/**
 * Typing indicator animation
 * Shows animated dots to indicate activity
 * UX improvement: Better visual feedback during loading
 */
export function TypingIndicator({ 
  className = '',
  dotClassName = 'bg-green-500'
}: {
  className?: string
  dotClassName?: string
}) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span 
        className={`w-2 h-2 rounded-full ${dotClassName} animate-bounce`} 
        style={{ animationDelay: '0ms' }}
      />
      <span 
        className={`w-2 h-2 rounded-full ${dotClassName} animate-bounce`} 
        style={{ animationDelay: '150ms' }}
      />
      <span 
        className={`w-2 h-2 rounded-full ${dotClassName} animate-bounce`} 
        style={{ animationDelay: '300ms' }}
      />
    </div>
  )
}

/**
 * Message skeleton loader
 * More realistic loading animation for messages
 */
export function MessageLoader({ 
  fromMe = false,
  animated = true
}: {
  fromMe?: boolean
  animated?: boolean
}) {
  return (
    <div className={`flex ${fromMe ? 'justify-end' : 'justify-start'} ${animated ? 'animate-in fade-in-0 duration-300' : ''}`}>
      <div className={`flex items-end gap-2 max-w-[80%] ${fromMe ? 'flex-row-reverse' : ''}`}>
        {!fromMe && (
          <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
        )}
        <div className={`rounded-lg px-3 py-2 ${fromMe ? 'bg-green-100' : 'bg-muted'} ${animated ? 'animate-pulse' : ''}`}>
          <div className="space-y-1.5">
            <div className={`h-3 ${fromMe ? 'w-24' : 'w-36'} rounded bg-current opacity-20`} />
            <div className={`h-3 ${fromMe ? 'w-16' : 'w-28'} rounded bg-current opacity-15`} />
          </div>
          <div className="h-2 w-10 rounded bg-current opacity-10 mt-2" />
        </div>
      </div>
    </div>
  )
}

/**
 * Sending indicator - shows message is being sent
 */
export function SendingIndicator({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs text-green-600 ${className}`}>
      <div className="relative w-4 h-4">
        <div className="absolute inset-0 rounded-full border-2 border-green-200" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-green-500 animate-spin" />
      </div>
      <span className="animate-pulse">Enviando...</span>
    </div>
  )
}

/**
 * Connection status indicator
 */
export function ConnectionPulse({ 
  connected = true,
  size = 'sm'
}: {
  connected?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  }

  return (
    <div className="relative">
      <span 
        className={`block ${sizeClasses[size]} rounded-full ${
          connected ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      {connected && (
        <span 
          className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-green-500 animate-ping opacity-75`}
        />
      )}
    </div>
  )
}

/**
 * Retry banner for failed messages
 */
export function RetryBanner({
  message,
  onRetry,
  onDismiss,
}: {
  message: string
  onRetry: () => void
  onDismiss: () => void
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-b border-red-200 text-xs animate-in slide-in-from-top-2 duration-200">
      <span className="text-red-600 flex-1">{message}</span>
      <button 
        onClick={onRetry}
        className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition"
      >
        Tentar novamente
      </button>
      <button 
        onClick={onDismiss}
        className="text-red-400 hover:text-red-600 transition"
      >
        ✕
      </button>
    </div>
  )
}

/**
 * UX #310: Contact typing indicator
 * Shows when a contact is currently typing a message
 */
export function ContactTypingIndicator({
  contactName,
  isTyping,
}: {
  contactName: string
  isTyping: boolean
}) {
  if (!isTyping) return null

  return (
    <div className="flex justify-start animate-in slide-in-from-bottom-2 fade-in-0 duration-200 mb-2">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/70 rounded-lg max-w-[200px]">
        <div className="typing-indicator flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
        </div>
        <span className="text-xs text-muted-foreground truncate">
          {contactName.split(' ')[0]} está digitando...
        </span>
      </div>
    </div>
  )
}

/**
 * UX #311: Message delivery status icons
 * Shows sent → delivered → read status
 */
export function MessageStatus({
  status,
  className = '',
}: {
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  className?: string
}) {
  const iconClass = `inline-block ${className}`
  
  switch (status) {
    case 'sending':
      return (
        <span className={`${iconClass} text-green-100/70`} title="Enviando...">
          <svg className="w-3.5 h-3.5 animate-pulse" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5" />
          </svg>
        </span>
      )
    
    case 'sent':
      return (
        <span className={`${iconClass} text-green-100`} title="Enviado">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12.354 5.354a.5.5 0 0 0-.708-.708L6.5 9.793 4.354 7.646a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l5.5-5.5z"/>
          </svg>
        </span>
      )
    
    case 'delivered':
      return (
        <span className={`${iconClass} text-green-100`} title="Entregue">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12.354 5.354a.5.5 0 0 0-.708-.708L6.5 9.793 4.354 7.646a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l5.5-5.5z"/>
            <path d="M10.354 5.354a.5.5 0 0 0-.708-.708L4.5 9.793 2.354 7.646a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l5.5-5.5z" opacity="0.7"/>
          </svg>
        </span>
      )
    
    case 'read':
      return (
        <span className={`${iconClass} text-blue-300`} title="Lido">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12.354 5.354a.5.5 0 0 0-.708-.708L6.5 9.793 4.354 7.646a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l5.5-5.5z"/>
            <path d="M10.354 5.354a.5.5 0 0 0-.708-.708L4.5 9.793 2.354 7.646a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l5.5-5.5z"/>
          </svg>
        </span>
      )
    
    case 'failed':
      return (
        <span className={`${iconClass} text-red-300`} title="Falha no envio">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
          </svg>
        </span>
      )
    
    default:
      return null
  }
}

/**
 * UX #312: Message reaction indicator
 * Shows emoji reactions on messages
 */
export function MessageReactions({
  reactions,
  onAddReaction,
}: {
  reactions?: { emoji: string; count: number }[]
  onAddReaction?: (emoji: string) => void
}) {
  if (!reactions || reactions.length === 0) return null

  return (
    <div className="flex items-center gap-1 mt-1 -mb-1">
      {reactions.map((reaction, idx) => (
        <button
          key={idx}
          onClick={() => onAddReaction?.(reaction.emoji)}
          className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded-full text-[10px] transition-all active:scale-95"
        >
          <span>{reaction.emoji}</span>
          {reaction.count > 1 && <span className="opacity-70">{reaction.count}</span>}
        </button>
      ))}
    </div>
  )
}

/**
 * UX #313: Voice message indicator
 * Shows audio waveform visualization placeholder
 */
export function VoiceMessageIndicator({
  duration,
  isPlaying,
  onPlay,
}: {
  duration: string
  isPlaying?: boolean
  onPlay?: () => void
}) {
  return (
    <div 
      className="flex items-center gap-2 min-w-[150px] cursor-pointer group"
      onClick={onPlay}
    >
      <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
        {isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
            <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 16 16">
            <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
          </svg>
        )}
      </button>
      <div className="flex-1 flex items-center gap-0.5">
        {/* Waveform visualization */}
        {[...Array(12)].map((_, i) => (
          <div 
            key={i}
            className={`w-1 rounded-full transition-all ${
              isPlaying && i <= 6 ? 'bg-white' : 'bg-white/50'
            }`}
            style={{ 
              height: `${Math.random() * 12 + 6}px`,
              animationDelay: `${i * 50}ms`
            }}
          />
        ))}
      </div>
      <span className="text-xs opacity-70">{duration}</span>
    </div>
  )
}
