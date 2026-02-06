'use client'

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

type ConnectionState = 'connected' | 'connecting' | 'disconnected'

interface ConnectionStatusProps {
  state: ConnectionState
  className?: string
  onRetry?: () => void
}

export function ConnectionStatus({ state, className = '', onRetry }: ConnectionStatusProps) {
  const [showConnected, setShowConnected] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  
  // UX #87: Show brief "Connected" message when reconnecting succeeds
  useEffect(() => {
    if (state === 'connected') {
      setShowConnected(true)
      setRetryCount(0) // Reset retry count on successful connection
      const timer = setTimeout(() => setShowConnected(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [state])

  // UX #96: Auto-hide after prolonged disconnect to avoid banner fatigue
  const [isHidden, setIsHidden] = useState(false)
  useEffect(() => {
    if (state === 'disconnected') {
      // After 2 minutes of disconnect, allow hiding
      const timer = setTimeout(() => setIsHidden(false), 120000)
      return () => clearTimeout(timer)
    } else {
      setIsHidden(false)
    }
  }, [state])

  if (state === 'connected' && !showConnected) {
    return null // Don't show anything when connected (less noise)
  }

  if (isHidden) {
    return null
  }

  const config = {
    connected: {
      bg: 'bg-green-500',
      icon: <CheckCircle2 className="w-3 h-3" />,
      text: 'Conectado ✓'
    },
    connecting: {
      bg: 'bg-amber-500',
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      text: 'Reconectando...'
    },
    disconnected: {
      bg: 'bg-red-500',
      icon: <WifiOff className="w-3 h-3" />,
      text: 'Sem conexão'
    }
  }

  const { bg, icon, text } = config[state]

  return (
    <div className={`${bg} text-white text-xs py-1.5 px-3 flex items-center justify-center gap-2 animate-in slide-in-from-top-2 duration-200 ${className}`}>
      {icon}
      <span className="font-medium">{text}</span>
      {state === 'disconnected' && (
        <>
          {onRetry && (
            <button 
              onClick={() => {
                setRetryCount(prev => prev + 1)
                onRetry()
              }}
              className="ml-1 p-0.5 hover:bg-white/20 rounded transition-colors flex items-center gap-1"
              title="Tentar reconectar"
            >
              <RefreshCw className="w-3 h-3" />
              {retryCount > 0 && <span className="text-[10px] opacity-70">({retryCount})</span>}
            </button>
          )}
          {/* UX #96: Link to reconnect page after multiple retries */}
          {retryCount >= 2 && (
            <Link 
              href="/connect" 
              className="ml-1 px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[10px] font-medium transition-colors"
            >
              Reconectar
            </Link>
          )}
        </>
      )}
    </div>
  )
}

// Mini version for header with tooltip
export function ConnectionDot({ isConnected, lastConnected }: { isConnected: boolean, lastConnected?: Date }) {
  const [showTooltip, setShowTooltip] = useState(false)
  
  // UX #88: Calculate time since connected
  const getTimeSince = () => {
    if (!lastConnected) return null
    const diffMs = Date.now() - lastConnected.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    
    if (diffMins < 1) return 'agora'
    if (diffMins < 60) return `${diffMins}min`
    if (diffHours < 24) return `${diffHours}h`
    return `${Math.floor(diffHours / 24)}d`
  }
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div 
        className={`w-2.5 h-2.5 rounded-full transition-all ${
          isConnected 
            ? 'bg-green-500 shadow-sm shadow-green-500/50' 
            : 'bg-red-500 animate-pulse shadow-sm shadow-red-500/50'
        }`}
      />
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          <div className={`rounded-lg px-2 py-1 text-[10px] font-medium whitespace-nowrap shadow-lg ${
            isConnected 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {isConnected ? (
              <>
                <span className="flex items-center gap-1">
                  <Wifi className="w-2.5 h-2.5" />
                  Conectado
                  {lastConnected && <span className="opacity-70">há {getTimeSince()}</span>}
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                Desconectado
              </span>
            )}
          </div>
          {/* Arrow */}
          <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
        </div>
      )}
    </div>
  )
}
