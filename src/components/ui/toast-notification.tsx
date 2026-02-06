'use client'

import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react'
import { Check, X, AlertCircle, Info, Bell, ChevronRight } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'reminder'

interface ToastAction {
  label: string
  onClick: () => void
}

interface Toast {
  id: string
  message: string
  type: ToastType
  action?: ToastAction
  duration?: number
  sound?: boolean
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, options?: { action?: ToastAction; duration?: number; sound?: boolean }) => void
  showReminderToast: (leadName: string, note?: string, onClick?: () => void) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio element on mount
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3')
    audioRef.current.volume = 0.3
    return () => {
      audioRef.current = null
    }
  }, [])

  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors
      })
    }
  }, [])

  const showToast = useCallback((
    message: string, 
    type: ToastType = 'success',
    options?: { action?: ToastAction; duration?: number; sound?: boolean }
  ) => {
    const id = Math.random().toString(36).substr(2, 9)
    const duration = options?.duration ?? 2500
    
    setToasts(prev => [...prev, { 
      id, 
      message, 
      type, 
      action: options?.action,
      duration,
      sound: options?.sound
    }])
    
    // Play sound for specific types
    if (options?.sound || type === 'reminder') {
      playSound()
    }

    // Haptic feedback on mobile
    if ('vibrate' in navigator && (type === 'reminder' || options?.sound)) {
      navigator.vibrate([50, 30, 50])
    }
    
    // Auto remove
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [playSound])

  // UX improvement: Special toast for reminders with action
  const showReminderToast = useCallback((
    leadName: string, 
    note?: string,
    onClick?: () => void
  ) => {
    showToast(
      note ? `🔔 ${leadName}: ${note}` : `🔔 Lembrete: ${leadName}`,
      'reminder',
      {
        action: onClick ? { label: 'Ver', onClick } : undefined,
        duration: 5000,
        sound: true
      }
    )
  }, [showToast])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <Check className="w-4 h-4" />
      case 'error': return <X className="w-4 h-4" />
      case 'warning': return <AlertCircle className="w-4 h-4" />
      case 'info': return <Info className="w-4 h-4" />
      case 'reminder': return <Bell className="w-4 h-4" />
    }
  }

  const getStyles = (type: ToastType) => {
    switch (type) {
      case 'success': return 'bg-green-600 text-white'
      case 'error': return 'bg-red-600 text-white'
      case 'warning': return 'bg-amber-500 text-white'
      case 'info': return 'bg-blue-600 text-white'
      case 'reminder': return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
    }
  }

  return (
    <ToastContext.Provider value={{ showToast, showReminderToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto
              flex items-center gap-2 px-4 py-2.5 shadow-lg
              animate-in slide-in-from-bottom-4 fade-in-0 duration-200
              ${toast.action ? 'rounded-lg' : 'rounded-full'}
              ${getStyles(toast.type)}
            `}
          >
            {getIcon(toast.type)}
            <span className="text-sm font-medium">{toast.message}</span>
            
            {/* Action button */}
            {toast.action && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toast.action?.onClick()
                  removeToast(toast.id)
                }}
                className="ml-2 flex items-center gap-1 px-2 py-1 bg-white/20 hover:bg-white/30 rounded transition text-xs font-medium"
              >
                {toast.action.label}
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
            
            {/* Close button */}
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-1 p-1 hover:bg-white/20 rounded-full transition"
              aria-label="Fechar"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
