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
