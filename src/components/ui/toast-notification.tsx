'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { Check, X, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void
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

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
    
    // Auto remove after 2.5s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2500)
  }, [])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <Check className="w-4 h-4" />
      case 'error': return <X className="w-4 h-4" />
      case 'warning': return <AlertCircle className="w-4 h-4" />
      case 'info': return <Info className="w-4 h-4" />
    }
  }

  const getStyles = (type: ToastType) => {
    switch (type) {
      case 'success': return 'bg-green-600 text-white'
      case 'error': return 'bg-red-600 text-white'
      case 'warning': return 'bg-amber-500 text-white'
      case 'info': return 'bg-blue-600 text-white'
    }
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto
              flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg
              animate-in slide-in-from-bottom-4 fade-in-0 duration-200
              ${getStyles(toast.type)}
            `}
            onClick={() => removeToast(toast.id)}
          >
            {getIcon(toast.type)}
            <span className="text-sm font-medium whitespace-nowrap">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
